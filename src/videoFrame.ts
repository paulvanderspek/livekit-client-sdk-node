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
import { livekit as livekitVideo } from './proto/video_frame'
import { livekit as livekitFfi } from './proto/ffi';
import { nativePointerAndLengthToBuffer } from './utils';

export class VideoFrame {
  constructor(
    public timestampUs: number,
    public rotation: livekitVideo.proto.VideoRotation,
    public buffer: VideoFrameBuffer
  ) {}
}

export class VideoFrameBuffer {
  info: livekitVideo.proto.VideoFrameBufferInfo; // Type should come from your proto definition
  ffiHandle: FfiHandle;

  constructor(ownedInfo: livekitVideo.proto.OwnedVideoFrameBuffer) {
    this.info = ownedInfo.info;
    this.ffiHandle = new FfiHandle(ownedInfo.handle.id);
  }

  get width(): number {
    return this.info.width;
  }

  get height(): number {
    return this.info.height;
  }

  get type(): livekitVideo.proto.VideoFrameBufferType {
    return this.info.buffer_type;
  }

  toI420(): I420Buffer {
    const req = new livekitFfi.proto.FfiRequest({
      to_i420: new livekitVideo.proto.ToI420Request({
        yuv_handle: this.ffiHandle.handle,
      }),
    });
    const resp = ffiClient.request(req);
    return new I420Buffer(resp.to_i420.buffer);
  }

  toArgb(dst: ArgbFrame): void {
    const req = new livekitFfi.proto.FfiRequest({
      to_argb: new livekitVideo.proto.ToArgbRequest({
        buffer_handle: this.ffiHandle.handle,
        dst_ptr: dst.data.address(),
        dst_format: dst.format,
        dst_stride: dst.width * 4,
        dst_width: dst.width,
        dst_height: dst.height,
      }),
    });

    ffiClient.request(req);
  }

  static create(ownedInfo: livekitVideo.proto.OwnedVideoFrameBuffer): VideoFrameBuffer {
    const info = ownedInfo.info;
    
    switch (info.buffer_type) {
      case livekitVideo.proto.VideoFrameBufferType.NATIVE:
        return new NativeVideoFrameBuffer(ownedInfo);
      case livekitVideo.proto.VideoFrameBufferType.I420:
        return new I420Buffer(ownedInfo);
      case livekitVideo.proto.VideoFrameBufferType.I420A:
        return new I420ABuffer(ownedInfo);
      case livekitVideo.proto.VideoFrameBufferType.I422:
        return new I422Buffer(ownedInfo);
      case livekitVideo.proto.VideoFrameBufferType.I444:
        return new I444Buffer(ownedInfo);
      case livekitVideo.proto.VideoFrameBufferType.I010:
        return new I010Buffer(ownedInfo);
      case livekitVideo.proto.VideoFrameBufferType.NV12:
        return new NV12Buffer(ownedInfo);
      default:
        throw new Error('Unsupported VideoFrameBufferType');
    }
  }
}


export class NativeVideoFrameBuffer extends VideoFrameBuffer {
}

export class PlanarYuvBuffer extends VideoFrameBuffer {
  get chromaWidth(): number {
    return this.info.yuv.chroma_width;
  }

  get chromaHeight(): number {
    return this.info.yuv.chroma_height;
  }

  get strideY(): number {
    return this.info.yuv.stride_y;
  }

  get strideU(): number {
    return this.info.yuv.stride_u;
  }

  get strideV(): number {
    return this.info.yuv.stride_v;
  }
}

export class PlanarYuv8Buffer extends PlanarYuvBuffer {
  get dataY(): Buffer {
    return nativePointerAndLengthToBuffer(this.info.yuv.data_y_ptr, this.info.yuv.stride_y * this.info.height);
  }

  get dataU(): Buffer {
    return nativePointerAndLengthToBuffer(this.info.yuv.data_u_ptr, this.info.yuv.stride_u * this.info.yuv.chroma_height);
  }

  get dataV(): Buffer {
    return nativePointerAndLengthToBuffer(this.info.yuv.data_v_ptr, this.info.yuv.stride_v * this.info.yuv.chroma_height);
  }
}

export class PlanarYuv16Buffer extends PlanarYuvBuffer {
  get dataY(): Buffer {
    return nativePointerAndLengthToBuffer(this.info.yuv.data_y_ptr, ~~(this.info.yuv.stride_y / 2) * this.info.height);
  }

  get dataU(): Buffer {
    return nativePointerAndLengthToBuffer(this.info.yuv.data_u_ptr, ~~(this.info.yuv.stride_u / 2) * this.info.yuv.chroma_height);
  }

  get dataV(): Buffer {
    return nativePointerAndLengthToBuffer(this.info.yuv.data_v_ptr, ~~(this.info.yuv.stride_v / 2) * this.info.yuv.chroma_height);
  }
}

export class BiplanarYuv8Buffer extends VideoFrameBuffer {
  get dataY(): Buffer {
    return nativePointerAndLengthToBuffer(this.info.bi_yuv.data_y_ptr, this.info.bi_yuv.stride_y * this.info.height);
  }

  get dataUV(): Buffer {
    return nativePointerAndLengthToBuffer(this.info.bi_yuv.data_uv_ptr, this.info.bi_yuv.stride_uv * this.info.bi_yuv.chroma_height);
  }
}

export class I420Buffer extends PlanarYuv8Buffer {
}

export class I420ABuffer extends PlanarYuv8Buffer {
}

export class I422Buffer extends PlanarYuv8Buffer {
}

export class I444Buffer extends PlanarYuv8Buffer {
}

export class I010Buffer extends PlanarYuv16Buffer {
  constructor(ownedInfo: livekitVideo.proto.OwnedVideoFrameBuffer) {
    super(ownedInfo);
  }
}

export class NV12Buffer extends BiplanarYuv8Buffer {
}

export class ArgbFrame {
  public format: livekitVideo.proto.VideoFormatType;
  public width: number;
  public height: number;
  public data: Buffer; // Assuming you'll use Node.js Buffer

  constructor(format: livekitVideo.proto.VideoFormatType, width: number, height: number) {
    this.format = format;
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4);
  }

  toI420(): I420Buffer {
    const req = new livekitFfi.proto.FfiRequest({
      to_i420: new livekitVideo.proto.ToI420Request({
        argb: new livekitVideo.proto.ArgbBufferInfo({
          format: this.format,
          width: this.width,
          height: this.height,
          stride: this.width * 4,
          ptr: this.data.address(),
        }),
      }),
    });
    const res = ffiClient.request(req);
    return new I420Buffer(res.to_i420.buffer);
  }
}

