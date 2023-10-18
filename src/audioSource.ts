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
import { livekit as livekitFfi } from './proto/ffi';
import { livekit as livekitAudio } from './proto/audio_frame';
import { AudioFrame } from './audioFrame';

export class AudioSource {
  private info: livekitAudio.proto.OwnedAudioSource;
  ffiHandle: FfiHandle;

  constructor(sampleRate: number, numChannels: number) {
    const req = new livekitFfi.proto.FfiRequest({ new_audio_source: new livekitAudio.proto.NewAudioSourceRequest(
      { sample_rate: sampleRate, num_channels: numChannels, type: livekitAudio.proto.AudioSourceType.AUDIO_SOURCE_NATIVE }
    )});

    const resp = ffiClient.request(req);
    this.info = resp.new_audio_source.source;
    this.ffiHandle = new FfiHandle(this.info.handle.id);
  }

  async captureFrame(frame: AudioFrame): Promise<void> {
    const req = new livekitFfi.proto.FfiRequest({ capture_audio_frame: new livekitAudio.proto.CaptureAudioFrameRequest(
      { source_handle: this.ffiHandle.handle, buffer: frame.protoInfo() })})

    const queue = ffiClient.queue.subscribe();
    try {
      const resp = ffiClient.request(req);
      const cb = await queue.waitFor((e: livekitFfi.proto.FfiEvent) => e.capture_audio_frame?.async_id === resp.capture_audio_frame.async_id);

      if (cb.capture_audio_frame.error) {
        throw new Error(cb.capture_audio_frame.error);
      }
    } finally {
      ffiClient.queue.unsubscribe(queue);
    }
  }
}
