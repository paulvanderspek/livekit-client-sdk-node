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

import * as ref from 'ref-napi';
import * as ffi from 'ffi-napi'

// Define the native function
const bridgeLibrary = ffi.Library("/Users/paulv/src/client-sdk-node/bridge/libbridge.dylib", {
  cast_to_void_ptr: [ref.refType(ref.types.void), ["uint64"]],
  cast_to_uint8_ptr: [ref.refType(ref.types.uint8), ["uint64"]],
  cast_to_int16_ptr: [ref.refType(ref.types.int16), ["uint64"]]
});

export function nativePointerAndLengthToBuffer(ptr: number, len: number): Buffer {
  // Convert numeric pointer to a ref-napi-compatible pointer
  const uint8Ptr = bridgeLibrary.cast_to_void_ptr(ptr);

  // Reinterpret as a buffer
  return ref.reinterpret(uint8Ptr, len, 0);
}

export function nativePointerAndLengthToInt16Array(ptr: number, len: number): Int16Array {
  const int16Ptr = bridgeLibrary.cast_to_int16_ptr(ptr);
  const newBuffer = ref.reinterpret(int16Ptr, len / 2, 0);
  return new Int16Array(newBuffer.buffer, newBuffer.byteOffset, newBuffer.length);
}

export function nativePointerAndLengthToUInt8Array(ptr: number, len: number): Uint8Array {
  const uint8Ptr = bridgeLibrary.cast_to_uint8_ptr(ptr);
  const newBuffer = ref.reinterpret(uint8Ptr, len, 0);
  return new Uint8Array(newBuffer.buffer, newBuffer.byteOffset, newBuffer.length);
}

export function castNativeInt16ArrayToUint8Array(int16Array: Int16Array): Uint8Array {
  const uint8Ptr = bridgeLibrary.cast_to_uint8_ptr(Buffer.from(int16Array.buffer).address());
  const newBuffer = ref.reinterpret(uint8Ptr, int16Array.length * 2, 0);
  return new Uint8Array(newBuffer.buffer, newBuffer.byteOffset, newBuffer.length);
}  

export class NativeInt16Array {
  private buffer: Buffer;
  private length: number;

  constructor(buffer: Buffer) {
    if (buffer.length % 2 !== 0) {
      throw new Error("Buffer length must be even to be treated as Int16Array");
    }

    this.buffer = buffer;
    this.length = buffer.length / 2;
  }

  get(index: number): number {
    if (index >= this.length || index < 0) {
      throw new RangeError("Index out of bounds");
    }

    return this.buffer.readInt16LE(index * 2);
  }

  set(index: number, value: number): void {
    if (index >= this.length || index < 0) {
      throw new RangeError("Index out of bounds");
    }

    this.buffer.writeInt16LE(value, index * 2);
  }
}

export function bufferToNativePointer(buffer: Buffer): number {
  return buffer.address()
}

export class RingQueue<T> {
  private queue: T[] = [];
  private resolvers: Array<(value: T) => void> = [];
  private capacity: number;

  constructor(capacity: number = 0) {
    this.capacity = capacity;
  }

  put(item: T): void {
    if (this.capacity > 0 && this.queue.length === this.capacity) {
      this.queue.shift();
    }

    if (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      resolve(item);
    } else {
      this.queue.push(item);
    }
  }

  async get(): Promise<T> {
    return new Promise<T>((resolve) => {
      if (this.queue.length > 0) {
        resolve(this.queue.shift()!);
      } else {
        this.resolvers.push(resolve);
      }
    });
  }
}

// TODO(paul) -- Need to audit how this is used,
// there is some sus concurrency in the ported code.

export class AsyncQueue<T> {
  private queue: T[] = [];
  private resolvers: Array<(value: T) => void> = [];
  private queueProcessed: Promise<void> = Promise.resolve();
  private queueProcessedResolver: () => void = () => { };
  private unfinishedTasks = 0;

  put(item: T): void {
    ++this.unfinishedTasks;
    if (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      resolve(item);
    } else {
      this.queue.push(item);
    }
  }

  async get(): Promise<T> {
    return new Promise<T>((resolve) => {
      if (this.queue.length > 0) {
        resolve(this.queue.shift()!);
      } else {
        this.resolvers.push(resolve);
      }
    });
  }

  getNoWait(): T | undefined {
    if (this.queue.length > 0) {
      return this.queue.shift()!;
    }
    return undefined;
  }

  async waitFor(predicate: (item: T) => boolean): Promise<T> {
    for (;;) {
      const item = await this.get();
      if (predicate(item)) {
        return item;
      }
      this.taskDone();
    }
  }

  taskDone(): void {
    if (--this.unfinishedTasks == 0) {
      const resolver = this.queueProcessedResolver;
      this.queueProcessed = new Promise<void>((resolve) => {
        this.queueProcessedResolver = resolve;
      });
      resolver();
    }
  }

  async join(): Promise<void> {
    await this.queueProcessed;
  }
}

export class BroadcastQueue<T> {
  private subscribers: Array<AsyncQueue<T>> = [];
  private toRemove: Array<AsyncQueue<T>> = [];

  subscribe(): AsyncQueue<T> {
    const queue = new AsyncQueue<T>();
    this.subscribers.push(queue);
    return queue;
  }

  unsubscribe(queue: AsyncQueue<T>): void {
    // TODO(Paul) - seems like unsub should wake the join, 
    // at least code is written assuming that convention.
    this.toRemove.push(queue);
  }

  put(item: T): void {
    // TODO(paul) - If no subscribers we're dropping on the floor, which seems racey
    for (const subscriber of this.subscribers) {
      subscriber.put(item);
    }
    // Cleanup
    this.subscribers = this.subscribers.filter(sub => !this.toRemove.includes(sub));
    this.toRemove = [];
  }

  async join(): Promise<void> {
    await Promise.all(this.subscribers.map(sub => sub.join()));
  }
}
