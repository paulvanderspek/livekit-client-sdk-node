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

import { FfiHandle, ffiClient } from './ffiClient';
import { BroadcastQueue } from './utils';
import { livekit as livekitFfi } from './proto/ffi';
import { livekit as livekitParticipant } from './proto/participant'
import { livekit as livekitRoom } from './proto/room'
import { LocalAudioTrack, LocalVideoTrack, Track } from './track'
import {
  LocalTrackPublication,
  TrackPublication,
} from './trackPublication';

type TrackPublishOptions = livekitRoom.proto.TrackPublishOptions;

export class PublishTrackError extends Error {
}

export class UnpublishTrackError extends Error {
}

export class PublishDataError extends Error {
}

export class Participant {
  private info: livekitParticipant.proto.ParticipantInfo;
  protected ffiHandle: FfiHandle;
  tracks: { [key: string]: TrackPublication } =  {}
  
  constructor(ownedInfo: livekitParticipant.proto.OwnedParticipant) {
    this.info = ownedInfo.info;
    this.ffiHandle = new FfiHandle(ownedInfo.handle.id);
  }

  get sid(): string {
    return this.info.sid;
  }

  get name(): string {
    return this.info.name;
  }

  get identity(): string {
    return this.info.identity;
  }

  get metadata(): string {
    return this.info.metadata;
  }
}

export class LocalParticipant extends Participant {
  roomQueue: BroadcastQueue<livekitFfi.proto.FfiEvent>;

  constructor(
    roomQueue: BroadcastQueue<livekitFfi.proto.FfiEvent>,
    owned_info: livekitParticipant.proto.OwnedParticipant
  ) {
    super(owned_info);
    this.roomQueue = roomQueue;
  }

  async publishData(
    payload: string | Uint8Array,
    kind: livekitRoom.proto.DataPacketKind = livekitRoom.proto.DataPacketKind.KIND_RELIABLE,
    destination_sids: (string | RemoteParticipant)[] | null = null
  ): Promise<void> {
    if (typeof payload === 'string') {
      payload = new TextEncoder().encode(payload);
    }

    const req = new livekitFfi.proto.FfiRequest({
      publish_data: new livekitRoom.proto.PublishDataRequest({
        local_participant_handle: this.ffiHandle.handle,
        data_ptr: Buffer.from(payload).address(),
        data_len: payload.length,
        kind: kind,
    })})

    if (destination_sids != null) {
      const sids = destination_sids.map((p) =>
        p instanceof RemoteParticipant ? p.sid : p
      );
      req.publish_data.destination_sids = sids;
    }

    const queue = this.roomQueue.subscribe();
    try {
      const resp = ffiClient.request(req);
      const cb = await queue.waitFor(
        (e: livekitFfi.proto.FfiEvent) => e.publish_data?.async_id === resp.publish_data.async_id
      );
      queue.taskDone();
      // We need to ignore null, undefined, and empty string
      if (cb.publish_data.error) {
        throw new PublishDataError(cb.publish_data.error);
      }
    } finally {
      this.roomQueue.unsubscribe(queue);
    }
  }

  async publishTrack(
    track: Track,
    options: TrackPublishOptions
  ): Promise<TrackPublication> {
    if (!(track instanceof LocalAudioTrack) && !(track instanceof LocalVideoTrack)) {
      throw new Error('cannot publish a remote track');
    }

    const req = new livekitFfi.proto.FfiRequest({publish_track: new livekitRoom.proto.PublishTrackRequest(
      {
        track_handle: track.ffiHandle.handle,
        local_participant_handle: this.ffiHandle.handle,
        options: options,
      }
    )});

    const queue = this.roomQueue.subscribe();
    try {
      const resp = ffiClient.request(req);
      const cb = await queue.waitFor(
        (e: livekitFfi.proto.FfiEvent) => e.publish_track?.async_id === resp.publish_track.async_id
      );

      if (cb.publish_track.error) {
        throw new PublishTrackError(cb.publish_track.error);
      }

      const track_publication = new LocalTrackPublication(cb.publish_track.publication);
      track_publication.track = track;
      this.tracks[track_publication.sid] = track_publication;

      queue.taskDone();
      return track_publication;
    } finally {
      this.roomQueue.unsubscribe(queue);
    }
  }

  async unpublishTrack(track_sid: string): Promise<void> {
    const req = new livekitFfi.proto.FfiRequest({unpublish_track: new livekitRoom.proto.UnpublishTrackRequest({
      local_participant_handle: this.ffiHandle.handle,
      track_sid: track_sid,
    })})

    const queue = this.roomQueue.subscribe();
    try {
      const resp = ffiClient.request(req);
      const cb = await queue.waitFor(
        (e: livekitFfi.proto.FfiEvent) => e.unpublish_track?.async_id === resp.unpublish_track.async_id
      );

      if (cb.unpublish_track.error) {
        throw new UnpublishTrackError(cb.unpublish_track.error);
      }

      const publication = this.tracks[track_sid];
      delete this.tracks[track_sid];
      publication.track = null;
      queue.taskDone();
    } finally {
      this.roomQueue.unsubscribe(queue);
    }
  }
}

export class RemoteParticipant extends Participant {
}
