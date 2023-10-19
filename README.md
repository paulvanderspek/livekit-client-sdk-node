
# 📹🎙️ Unofficial Node Server Client SDK for LiveKit

The Livekit Node Client provides a convenient interface for integrating Livekit's real-time video and audio capabilities into your Node server applications. With this library, developers can easily leverage Livekit's WebRTC functionalities, allowing them to focus on building their application logic without worrying about the complexities of WebRTC.

This is for server side use for client side use, use https://github.com/livekit/client-sdk-js

This is a work in progress.

Official LiveKit documentation: https://docs.livekit.io/

## Running 

Thus far this works locally on my Mac, so you should be able to get that far as well.m

You need the rust client sdk. You can build this locally from the submodule or download a prebuilt.
Prebuilt download script here: https://github.com/livekit/rust-sdks/blob/main/download_ffi.py

```shell
# Build client-sdk locally, you can skip this if you download a prebuilt. 
git submodule update --init
cd client-sdk-rust
cargo build
```
Setup the LIVEKIT_LIB_PATH in .env to point to the livekit_ffi.dylib or equivalent for your architecture.

There's a small C library that enables changing native pointer types in a way that keeps node happy. 
For now the code assumes this is in the bridge/ directory.
```shell
pushd bridge
make
popd
```

Run the basic room example.
```
yarn install
yarn run basic_room

``` 
