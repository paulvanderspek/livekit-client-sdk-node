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

import { livekit as livekitTrack } from './proto/track';
import { livekit as livekitFfi } from './proto/ffi';
import { FfiHandle, ffiClient } from './ffiClient';
import { AudioSource } from './audioSource';
import { VideoSource } from './videoSource';

type TrackInfo = livekitTrack.proto.TrackInfo;
type OwnedTrack = livekitTrack.proto.OwnedTrack;
type TrackKind = livekitTrack.proto.TrackKind;
type StreamState = livekitTrack.proto.StreamState;

export class Track {
  public info: TrackInfo;
  public ffiHandle: FfiHandle;

  constructor(ownedInfo: OwnedTrack) {
    this.info = ownedInfo.info;
    this.ffiHandle = new FfiHandle(ownedInfo.handle.id);
  }

  get sid(): string {
    return this.info.sid;
  }

  get name(): string {
    return this.info.name;
  }

  get kind(): TrackKind {
    return this.info.kind;
  }

  get streamState(): StreamState {
    return this.info.stream_state;
  }

  get muted(): boolean {
    return this.info.muted;
  }

  updateInfo(info: TrackInfo) {
    this.info = info;
  }
}

export class LocalAudioTrack extends Track {
  constructor(info: OwnedTrack) {
    super(info);
  }

  static createAudioTrack(name: string, source: AudioSource): LocalAudioTrack {
    const req = new livekitFfi.proto.FfiRequest({ create_audio_track: new livekitTrack.proto.CreateAudioTrackRequest(
      { name, source_handle: source.ffiHandle.handle }
    )});
    const resp = ffiClient.request(req);
    return new LocalAudioTrack(resp.create_audio_track.track);
  }
}

export class LocalVideoTrack extends Track {
  constructor(info: OwnedTrack) {
    super(info);
  }

  static createVideoTrack(name: string, source: VideoSource): LocalVideoTrack {
    const req = new livekitFfi.proto.FfiRequest({ create_video_track: new livekitTrack.proto.CreateVideoTrackRequest({
      name,
      source_handle: source.ffiHandle.handle,
    })});

    const resp = ffiClient.request(req);
    return new LocalVideoTrack(resp.create_video_track.track);
  }
}
 
export class RemoteAudioTrack extends Track {
  constructor(info: OwnedTrack) {
    super(info);
  }
}

export class RemoteVideoTrack extends Track {
  constructor(info: OwnedTrack) {
    super(info);
  }
}
