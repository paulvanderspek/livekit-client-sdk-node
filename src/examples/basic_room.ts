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

import { Room } from "../room";
import { RemoteParticipant, Participant } from "../participant";
import { RemoteTrackPublication, LocalTrackPublication } from "../trackPublication";
import { LocalAudioTrack, LocalVideoTrack } from "../track";
import { Track } from "../track";
import { livekit as livekitRoom } from "../proto/room";
import 'dotenv/config'

const URL = process.env.LIVEKIT_URL || ''
const TOKEN = process.env.LIVEKIT_TOKEN || ''

async function main(room: Room) {
  room.events.on('participant_connected', (participant: RemoteParticipant) => {
    console.info(`participant connected: ${participant.sid} ${participant.identity}`);
  });

  room.events.on('participant_disconnected', (participant: RemoteParticipant) => {
    console.info(`participant disconnected: ${participant.sid} ${participant.identity}`);
  });

  room.events.on('local_track_published', (publication: LocalTrackPublication, track : LocalAudioTrack | LocalVideoTrack) => {
    console.info(`local track published: ${publication.sid} ${track.kind} ${track.name}`);
  });

  room.events.on('active_speakers_changed', (speakers: Participant[]) => {
    console.info(`active speakers changed: ${speakers}`);
  });

  room.events.on('local_track_unpublished', (publication: LocalTrackPublication) => {
    console.info(`local track unpublished: ${publication.sid}`);
  });

  room.events.on('track_published', (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.info(`track published: ${publication.sid} from participant ${participant.sid} (${participant.identity})`);
  });

  room.events.on('track_unpublished', (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.info(`track unpublished: ${publication.sid}`);
  });

  room.events.on('track_subscribed', (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.info(`track subscribed: ${publication.sid}`);
    // Assume we have VideoStream and AudioStream classes as in the original code
  });

  room.events.on('track_unsubscribed', (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.info(`track unsubscribed: ${publication.sid}`);
  });

  room.events.on('track_muted', (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.info(`track muted: ${publication.sid}`);
  });

  room.events.on('track_unmuted', (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    console.info(`track unmuted: ${publication.sid}`);
  });

  room.events.on('data_received', (data: Buffer, kind: livekitRoom.proto.DataPacketKind, participant: Participant) => {
    console.info(`received data from ${participant.identity}: ${data}`);
  });

  room.events.on('connection_quality_changed', (participant: Participant, quality: livekitRoom.proto.ConnectionQuality) => {
    console.info(`connection quality changed for ${participant.identity}`);
  });

  room.events.on('track_subscription_failed', (participant: RemoteParticipant, track_sid: string, error: string) => {
    console.info(`track subscription failed: ${participant.identity} ${error}`);
  });

  room.events.on('connection_state_changed', (state: livekitRoom.proto.ConnectionState) => {
    console.info(`connection state changed: ${state}`);
  });

  room.events.on('connected', () => {
    console.info('connected');
  });

  room.events.on('disconnected', () => {
    console.info('disconnected');
  });

  room.events.on('reconnecting', () => {
    console.info('reconnecting');
  });

  room.events.on('reconnected', () => {
    console.info('reconnected');
  });

  console.log('connecting to: ' + URL + ' token: ' + TOKEN) 
  await room.connect(URL, TOKEN);
  console.log(`connected to room ${room.name}`);
  console.log(`participants: ${room.participants}`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  await room.localParticipant!.publishData('hello world');
}

async function run() {
  const room = new Room();
  try {
    await main(room);
  } finally {
    // Cleanup or further handling
  }
}

console.log('run');
(async () => {
  await run()
})()

// Hack to let the process stick around, otherwise this will fail.
await new Promise(resolve => setTimeout(resolve, 1000000));
