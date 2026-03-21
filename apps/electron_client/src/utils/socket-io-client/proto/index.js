/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.Command = (function() {

    /**
     * Properties of a Command.
     * @exports ICommand
     * @interface ICommand
     * @property {number|null} [type] Command type
     * @property {string|null} [userId] Command userId
     * @property {string|null} [client] Command client
     * @property {Array.<Uint8Array>|null} [body] Command body
     */

    /**
     * Constructs a new Command.
     * @exports Command
     * @classdesc Represents a Command.
     * @implements ICommand
     * @constructor
     * @param {ICommand=} [properties] Properties to set
     */
    function Command(properties) {
        this.body = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Command type.
     * @member {number} type
     * @memberof Command
     * @instance
     */
    Command.prototype.type = 0;

    /**
     * Command userId.
     * @member {string} userId
     * @memberof Command
     * @instance
     */
    Command.prototype.userId = "";

    /**
     * Command client.
     * @member {string} client
     * @memberof Command
     * @instance
     */
    Command.prototype.client = "";

    /**
     * Command body.
     * @member {Array.<Uint8Array>} body
     * @memberof Command
     * @instance
     */
    Command.prototype.body = $util.emptyArray;

    /**
     * Creates a new Command instance using the specified properties.
     * @function create
     * @memberof Command
     * @static
     * @param {ICommand=} [properties] Properties to set
     * @returns {Command} Command instance
     */
    Command.create = function create(properties) {
        return new Command(properties);
    };

    /**
     * Encodes the specified Command message. Does not implicitly {@link Command.verify|verify} messages.
     * @function encode
     * @memberof Command
     * @static
     * @param {ICommand} message Command message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Command.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.type != null && Object.hasOwnProperty.call(message, "type"))
            writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.type);
        if (message.userId != null && Object.hasOwnProperty.call(message, "userId"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.userId);
        if (message.client != null && Object.hasOwnProperty.call(message, "client"))
            writer.uint32(/* id 3, wireType 2 =*/26).string(message.client);
        if (message.body != null && message.body.length)
            for (var i = 0; i < message.body.length; ++i)
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.body[i]);
        return writer;
    };

    /**
     * Encodes the specified Command message, length delimited. Does not implicitly {@link Command.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Command
     * @static
     * @param {ICommand} message Command message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Command.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Command message from the specified reader or buffer.
     * @function decode
     * @memberof Command
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Command} Command
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Command.decode = function decode(reader, length, error) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Command();
        while (reader.pos < end) {
            var tag = reader.uint32();
            if (tag === error)
                break;
            switch (tag >>> 3) {
            case 1: {
                    message.type = reader.uint32();
                    break;
                }
            case 2: {
                    message.userId = reader.string();
                    break;
                }
            case 3: {
                    message.client = reader.string();
                    break;
                }
            case 4: {
                    if (!(message.body && message.body.length))
                        message.body = [];
                    message.body.push(reader.bytes());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Command message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Command
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Command} Command
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Command.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Command message.
     * @function verify
     * @memberof Command
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Command.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.type != null && message.hasOwnProperty("type"))
            if (!$util.isInteger(message.type))
                return "type: integer expected";
        if (message.userId != null && message.hasOwnProperty("userId"))
            if (!$util.isString(message.userId))
                return "userId: string expected";
        if (message.client != null && message.hasOwnProperty("client"))
            if (!$util.isString(message.client))
                return "client: string expected";
        if (message.body != null && message.hasOwnProperty("body")) {
            if (!Array.isArray(message.body))
                return "body: array expected";
            for (var i = 0; i < message.body.length; ++i)
                if (!(message.body[i] && typeof message.body[i].length === "number" || $util.isString(message.body[i])))
                    return "body: buffer[] expected";
        }
        return null;
    };

    /**
     * Creates a Command message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Command
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Command} Command
     */
    Command.fromObject = function fromObject(object) {
        if (object instanceof $root.Command)
            return object;
        var message = new $root.Command();
        if (object.type != null)
            message.type = object.type >>> 0;
        if (object.userId != null)
            message.userId = String(object.userId);
        if (object.client != null)
            message.client = String(object.client);
        if (object.body) {
            if (!Array.isArray(object.body))
                throw TypeError(".Command.body: array expected");
            message.body = [];
            for (var i = 0; i < object.body.length; ++i)
                if (typeof object.body[i] === "string")
                    $util.base64.decode(object.body[i], message.body[i] = $util.newBuffer($util.base64.length(object.body[i])), 0);
                else if (object.body[i].length >= 0)
                    message.body[i] = object.body[i];
        }
        return message;
    };

    /**
     * Creates a plain object from a Command message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Command
     * @static
     * @param {Command} message Command
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Command.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults)
            object.body = [];
        if (options.defaults) {
            object.type = 0;
            object.userId = "";
            object.client = "";
        }
        if (message.type != null && message.hasOwnProperty("type"))
            object.type = message.type;
        if (message.userId != null && message.hasOwnProperty("userId"))
            object.userId = message.userId;
        if (message.client != null && message.hasOwnProperty("client"))
            object.client = message.client;
        if (message.body && message.body.length) {
            object.body = [];
            for (var j = 0; j < message.body.length; ++j)
                object.body[j] = options.bytes === String ? $util.base64.encode(message.body[j], 0, message.body[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.body[j]) : message.body[j];
        }
        return object;
    };

    /**
     * Converts this Command to JSON.
     * @function toJSON
     * @memberof Command
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Command.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Command
     * @function getTypeUrl
     * @memberof Command
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Command.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Command";
    };

    return Command;
})();

$root.Result = (function() {

    /**
     * Properties of a Result.
     * @exports IResult
     * @interface IResult
     * @property {boolean|null} [success] Result success
     * @property {string|null} [errorCode] Result errorCode
     * @property {string|null} [errorMessage] Result errorMessage
     * @property {Uint8Array|null} [data] Result data
     */

    /**
     * Constructs a new Result.
     * @exports Result
     * @classdesc Represents a Result.
     * @implements IResult
     * @constructor
     * @param {IResult=} [properties] Properties to set
     */
    function Result(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Result success.
     * @member {boolean} success
     * @memberof Result
     * @instance
     */
    Result.prototype.success = false;

    /**
     * Result errorCode.
     * @member {string} errorCode
     * @memberof Result
     * @instance
     */
    Result.prototype.errorCode = "";

    /**
     * Result errorMessage.
     * @member {string} errorMessage
     * @memberof Result
     * @instance
     */
    Result.prototype.errorMessage = "";

    /**
     * Result data.
     * @member {Uint8Array} data
     * @memberof Result
     * @instance
     */
    Result.prototype.data = $util.newBuffer([]);

    /**
     * Creates a new Result instance using the specified properties.
     * @function create
     * @memberof Result
     * @static
     * @param {IResult=} [properties] Properties to set
     * @returns {Result} Result instance
     */
    Result.create = function create(properties) {
        return new Result(properties);
    };

    /**
     * Encodes the specified Result message. Does not implicitly {@link Result.verify|verify} messages.
     * @function encode
     * @memberof Result
     * @static
     * @param {IResult} message Result message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Result.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.success != null && Object.hasOwnProperty.call(message, "success"))
            writer.uint32(/* id 1, wireType 0 =*/8).bool(message.success);
        if (message.errorCode != null && Object.hasOwnProperty.call(message, "errorCode"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.errorCode);
        if (message.errorMessage != null && Object.hasOwnProperty.call(message, "errorMessage"))
            writer.uint32(/* id 3, wireType 2 =*/26).string(message.errorMessage);
        if (message.data != null && Object.hasOwnProperty.call(message, "data"))
            writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.data);
        return writer;
    };

    /**
     * Encodes the specified Result message, length delimited. Does not implicitly {@link Result.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Result
     * @static
     * @param {IResult} message Result message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Result.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Result message from the specified reader or buffer.
     * @function decode
     * @memberof Result
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Result} Result
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Result.decode = function decode(reader, length, error) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Result();
        while (reader.pos < end) {
            var tag = reader.uint32();
            if (tag === error)
                break;
            switch (tag >>> 3) {
            case 1: {
                    message.success = reader.bool();
                    break;
                }
            case 2: {
                    message.errorCode = reader.string();
                    break;
                }
            case 3: {
                    message.errorMessage = reader.string();
                    break;
                }
            case 4: {
                    message.data = reader.bytes();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Result message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Result
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Result} Result
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Result.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Result message.
     * @function verify
     * @memberof Result
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Result.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.success != null && message.hasOwnProperty("success"))
            if (typeof message.success !== "boolean")
                return "success: boolean expected";
        if (message.errorCode != null && message.hasOwnProperty("errorCode"))
            if (!$util.isString(message.errorCode))
                return "errorCode: string expected";
        if (message.errorMessage != null && message.hasOwnProperty("errorMessage"))
            if (!$util.isString(message.errorMessage))
                return "errorMessage: string expected";
        if (message.data != null && message.hasOwnProperty("data"))
            if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                return "data: buffer expected";
        return null;
    };

    /**
     * Creates a Result message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Result
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Result} Result
     */
    Result.fromObject = function fromObject(object) {
        if (object instanceof $root.Result)
            return object;
        var message = new $root.Result();
        if (object.success != null)
            message.success = Boolean(object.success);
        if (object.errorCode != null)
            message.errorCode = String(object.errorCode);
        if (object.errorMessage != null)
            message.errorMessage = String(object.errorMessage);
        if (object.data != null)
            if (typeof object.data === "string")
                $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
            else if (object.data.length >= 0)
                message.data = object.data;
        return message;
    };

    /**
     * Creates a plain object from a Result message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Result
     * @static
     * @param {Result} message Result
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Result.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.success = false;
            object.errorCode = "";
            object.errorMessage = "";
            if (options.bytes === String)
                object.data = "";
            else {
                object.data = [];
                if (options.bytes !== Array)
                    object.data = $util.newBuffer(object.data);
            }
        }
        if (message.success != null && message.hasOwnProperty("success"))
            object.success = message.success;
        if (message.errorCode != null && message.hasOwnProperty("errorCode"))
            object.errorCode = message.errorCode;
        if (message.errorMessage != null && message.hasOwnProperty("errorMessage"))
            object.errorMessage = message.errorMessage;
        if (message.data != null && message.hasOwnProperty("data"))
            object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
        return object;
    };

    /**
     * Converts this Result to JSON.
     * @function toJSON
     * @memberof Result
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Result.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Result
     * @function getTypeUrl
     * @memberof Result
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Result.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Result";
    };

    return Result;
})();

module.exports = $root;
