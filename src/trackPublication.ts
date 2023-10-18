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
import { livekit as livekitE2EE } from './proto/e2ee';
import { livekit as livekitFfi } from './proto/ffi';
import { livekit as livekitRoom } from './proto/room'
import { FfiHandle, ffiClient } from './ffiClient';
import { Track } from './track';

type TrackKind = livekitTrack.proto.TrackKind;
type TrackSource = livekitTrack.proto.TrackSource;
type TrackPublicationInfo = livekitTrack.proto.TrackPublicationInfo;
type OwnedTrackPublication = livekitTrack.proto.OwnedTrackPublication;
type EncryptionType = livekitE2EE.proto.EncryptionType;

export class TrackPublication {
  protected ffiHandle: FfiHandle;
  public info: TrackPublicationInfo;
  public track: Track | null = null;

  constructor(ownedInfo: OwnedTrackPublication) {
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

  get source(): TrackSource {
    return this.info.source;
  }

  get simulcasted(): boolean {
    return this.info.simulcasted;
  }

  get width(): number {
    return this.info.width;
  }

  get height(): number {
    return this.info.height;
  }

  get mimeType(): string {
    return this.info.mime_type;
  }

  get muted(): boolean {
    return this.info.muted;
  }

  get encryptionType(): EncryptionType {
    return this.info.encryption_type;
  }
}

export class LocalTrackPublication extends TrackPublication {
  constructor(ownedInfo: OwnedTrackPublication) {
    super(ownedInfo);
  }
}

export class RemoteTrackPublication extends TrackPublication {
  public subscribed: boolean = false;

  constructor(ownedInfo: OwnedTrackPublication) {
    super(ownedInfo);
  }

  setSubscribed(subscribed: boolean): void {
    const req = new livekitFfi.proto.FfiRequest({ set_subscribed: new livekitRoom.proto.SetSubscribedRequest({
      subscribe: subscribed,
      publication_handle: this.ffiHandle.handle,
    })});
    ffiClient.request(req);
  }
}
