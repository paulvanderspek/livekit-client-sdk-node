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
import { livekit as livekitAudio } from './proto/audio_frame'
import { livekit as livekitFfi } from './proto/ffi';
import { nativePointerAndLengthToInt16Array } from './utils';

export class AudioFrame {
  private info: livekitAudio.proto.AudioFrameBufferInfo;
  private ffiHandle: FfiHandle;
  data: Int16Array; 

  constructor(ownedInfo: livekitAudio.proto.OwnedAudioFrameBuffer) {
    this.info = ownedInfo.info;
    this.ffiHandle = new FfiHandle(ownedInfo.handle.id);
    this.data = nativePointerAndLengthToInt16Array(this.info.data_ptr, this.info.num_channels * this.info.samples_per_channel * 2);
  }

  static create(sampleRate: number, numChannels: number, samplesPerChannel: number): AudioFrame {
    const req = new livekitFfi.proto.FfiRequest({alloc_audio_buffer: new livekitAudio.proto.AllocAudioBufferRequest(
      { sample_rate: sampleRate, num_channels: numChannels, samples_per_channel: samplesPerChannel }
    )});
    const resp = ffiClient.request(req);
    return new AudioFrame(resp.alloc_audio_buffer.buffer);
  }

  remixAndResample(sampleRate: number, numChannels: number): AudioFrame {
    const req = new livekitFfi.proto.FfiRequest({ new_audio_resampler: new livekitAudio.proto.NewAudioResamplerRequest() });

    const resp = ffiClient.request(req);
    const resamplerHandle = new FfiHandle(resp.new_audio_resampler.resampler.handle.id);

    const resampleReq = new livekitFfi.proto.FfiRequest({
      remix_and_resample: new livekitAudio.proto.RemixAndResampleRequest({
        resampler_handle: resamplerHandle.handle,
        buffer: this.protoInfo(),
        sample_rate: sampleRate,
        num_channels: numChannels,
      }),
    });

    const resampleResp = ffiClient.request(resampleReq);
    return new AudioFrame(resampleResp.remix_and_resample.buffer);
  }

  public protoInfo(): livekitAudio.proto.AudioFrameBufferInfo {
    return new livekitAudio.proto.AudioFrameBufferInfo({
      data_ptr: Buffer.from(this.data.buffer).address(),
      sample_rate: this.sampleRate,
      num_channels: this.numChannels,
      samples_per_channel: this.samplesPerChannel,
    })
  }

  get sampleRate(): number {
    return this.info.sample_rate;
  }

  get numChannels(): number {
    return this.info.num_channels;
  }

  get samplesPerChannel(): number {
    return this.info.samples_per_channel;
  }
}

