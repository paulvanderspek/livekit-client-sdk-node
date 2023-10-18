#!/bin/bash
# Copyright 2023 LiveKit, Inc.
# Copyright 2023 Paul Vanderspek
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


# This script requires protobuf-compiler and npm install protoc-gen-ts

FFI_PROTOCOL=./client-sdk-rust/livekit-ffi/protocol
OUT_TYPESCRIPT=./src/proto
mkdir -p $OUT_TYPESCRIPT

protoc \
    -I=$FFI_PROTOCOL \
    --ts_out=$OUT_TYPESCRIPT \
    $FFI_PROTOCOL/audio_frame.proto \
    $FFI_PROTOCOL/ffi.proto \
    $FFI_PROTOCOL/handle.proto \
    $FFI_PROTOCOL/participant.proto \
    $FFI_PROTOCOL/room.proto \
    $FFI_PROTOCOL/track.proto \
    $FFI_PROTOCOL/video_frame.proto \
    $FFI_PROTOCOL/e2ee.proto
