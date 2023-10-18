/**
 * Generated by the protoc-gen-ts.  DO NOT EDIT!
 * compiler version: 3.21.11
 * source: participant.proto
 * git: https://github.com/thesayyn/protoc-gen-ts */
import * as dependency_1 from "./handle";
import * as pb_1 from "google-protobuf";
export namespace livekit.proto {
    export class ParticipantInfo extends pb_1.Message {
        #one_of_decls: number[][] = [];
        constructor(data?: any[] | {
            sid?: string;
            name?: string;
            identity?: string;
            metadata?: string;
        }) {
            super();
            pb_1.Message.initialize(this, Array.isArray(data) ? data : [], 0, -1, [], this.#one_of_decls);
            if (!Array.isArray(data) && typeof data == "object") {
                if ("sid" in data && data.sid != undefined) {
                    this.sid = data.sid;
                }
                if ("name" in data && data.name != undefined) {
                    this.name = data.name;
                }
                if ("identity" in data && data.identity != undefined) {
                    this.identity = data.identity;
                }
                if ("metadata" in data && data.metadata != undefined) {
                    this.metadata = data.metadata;
                }
            }
        }
        get sid() {
            return pb_1.Message.getFieldWithDefault(this, 1, "") as string;
        }
        set sid(value: string) {
            pb_1.Message.setField(this, 1, value);
        }
        get name() {
            return pb_1.Message.getFieldWithDefault(this, 2, "") as string;
        }
        set name(value: string) {
            pb_1.Message.setField(this, 2, value);
        }
        get identity() {
            return pb_1.Message.getFieldWithDefault(this, 3, "") as string;
        }
        set identity(value: string) {
            pb_1.Message.setField(this, 3, value);
        }
        get metadata() {
            return pb_1.Message.getFieldWithDefault(this, 4, "") as string;
        }
        set metadata(value: string) {
            pb_1.Message.setField(this, 4, value);
        }
        static fromObject(data: {
            sid?: string;
            name?: string;
            identity?: string;
            metadata?: string;
        }): ParticipantInfo {
            const message = new ParticipantInfo({});
            if (data.sid != null) {
                message.sid = data.sid;
            }
            if (data.name != null) {
                message.name = data.name;
            }
            if (data.identity != null) {
                message.identity = data.identity;
            }
            if (data.metadata != null) {
                message.metadata = data.metadata;
            }
            return message;
        }
        toObject() {
            const data: {
                sid?: string;
                name?: string;
                identity?: string;
                metadata?: string;
            } = {};
            if (this.sid != null) {
                data.sid = this.sid;
            }
            if (this.name != null) {
                data.name = this.name;
            }
            if (this.identity != null) {
                data.identity = this.identity;
            }
            if (this.metadata != null) {
                data.metadata = this.metadata;
            }
            return data;
        }
        serialize(): Uint8Array;
        serialize(w: pb_1.BinaryWriter): void;
        serialize(w?: pb_1.BinaryWriter): Uint8Array | void {
            const writer = w || new pb_1.BinaryWriter();
            if (this.sid.length)
                writer.writeString(1, this.sid);
            if (this.name.length)
                writer.writeString(2, this.name);
            if (this.identity.length)
                writer.writeString(3, this.identity);
            if (this.metadata.length)
                writer.writeString(4, this.metadata);
            if (!w)
                return writer.getResultBuffer();
        }
        static deserialize(bytes: Uint8Array | pb_1.BinaryReader): ParticipantInfo {
            const reader = bytes instanceof pb_1.BinaryReader ? bytes : new pb_1.BinaryReader(bytes), message = new ParticipantInfo();
            while (reader.nextField()) {
                if (reader.isEndGroup())
                    break;
                switch (reader.getFieldNumber()) {
                    case 1:
                        message.sid = reader.readString();
                        break;
                    case 2:
                        message.name = reader.readString();
                        break;
                    case 3:
                        message.identity = reader.readString();
                        break;
                    case 4:
                        message.metadata = reader.readString();
                        break;
                    default: reader.skipField();
                }
            }
            return message;
        }
        serializeBinary(): Uint8Array {
            return this.serialize();
        }
        static deserializeBinary(bytes: Uint8Array): ParticipantInfo {
            return ParticipantInfo.deserialize(bytes);
        }
    }
    export class OwnedParticipant extends pb_1.Message {
        #one_of_decls: number[][] = [];
        constructor(data?: any[] | {
            handle?: dependency_1.livekit.proto.FfiOwnedHandle;
            info?: ParticipantInfo;
        }) {
            super();
            pb_1.Message.initialize(this, Array.isArray(data) ? data : [], 0, -1, [], this.#one_of_decls);
            if (!Array.isArray(data) && typeof data == "object") {
                if ("handle" in data && data.handle != undefined) {
                    this.handle = data.handle;
                }
                if ("info" in data && data.info != undefined) {
                    this.info = data.info;
                }
            }
        }
        get handle() {
            return pb_1.Message.getWrapperField(this, dependency_1.livekit.proto.FfiOwnedHandle, 1) as dependency_1.livekit.proto.FfiOwnedHandle;
        }
        set handle(value: dependency_1.livekit.proto.FfiOwnedHandle) {
            pb_1.Message.setWrapperField(this, 1, value);
        }
        get has_handle() {
            return pb_1.Message.getField(this, 1) != null;
        }
        get info() {
            return pb_1.Message.getWrapperField(this, ParticipantInfo, 2) as ParticipantInfo;
        }
        set info(value: ParticipantInfo) {
            pb_1.Message.setWrapperField(this, 2, value);
        }
        get has_info() {
            return pb_1.Message.getField(this, 2) != null;
        }
        static fromObject(data: {
            handle?: ReturnType<typeof dependency_1.livekit.proto.FfiOwnedHandle.prototype.toObject>;
            info?: ReturnType<typeof ParticipantInfo.prototype.toObject>;
        }): OwnedParticipant {
            const message = new OwnedParticipant({});
            if (data.handle != null) {
                message.handle = dependency_1.livekit.proto.FfiOwnedHandle.fromObject(data.handle);
            }
            if (data.info != null) {
                message.info = ParticipantInfo.fromObject(data.info);
            }
            return message;
        }
        toObject() {
            const data: {
                handle?: ReturnType<typeof dependency_1.livekit.proto.FfiOwnedHandle.prototype.toObject>;
                info?: ReturnType<typeof ParticipantInfo.prototype.toObject>;
            } = {};
            if (this.handle != null) {
                data.handle = this.handle.toObject();
            }
            if (this.info != null) {
                data.info = this.info.toObject();
            }
            return data;
        }
        serialize(): Uint8Array;
        serialize(w: pb_1.BinaryWriter): void;
        serialize(w?: pb_1.BinaryWriter): Uint8Array | void {
            const writer = w || new pb_1.BinaryWriter();
            if (this.has_handle)
                writer.writeMessage(1, this.handle, () => this.handle.serialize(writer));
            if (this.has_info)
                writer.writeMessage(2, this.info, () => this.info.serialize(writer));
            if (!w)
                return writer.getResultBuffer();
        }
        static deserialize(bytes: Uint8Array | pb_1.BinaryReader): OwnedParticipant {
            const reader = bytes instanceof pb_1.BinaryReader ? bytes : new pb_1.BinaryReader(bytes), message = new OwnedParticipant();
            while (reader.nextField()) {
                if (reader.isEndGroup())
                    break;
                switch (reader.getFieldNumber()) {
                    case 1:
                        reader.readMessage(message.handle, () => message.handle = dependency_1.livekit.proto.FfiOwnedHandle.deserialize(reader));
                        break;
                    case 2:
                        reader.readMessage(message.info, () => message.info = ParticipantInfo.deserialize(reader));
                        break;
                    default: reader.skipField();
                }
            }
            return message;
        }
        serializeBinary(): Uint8Array {
            return this.serialize();
        }
        static deserializeBinary(bytes: Uint8Array): OwnedParticipant {
            return OwnedParticipant.deserialize(bytes);
        }
    }
}
