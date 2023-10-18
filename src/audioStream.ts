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

import { livekit as livekitFfi } from './proto/ffi';
import { livekit as livekitAudio } from './proto/audio_frame';
import { FfiHandle, ffiClient } from './ffiClient';
import { RingQueue } from './utils';
import { AudioFrame } from './audioFrame';
import { Track } from './track';
import { AsyncQueue } from './utils';

type FfiEvent = livekitFfi.proto.FfiEvent;

export class AudioStream implements AsyncIterable<AudioFrame> {
  private track: Track;
  private ffiQueue: AsyncQueue<FfiEvent>;
  private queue: RingQueue<AudioFrame>;
  private ffiHandle: FfiHandle;
  private info: livekitAudio.proto.OwnedAudioStream;
  private task: Promise<void>;

  constructor(track: Track, capacity: number = 0) {
    this.track = track;  // Is this just for lifetime management?
    // Need to figure out difference b/w python queues, one requires marking task complete.
    // What did we port wrong?
    this.ffiQueue = ffiClient.queue.subscribe();
    this.queue = new RingQueue<AudioFrame>(capacity);
    const request = new livekitFfi.proto.FfiRequest({
      new_audio_stream: new livekitAudio.proto.NewAudioStreamRequest({
        track_handle: track.ffiHandle.handle,
        type: livekitAudio.proto.AudioStreamType.AUDIO_STREAM_NATIVE,
      }),
    });
    const response = ffiClient.request(request);
    const streamInfo = response.new_audio_stream.stream;
    this.ffiHandle = new FfiHandle(streamInfo.handle.id);
    this.info = streamInfo;
    this.task = this.run()
  }

  private async run() {
    try {
      for (;;) {
        const handle = this.ffiHandle.handle
        const audioEvent = (await this.ffiQueue.waitFor((e: FfiEvent) => e.audio_stream_event?.stream_handle === handle)).audio_stream_event;
        if (audioEvent.has_frame_received) {
          const ownedBufferInfo: livekitAudio.proto.OwnedAudioFrameBuffer = audioEvent.frame_received.frame;
          const frame = new AudioFrame(ownedBufferInfo);
          this.queue.put(frame);
          this.ffiQueue.taskDone()
        } else if (audioEvent.has_eos) {
          this.ffiQueue.taskDone()
          break;
        }
      }
    } catch (e) {
      console.error('error in audio stream', e);
    } finally {
      ffiClient.queue.unsubscribe(this.ffiQueue);
    }
  }

  public async close() {
    await this.task;
    // Handle release after task is done
    this.ffiHandle.release()
  }

  public async *[Symbol.asyncIterator](): AsyncIterableIterator<AudioFrame> {
    for (;;) {
      const result = await Promise.any([this.task, this.queue.get()]);
      if (result instanceof AudioFrame) {
        yield result;
      } else {
        break;
      }
    }
  }
}
