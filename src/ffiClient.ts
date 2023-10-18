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

import * as ffi from 'ffi-napi';
import * as ref from 'ref-napi';
import * as fs from 'fs';
import * as os from 'os';
import { livekit } from './proto/ffi';
import { BroadcastQueue } from './utils';

const uint8 = ref.types.uint8;
const uint8Ptr = ref.refType(uint8);
const uint8PtrPtr = ref.refType(uint8Ptr);
export const ffiLib = new ffi.Library(getFfiLibPath(), {
  'livekit_ffi_request': ['uint64', [uint8Ptr, ref.types.size_t, uint8PtrPtr, ref.refType(ref.types.size_t)]],
  'livekit_ffi_drop_handle': ['bool', ['uint64']],
});

function getFfiLibPath(): string {
  const envLibPath = process.env.LIVEKIT_LIB_PATH?.trim();
  if (envLibPath) {
    return envLibPath;
  }

  let libName: string;
  switch (os.platform()) {
    case 'linux':
      libName = 'liblivekit_ffi.so';
      break;
    case 'darwin':
      libName = 'liblivekit_ffi.dylib';
      break;
    case 'win32':
      libName = 'livekit_ffi.dll';
      break;
    default:
      throw new Error(`No FFI library found for platform ${os.platform()}. Set LIVEKIT_LIB_PATH to specify the lib path.`);
  }

  // Assuming pkg_resources.resource_filename equivalent in Node.js
  const libPath = fs.realpathSync(`./resources/${libName}`);
  return libPath;
}

const INVALID_HANDLE: number = 0;

// Make sure handles are dropped when they are no longer referenced.
const ffiHandleRegistry = new FinalizationRegistry((handle: number) => {
  if (handle !== INVALID_HANDLE) {
    const result = ffiLib.livekit_ffi_drop_handle(handle);

    if (!result) {
      console.error("Failed to drop handle");
    }
  }
});

export class FfiHandle {
  handle: number;

  constructor(handle: number) {
    this.handle = handle;
    ffiHandleRegistry.register(this, handle);
  }

  // Manual release if needed
  release(): void {
    if (this.handle !== INVALID_HANDLE) {
      const result = ffiLib.livekit_ffi_drop_handle(this.handle);

      if (result) {
        ffiHandleRegistry.unregister(this);
      } else {
        console.error("Failed to drop handle");
      }
    }
  }
}

class LiveKitClient {
  private ffiQueue: BroadcastQueue<livekit.proto.FfiEvent>;

  private ffiEventCallback = ffi.Callback(ref.types.void, [uint8Ptr, ref.types.size_t], function(data: Buffer, len: number): void {
    const buffer = ref.reinterpret(data, len, 0)
    const event = livekit.proto.FfiEvent.deserializeBinary(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length));
    ffiClient.queue.put(event)
  })  

  constructor() {
    this.request(new livekit.proto.FfiRequest({
      initialize: new livekit.proto.InitializeRequest({
        event_callback_ptr: this.ffiEventCallback.address()
      })
    }));
    this.ffiQueue = new BroadcastQueue<livekit.proto.FfiEvent>();
  }

  request(req: livekit.proto.FfiRequest): livekit.proto.FfiResponse {
    const data = req.serializeBinary();
    const dataBuffer = Buffer.from(data.buffer, data.byteOffset, data.length);
    const respDataPtrPtr = ref.alloc(uint8PtrPtr)
    const respLen = ref.alloc(ref.types.size_t)
    const handle = ffiLib.livekit_ffi_request(dataBuffer as ref.Pointer<number>, data.length, respDataPtrPtr, respLen);
    try {
      const respDataPtr = respDataPtrPtr.deref();
      const buffer = ref.reinterpret(respDataPtr, respLen.deref() as number, 0)
      const resp = livekit.proto.FfiResponse.deserialize(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length));
      return resp;
    } finally {
      // Drop the handle, which will deallocate the buffer underlying it. 
      // need to understand the lifetime of the deserialized protobuf, can we get zero copy?
      ffiLib.livekit_ffi_drop_handle(handle)
    }
  }

  get queue(): BroadcastQueue<livekit.proto.FfiEvent> {
    return this.ffiQueue;
  }
}

export const ffiClient = new LiveKitClient();
