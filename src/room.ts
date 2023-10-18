// Copyright 2023 LiveKit, Inc.
// Copyright 2023 Paul Vanderspek
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { EventEmitter } from 'events';
import { FfiHandle, ffiClient, ffiLib } from './ffiClient'
import { AsyncQueue, BroadcastQueue, nativePointerAndLengthToUInt8Array } from './utils';
import { livekit } from './proto/ffi'
import { livekit as livekitRoom } from './proto/room'
import { livekit as livekitParticipant } from './proto/participant'
import { livekit as livekitTrack } from './proto/track'
import { livekit as livekitE2EE } from './proto/e2ee'
import { E2EEOptions } from './e2ee'
import { LocalParticipant, Participant, RemoteParticipant } from './participant';
import { RemoteTrackPublication } from './trackPublication';
import { RemoteAudioTrack, RemoteVideoTrack } from './track';

interface RoomOptions {
  auto_subscribe: boolean;
  dynacast: boolean;
  e2ee?: E2EEOptions;
}

export class ConnectError extends Error {
}

export class Room {
  private eventEmitter = new EventEmitter();
  private ffiHandle: FfiHandle | null = null;
  private ffiQueue: AsyncQueue<livekit.proto.FfiEvent>;
  private roomQueue: BroadcastQueue<livekit.proto.FfiEvent>;
  private closeFuture: Promise<void> | null = null;
  private closeFutureResolve: ((value?: void | PromiseLike<void>) => void) | null = null;
  // private e2eeManager: E2EEManager | null = null;
  private info: livekitRoom.proto.RoomInfo | null = null;
  private connectionState: livekitRoom.proto.ConnectionState = livekitRoom.proto.ConnectionState.CONN_DISCONNECTED;
  private task: Promise<void> | null = null;

  participants: {[key: string]: RemoteParticipant} = {};
  localParticipant: LocalParticipant | null = null;
  
  constructor() {
    // TODO - check that we're on a 64bit architecture, and fail otherwise, can we do that at build time?
    this.ffiQueue = ffiClient.queue.subscribe();
    this.roomQueue = new BroadcastQueue<livekit.proto.FfiEvent>();
    this.info = new livekitRoom.proto.RoomInfo();
    this.connectionState = livekitRoom.proto.ConnectionState.CONN_DISCONNECTED;
  }

  async connect(url: string, token: string, options: RoomOptions = {auto_subscribe: false, dynacast: false}): Promise<void> {
    const req = new livekit.proto.FfiRequest({
      connect: new livekitRoom.proto.ConnectRequest({
        url, token, options: new livekitRoom.proto.RoomOptions({
          auto_subscribe: options.auto_subscribe,
          dynacast: options.dynacast,
          e2ee: new livekitE2EE.proto.E2eeOptions({
            encryption_type: options.e2ee?.encryption_type,
            key_provider_options: new livekitE2EE.proto.KeyProviderOptions(options.e2ee?.key_provider_options)
          }),
        }
      )})});

    const queue = ffiClient.queue.subscribe()
    const resp = ffiClient.request(req);
    const cb = await queue.waitFor((e) => e.connect?.async_id === resp.connect.async_id);
    // Checking non-null/non-empty string on purpose.
    if (cb.connect.error) {
      throw new ConnectError(cb.connect.error);
    }

    this.closeFuture = new Promise((resolve) => {
      this.closeFutureResolve = resolve;
    });

    this.ffiHandle = new FfiHandle(cb.connect.room.handle.id);

    // this.e2eeManager = new E2EEManager(this._ffi_handle.handle, options.e2ee);

    this.info = cb.connect.room.info;
    this.connectionState = livekitRoom.proto.ConnectionState.CONN_CONNECTED;
    this.localParticipant = new LocalParticipant(this.roomQueue, cb.connect.local_participant);

    for (const pt of cb.connect.participants) {
      const rp = this.createRemoteParticipant(pt.participant);

      // add the initial remote participant tracks
      for (const owned_publication_info of pt.publications) {
        const publication = new RemoteTrackPublication(owned_publication_info);
        rp.tracks[publication.sid] = publication;
      }
    }
    queue.taskDone()
    // Start listening to room events
    this.task = this.listenTask()
  }


    async disconnect(): Promise<void> {
      if (!this.isconnected()) {
        return;
      }

      const req = new livekit.proto.FfiRequest();
      req.disconnect.room_handle = this.ffiHandle!.handle;

      const queue = ffiClient.queue.subscribe();
      try {
        const resp = ffiClient.request(req);
        await queue.waitFor((e) => e.disconnect.async_id === resp.disconnect.async_id);
        queue.taskDone()
      } finally {
        ffiClient.queue.unsubscribe(queue);
      }

      if (this.closeFutureResolve != null) {
        this.closeFutureResolve!()
      }

      await this.task;
    }
    
    isconnected(): boolean {
      return this.ffiHandle != null && this.connectionState !== livekitRoom.proto.ConnectionState.CONN_DISCONNECTED;
    }

    get sid(): string {
      return this.info?.sid ?? '';
    }

    get name(): string {
      return this.info?.name ?? '';
    }

    get metadata(): string {
      return this.info?.metadata ?? '';
    }

    // get e2ee_manager(): E2EEManager | null {
    //   return this.e2eeManager;
    // }

    private async listenTask(): Promise<void> {
      // listen to incoming room events
      for (;;) {
        const waitEventFuture = this.ffiQueue.get();
        const result = await Promise.race([
          waitEventFuture,
          this.closeFuture
        ]);

        if (result instanceof livekit.proto.FfiEvent) {
          const event = result as livekit.proto.FfiEvent;
          if (event.room_event?.room_handle === this.ffiHandle?.handle) {
            this.handleRoomEvent(event.room_event);
          }

          this.roomQueue.put(event);
          // wait for the subscribers to process the event
          // before processing the next one
          await this.roomQueue.join();
        } else {
          break;
        }
      }
    }

    private async handleRoomEvent(event: livekitRoom.proto.RoomEvent): Promise<void> {
          if (event.participant_connected != null) {
            const rparticipant = this.createRemoteParticipant(event.participant_connected.info);
            this.eventEmitter.emit('participant_connected', rparticipant);  
          } else if (event.participant_disconnected != null) {
            const sid = event.participant_disconnected.participant_sid;
            const rparticipant = this.participants[sid];
            delete this.participants[sid];
            this.eventEmitter.emit('participant_disconnected', rparticipant);
          } else if (event.local_track_published != null) {
            const sid = event.local_track_published.track_sid;
            const lpublication = this.localParticipant!.tracks[sid];
            const track = lpublication.track;
            this.eventEmitter.emit('local_track_published', lpublication, track);
          } else if (event.local_track_unpublished != null) {
            const sid = event.local_track_unpublished.publication_sid;
            const lpublication = this.localParticipant!.tracks[sid];
            this.eventEmitter.emit('local_track_unpublished', lpublication);
          } else if (event.track_published != null) {
            const rparticipant = this.participants[event.track_published.participant_sid];
            const rpublication = new RemoteTrackPublication(event.track_published.publication);
            rparticipant.tracks[rpublication.sid] = rpublication;
            this.eventEmitter.emit('track_published', rpublication, rparticipant);
          } else if (event.track_unpublished != null) {
            const rparticipant = this.participants[event.track_unpublished.participant_sid];
            const rpublication = rparticipant.tracks[event.track_unpublished.publication_sid];
            delete rparticipant.tracks[event.track_unpublished.publication_sid];
            this.eventEmitter.emit('track_unpublished', rpublication, rparticipant);
          } else if (event.track_subscribed != null) {
            const owned_track_info = event.track_subscribed.track;
            const track_info = owned_track_info.info;
            const rparticipant = this.participants[event.track_subscribed.participant_sid];
            const rpublication = rparticipant.tracks[track_info.sid] as RemoteTrackPublication;
            rpublication.subscribed = true;
            if (track_info.kind == livekitTrack.proto.TrackKind.KIND_VIDEO) {
              const remote_video_track = new RemoteVideoTrack(owned_track_info);
              rpublication.track = remote_video_track;
              this.eventEmitter.emit('track_subscribed', remote_video_track, rpublication, rparticipant);
            } else if (track_info.kind == livekitTrack.proto.TrackKind.KIND_AUDIO) {
              const remote_audio_track = new RemoteAudioTrack(owned_track_info);
              rpublication.track = remote_audio_track;
              this.eventEmitter.emit('track_subscribed', remote_audio_track, rpublication, rparticipant);
            }
          } else if (event.track_unsubscribed != null) {
            const sid = event.track_unsubscribed.participant_sid;
            const rparticipant = this.participants[sid];
            const rpublication = rparticipant.tracks[event.track_unsubscribed.track_sid] as RemoteTrackPublication;
            const track = rpublication.track;
            rpublication.track = null;
            rpublication.subscribed = false;
            this.eventEmitter.emit('track_unsubscribed', track, rpublication, rparticipant);
          } else if (event.track_subscription_failed != null) {
            const sid = event.track_subscription_failed.participant_sid;
            const rparticipant = this.participants[sid];
            const error = event.track_subscription_failed.error;
            this.eventEmitter.emit('track_subscription_failed', rparticipant, event.track_subscription_failed.track_sid, error);
          } else if (event.track_muted != null) {
            const sid = event.track_muted.participant_sid;
            const participant = this.retrieveParticipant(sid);
            const publication = participant.tracks[event.track_muted.track_sid];
            publication.info.muted = true;
            if (publication.track) {
              publication.track.info.muted = true;
            }
            this.eventEmitter.emit('track_muted', participant, publication);
          } else if (event.track_unmuted != null) {
            const sid = event.track_unmuted.participant_sid;
            const participant = this.retrieveParticipant(sid);
            const publication = participant.tracks[event.track_unmuted.track_sid];
            publication.info.muted = false;
            if (publication.track) {
              publication.track.info.muted = false;
            }
            this.eventEmitter.emit('track_unmuted', participant, publication);
          } else if (event.active_speakers_changed != null) {
            const speakers: Participant[] = [];
            for (const sid of event.active_speakers_changed.participant_sids) {
              speakers.push(this.retrieveParticipant(sid));
            }
            this.eventEmitter.emit('active_speakers_changed', speakers);
          } else if (event.connection_quality_changed != null) {
            const sid = event.connection_quality_changed.participant_sid;
            const p = this.retrieveParticipant(sid);
            this.eventEmitter.emit('connection_quality_changed', p, event.connection_quality_changed.quality);
          } else if (event.data_received != null) {
            const rparticipant = this.participants[event.data_received.participant_sid];
            const owned_buffer_info = event.data_received.data;
            const buffer_info = owned_buffer_info.data;
            const buffer = nativePointerAndLengthToUInt8Array(buffer_info.data_ptr, buffer_info.data_len)
            const resp = livekit.proto.FfiResponse.deserialize(buffer);
            // TODO(paul)
            // Seems like we've copied the data at this point, which is bad but it is what it is.
            ffiLib.livekit_ffi_drop_handle(owned_buffer_info.handle.id);
            this.eventEmitter.emit('data_received', resp, event.data_received.kind, rparticipant);
          } else if (event.e2ee_state_changed != null) {
            const sid = event.e2ee_state_changed.participant_sid;
            const e2ee_state = event.e2ee_state_changed.state;
            this.eventEmitter.emit('e2ee_state_changed', this.retrieveParticipant(sid), e2ee_state);
          } else if (event.connection_state_changed != null) {
            const connection_state = event.connection_state_changed.state;
            this.connectionState = connection_state;
            this.eventEmitter.emit('connection_state_changed', connection_state);
          } else if (event.disconnected) {
            this.eventEmitter.emit('disconnected');
          } else if (event.reconnecting) {
            this.eventEmitter.emit('reconnecting');
          } else if (event.reconnected) {
            this.eventEmitter.emit('reconnected');
          }
      }

    /** Retrieve a participant by sid, returns the LocalParticipant
     * if sid matches */
    private retrieveParticipant(sid: string): Participant {
      if (sid === this.localParticipant?.sid) {
        return this.localParticipant;
      } else {
        return this.participants[sid];
      }
    }

    private createRemoteParticipant(ownedInfo: livekitParticipant.proto.OwnedParticipant): RemoteParticipant {
      if (ownedInfo.info.sid in this.participants) {
        throw new Error('participant already exists');
      }
      const participant = new RemoteParticipant(ownedInfo);
      this.participants[participant.sid] = participant;
      return participant;
    }

    get events(): EventEmitter {
      return this.eventEmitter;
    }
}
