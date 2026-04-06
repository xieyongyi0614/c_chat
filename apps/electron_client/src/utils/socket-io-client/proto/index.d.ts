import * as $protobuf from "protobufjs";
import Long = require("long");
/** Properties of a Command. */
export interface ICommand {

    /** Command event */
    event?: (string|null);

    /** Command userId */
    userId?: (string|null);

    /** Command client */
    client?: (string|null);

    /** Command requestId */
    requestId?: (string|null);

    /** Command payload */
    payload?: (Uint8Array[]|null);
}

/** Represents a Command. */
export class Command implements ICommand {

    /**
     * Constructs a new Command.
     * @param [properties] Properties to set
     */
    constructor(properties?: ICommand);

    /** Command event. */
    public event: string;

    /** Command userId. */
    public userId: string;

    /** Command client. */
    public client: string;

    /** Command requestId. */
    public requestId: string;

    /** Command payload. */
    public payload: Uint8Array[];

    /**
     * Creates a new Command instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Command instance
     */
    public static create(properties?: ICommand): Command;

    /**
     * Encodes the specified Command message. Does not implicitly {@link Command.verify|verify} messages.
     * @param message Command message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ICommand, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Command message, length delimited. Does not implicitly {@link Command.verify|verify} messages.
     * @param message Command message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ICommand, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Command message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Command
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Command;

    /**
     * Decodes a Command message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Command
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Command;

    /**
     * Verifies a Command message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a Command message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Command
     */
    public static fromObject(object: { [k: string]: any }): Command;

    /**
     * Creates a plain object from a Command message. Also converts values to other types if specified.
     * @param message Command
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Command, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Command to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Command
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Namespace Common. */
export namespace Common {

    /** Properties of a PaginationRequest. */
    interface IPaginationRequest {

        /** PaginationRequest page */
        page?: (number|null);

        /** PaginationRequest pageSize */
        pageSize?: (number|null);
    }

    /** Represents a PaginationRequest. */
    class PaginationRequest implements IPaginationRequest {

        /**
         * Constructs a new PaginationRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: Common.IPaginationRequest);

        /** PaginationRequest page. */
        public page: number;

        /** PaginationRequest pageSize. */
        public pageSize: number;

        /**
         * Creates a new PaginationRequest instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PaginationRequest instance
         */
        public static create(properties?: Common.IPaginationRequest): Common.PaginationRequest;

        /**
         * Encodes the specified PaginationRequest message. Does not implicitly {@link Common.PaginationRequest.verify|verify} messages.
         * @param message PaginationRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: Common.IPaginationRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PaginationRequest message, length delimited. Does not implicitly {@link Common.PaginationRequest.verify|verify} messages.
         * @param message PaginationRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: Common.IPaginationRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PaginationRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PaginationRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Common.PaginationRequest;

        /**
         * Decodes a PaginationRequest message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PaginationRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Common.PaginationRequest;

        /**
         * Verifies a PaginationRequest message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PaginationRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PaginationRequest
         */
        public static fromObject(object: { [k: string]: any }): Common.PaginationRequest;

        /**
         * Creates a plain object from a PaginationRequest message. Also converts values to other types if specified.
         * @param message PaginationRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: Common.PaginationRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PaginationRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PaginationRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PaginationResponse. */
    interface IPaginationResponse {

        /** PaginationResponse total */
        total?: (number|null);

        /** PaginationResponse page */
        page?: (number|null);

        /** PaginationResponse pageSize */
        pageSize?: (number|null);

        /** PaginationResponse totalPage */
        totalPage?: (number|null);
    }

    /** Represents a PaginationResponse. */
    class PaginationResponse implements IPaginationResponse {

        /**
         * Constructs a new PaginationResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: Common.IPaginationResponse);

        /** PaginationResponse total. */
        public total: number;

        /** PaginationResponse page. */
        public page: number;

        /** PaginationResponse pageSize. */
        public pageSize: number;

        /** PaginationResponse totalPage. */
        public totalPage: number;

        /**
         * Creates a new PaginationResponse instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PaginationResponse instance
         */
        public static create(properties?: Common.IPaginationResponse): Common.PaginationResponse;

        /**
         * Encodes the specified PaginationResponse message. Does not implicitly {@link Common.PaginationResponse.verify|verify} messages.
         * @param message PaginationResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: Common.IPaginationResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PaginationResponse message, length delimited. Does not implicitly {@link Common.PaginationResponse.verify|verify} messages.
         * @param message PaginationResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: Common.IPaginationResponse, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PaginationResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PaginationResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Common.PaginationResponse;

        /**
         * Decodes a PaginationResponse message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PaginationResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Common.PaginationResponse;

        /**
         * Verifies a PaginationResponse message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PaginationResponse message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PaginationResponse
         */
        public static fromObject(object: { [k: string]: any }): Common.PaginationResponse;

        /**
         * Creates a plain object from a PaginationResponse message. Also converts values to other types if specified.
         * @param message PaginationResponse
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: Common.PaginationResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PaginationResponse to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PaginationResponse
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Properties of a UserInfo. */
export interface IUserInfo {

    /** UserInfo id */
    id?: (string|null);

    /** UserInfo email */
    email?: (string|null);

    /** UserInfo nickname */
    nickname?: (string|null);

    /** UserInfo avatarUrl */
    avatarUrl?: (string|null);

    /** UserInfo state */
    state?: (number|null);

    /** UserInfo updateTime */
    updateTime?: (number|Long|null);
}

/** Represents a UserInfo. */
export class UserInfo implements IUserInfo {

    /**
     * Constructs a new UserInfo.
     * @param [properties] Properties to set
     */
    constructor(properties?: IUserInfo);

    /** UserInfo id. */
    public id: string;

    /** UserInfo email. */
    public email: string;

    /** UserInfo nickname. */
    public nickname?: (string|null);

    /** UserInfo avatarUrl. */
    public avatarUrl?: (string|null);

    /** UserInfo state. */
    public state: number;

    /** UserInfo updateTime. */
    public updateTime: (number|Long);

    /**
     * Creates a new UserInfo instance using the specified properties.
     * @param [properties] Properties to set
     * @returns UserInfo instance
     */
    public static create(properties?: IUserInfo): UserInfo;

    /**
     * Encodes the specified UserInfo message. Does not implicitly {@link UserInfo.verify|verify} messages.
     * @param message UserInfo message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IUserInfo, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified UserInfo message, length delimited. Does not implicitly {@link UserInfo.verify|verify} messages.
     * @param message UserInfo message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IUserInfo, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a UserInfo message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns UserInfo
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): UserInfo;

    /**
     * Decodes a UserInfo message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns UserInfo
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): UserInfo;

    /**
     * Verifies a UserInfo message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a UserInfo message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns UserInfo
     */
    public static fromObject(object: { [k: string]: any }): UserInfo;

    /**
     * Creates a plain object from a UserInfo message. Also converts values to other types if specified.
     * @param message UserInfo
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: UserInfo, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this UserInfo to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for UserInfo
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a GetUserList. */
export interface IGetUserList {

    /** GetUserList pagination */
    pagination?: (Common.IPaginationRequest|null);

    /** GetUserList word */
    word?: (string|null);
}

/** Represents a GetUserList. */
export class GetUserList implements IGetUserList {

    /**
     * Constructs a new GetUserList.
     * @param [properties] Properties to set
     */
    constructor(properties?: IGetUserList);

    /** GetUserList pagination. */
    public pagination?: (Common.IPaginationRequest|null);

    /** GetUserList word. */
    public word: string;

    /**
     * Creates a new GetUserList instance using the specified properties.
     * @param [properties] Properties to set
     * @returns GetUserList instance
     */
    public static create(properties?: IGetUserList): GetUserList;

    /**
     * Encodes the specified GetUserList message. Does not implicitly {@link GetUserList.verify|verify} messages.
     * @param message GetUserList message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IGetUserList, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified GetUserList message, length delimited. Does not implicitly {@link GetUserList.verify|verify} messages.
     * @param message GetUserList message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IGetUserList, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a GetUserList message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns GetUserList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): GetUserList;

    /**
     * Decodes a GetUserList message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns GetUserList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): GetUserList;

    /**
     * Verifies a GetUserList message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a GetUserList message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns GetUserList
     */
    public static fromObject(object: { [k: string]: any }): GetUserList;

    /**
     * Creates a plain object from a GetUserList message. Also converts values to other types if specified.
     * @param message GetUserList
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: GetUserList, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this GetUserList to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for GetUserList
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a GetUserListResponse. */
export interface IGetUserListResponse {

    /** GetUserListResponse pagination */
    pagination?: (Common.IPaginationResponse|null);

    /** GetUserListResponse list */
    list?: (IUserInfo[]|null);
}

/** Represents a GetUserListResponse. */
export class GetUserListResponse implements IGetUserListResponse {

    /**
     * Constructs a new GetUserListResponse.
     * @param [properties] Properties to set
     */
    constructor(properties?: IGetUserListResponse);

    /** GetUserListResponse pagination. */
    public pagination?: (Common.IPaginationResponse|null);

    /** GetUserListResponse list. */
    public list: IUserInfo[];

    /**
     * Creates a new GetUserListResponse instance using the specified properties.
     * @param [properties] Properties to set
     * @returns GetUserListResponse instance
     */
    public static create(properties?: IGetUserListResponse): GetUserListResponse;

    /**
     * Encodes the specified GetUserListResponse message. Does not implicitly {@link GetUserListResponse.verify|verify} messages.
     * @param message GetUserListResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IGetUserListResponse, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified GetUserListResponse message, length delimited. Does not implicitly {@link GetUserListResponse.verify|verify} messages.
     * @param message GetUserListResponse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IGetUserListResponse, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a GetUserListResponse message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns GetUserListResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): GetUserListResponse;

    /**
     * Decodes a GetUserListResponse message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns GetUserListResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): GetUserListResponse;

    /**
     * Verifies a GetUserListResponse message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a GetUserListResponse message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns GetUserListResponse
     */
    public static fromObject(object: { [k: string]: any }): GetUserListResponse;

    /**
     * Creates a plain object from a GetUserListResponse message. Also converts values to other types if specified.
     * @param message GetUserListResponse
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: GetUserListResponse, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this GetUserListResponse to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for GetUserListResponse
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}
