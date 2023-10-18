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
import { livekit as livekitVideo } from './proto/video_frame';
import { VideoFrame } from './videoFrame';

export class VideoSource {
  info: livekitVideo.proto.OwnedVideoSource;
  ffiHandle: FfiHandle;

  constructor() {
    const req = new livekitFfi.proto.FfiRequest({
      new_video_source: new livekitVideo.proto.NewVideoSourceRequest({
        type: livekitVideo.proto.VideoSourceType.VIDEO_SOURCE_NATIVE,
      })})

    const resp = ffiClient.request(req);
    this.info = resp.new_video_source.source;
    this.ffiHandle = new FfiHandle(this.info.handle.id);
  }

  captureFrame(frame: VideoFrame): void {
    const req = new livekitFfi.proto.FfiRequest({
      capture_video_frame: new livekitVideo.proto.CaptureVideoFrameRequest({
        source_handle: this.ffiHandle.handle,
        buffer_handle: frame.buffer.ffiHandle.handle,
        frame: new livekitVideo.proto.VideoFrameInfo({
          rotation: frame.rotation,
          timestamp_us: frame.timestampUs,
        }),
      })})
    
    ffiClient.request(req);
  }
}
