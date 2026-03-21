import * as $protobuf from "protobufjs";
import Long = require("long");
/** Properties of a Command. */
export interface ICommand {

    /** Command type */
    type?: (number|null);

    /** Command userId */
    userId?: (string|null);

    /** Command client */
    client?: (string|null);

    /** Command body */
    body?: (Uint8Array[]|null);
}

/** Represents a Command. */
export class Command implements ICommand {

    /**
     * Constructs a new Command.
     * @param [properties] Properties to set
     */
    constructor(properties?: ICommand);

    /** Command type. */
    public type: number;

    /** Command userId. */
    public userId: string;

    /** Command client. */
    public client: string;

    /** Command body. */
    public body: Uint8Array[];

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

/** Properties of a Result. */
export interface IResult {

    /** Result success */
    success?: (boolean|null);

    /** Result errorCode */
    errorCode?: (string|null);

    /** Result errorMessage */
    errorMessage?: (string|null);

    /** Result data */
    data?: (Uint8Array|null);
}

/** Represents a Result. */
export class Result implements IResult {

    /**
     * Constructs a new Result.
     * @param [properties] Properties to set
     */
    constructor(properties?: IResult);

    /** Result success. */
    public success: boolean;

    /** Result errorCode. */
    public errorCode: string;

    /** Result errorMessage. */
    public errorMessage: string;

    /** Result data. */
    public data: Uint8Array;

    /**
     * Creates a new Result instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Result instance
     */
    public static create(properties?: IResult): Result;

    /**
     * Encodes the specified Result message. Does not implicitly {@link Result.verify|verify} messages.
     * @param message Result message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IResult, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Result message, length delimited. Does not implicitly {@link Result.verify|verify} messages.
     * @param message Result message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IResult, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Result message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Result
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Result;

    /**
     * Decodes a Result message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Result
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Result;

    /**
     * Verifies a Result message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a Result message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Result
     */
    public static fromObject(object: { [k: string]: any }): Result;

    /**
     * Creates a plain object from a Result message. Also converts values to other types if specified.
     * @param message Result
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Result, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Result to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Result
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}
