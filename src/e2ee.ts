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

import { livekit } from './proto/e2ee';

const DEFAULT_RATCHET_SALT = Buffer.from("LKFrameEncryptionKey");
const DEFAULT_MAGIC_BYTES = Buffer.from("LK-ROCKS");
const DEFAULT_RATCHET_WINDOW_SIZE = 16;

export interface KeyProviderOptions {
  shared_key?: Buffer;
  ratchet_salt: Buffer;
  uncrypted_magic_bytes: Buffer;
  ratchet_window_size: number;
}

export interface E2EEOptions {
  key_provider_options: KeyProviderOptions;
  encryption_type: livekit.proto.EncryptionType;
}

export class KeyProviderOptionsImpl implements KeyProviderOptions {
  shared_key?: Buffer;
  ratchet_salt: Buffer;
  uncrypted_magic_bytes: Buffer;
  ratchet_window_size: number;

  constructor(
    shared_key?: Buffer,
    ratchet_salt: Buffer = DEFAULT_RATCHET_SALT,
    uncrypted_magic_bytes: Buffer = DEFAULT_MAGIC_BYTES,
    ratchet_window_size: number = DEFAULT_RATCHET_WINDOW_SIZE
  ) {
    this.shared_key = shared_key;
    this.ratchet_salt = ratchet_salt;
    this.uncrypted_magic_bytes = uncrypted_magic_bytes;
    this.ratchet_window_size = ratchet_window_size;
  }
}

export class E2EEOptionsImpl implements E2EEOptions {
  key_provider_options: KeyProviderOptions;
  encryption_type: livekit.proto.EncryptionType;

  constructor(
    key_provider_options: KeyProviderOptions = new KeyProviderOptionsImpl(),
    encryption_type: livekit.proto.EncryptionType = livekit.proto.EncryptionType.GCM
  ) {
    this.key_provider_options = key_provider_options;
    this.encryption_type = encryption_type;
  }
}
