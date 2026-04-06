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
     * @property {string|null} [event] Command event
     * @property {string|null} [userId] Command userId
     * @property {string|null} [client] Command client
     * @property {string|null} [requestId] Command requestId
     * @property {Array.<Uint8Array>|null} [payload] Command payload
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
        this.payload = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Command event.
     * @member {string} event
     * @memberof Command
     * @instance
     */
    Command.prototype.event = "";

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
     * Command requestId.
     * @member {string} requestId
     * @memberof Command
     * @instance
     */
    Command.prototype.requestId = "";

    /**
     * Command payload.
     * @member {Array.<Uint8Array>} payload
     * @memberof Command
     * @instance
     */
    Command.prototype.payload = $util.emptyArray;

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
        if (message.event != null && Object.hasOwnProperty.call(message, "event"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.event);
        if (message.userId != null && Object.hasOwnProperty.call(message, "userId"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.userId);
        if (message.client != null && Object.hasOwnProperty.call(message, "client"))
            writer.uint32(/* id 3, wireType 2 =*/26).string(message.client);
        if (message.requestId != null && Object.hasOwnProperty.call(message, "requestId"))
            writer.uint32(/* id 4, wireType 2 =*/34).string(message.requestId);
        if (message.payload != null && message.payload.length)
            for (var i = 0; i < message.payload.length; ++i)
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.payload[i]);
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
                    message.event = reader.string();
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
                    message.requestId = reader.string();
                    break;
                }
            case 5: {
                    if (!(message.payload && message.payload.length))
                        message.payload = [];
                    message.payload.push(reader.bytes());
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
        if (message.event != null && message.hasOwnProperty("event"))
            if (!$util.isString(message.event))
                return "event: string expected";
        if (message.userId != null && message.hasOwnProperty("userId"))
            if (!$util.isString(message.userId))
                return "userId: string expected";
        if (message.client != null && message.hasOwnProperty("client"))
            if (!$util.isString(message.client))
                return "client: string expected";
        if (message.requestId != null && message.hasOwnProperty("requestId"))
            if (!$util.isString(message.requestId))
                return "requestId: string expected";
        if (message.payload != null && message.hasOwnProperty("payload")) {
            if (!Array.isArray(message.payload))
                return "payload: array expected";
            for (var i = 0; i < message.payload.length; ++i)
                if (!(message.payload[i] && typeof message.payload[i].length === "number" || $util.isString(message.payload[i])))
                    return "payload: buffer[] expected";
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
        if (object.event != null)
            message.event = String(object.event);
        if (object.userId != null)
            message.userId = String(object.userId);
        if (object.client != null)
            message.client = String(object.client);
        if (object.requestId != null)
            message.requestId = String(object.requestId);
        if (object.payload) {
            if (!Array.isArray(object.payload))
                throw TypeError(".Command.payload: array expected");
            message.payload = [];
            for (var i = 0; i < object.payload.length; ++i)
                if (typeof object.payload[i] === "string")
                    $util.base64.decode(object.payload[i], message.payload[i] = $util.newBuffer($util.base64.length(object.payload[i])), 0);
                else if (object.payload[i].length >= 0)
                    message.payload[i] = object.payload[i];
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
            object.payload = [];
        if (options.defaults) {
            object.event = "";
            object.userId = "";
            object.client = "";
            object.requestId = "";
        }
        if (message.event != null && message.hasOwnProperty("event"))
            object.event = message.event;
        if (message.userId != null && message.hasOwnProperty("userId"))
            object.userId = message.userId;
        if (message.client != null && message.hasOwnProperty("client"))
            object.client = message.client;
        if (message.requestId != null && message.hasOwnProperty("requestId"))
            object.requestId = message.requestId;
        if (message.payload && message.payload.length) {
            object.payload = [];
            for (var j = 0; j < message.payload.length; ++j)
                object.payload[j] = options.bytes === String ? $util.base64.encode(message.payload[j], 0, message.payload[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.payload[j]) : message.payload[j];
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

$root.Common = (function() {

    /**
     * Namespace Common.
     * @exports Common
     * @namespace
     */
    var Common = {};

    Common.PaginationRequest = (function() {

        /**
         * Properties of a PaginationRequest.
         * @memberof Common
         * @interface IPaginationRequest
         * @property {number|null} [page] PaginationRequest page
         * @property {number|null} [pageSize] PaginationRequest pageSize
         */

        /**
         * Constructs a new PaginationRequest.
         * @memberof Common
         * @classdesc Represents a PaginationRequest.
         * @implements IPaginationRequest
         * @constructor
         * @param {Common.IPaginationRequest=} [properties] Properties to set
         */
        function PaginationRequest(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PaginationRequest page.
         * @member {number} page
         * @memberof Common.PaginationRequest
         * @instance
         */
        PaginationRequest.prototype.page = 0;

        /**
         * PaginationRequest pageSize.
         * @member {number} pageSize
         * @memberof Common.PaginationRequest
         * @instance
         */
        PaginationRequest.prototype.pageSize = 0;

        /**
         * Creates a new PaginationRequest instance using the specified properties.
         * @function create
         * @memberof Common.PaginationRequest
         * @static
         * @param {Common.IPaginationRequest=} [properties] Properties to set
         * @returns {Common.PaginationRequest} PaginationRequest instance
         */
        PaginationRequest.create = function create(properties) {
            return new PaginationRequest(properties);
        };

        /**
         * Encodes the specified PaginationRequest message. Does not implicitly {@link Common.PaginationRequest.verify|verify} messages.
         * @function encode
         * @memberof Common.PaginationRequest
         * @static
         * @param {Common.IPaginationRequest} message PaginationRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PaginationRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.page != null && Object.hasOwnProperty.call(message, "page"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.page);
            if (message.pageSize != null && Object.hasOwnProperty.call(message, "pageSize"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.pageSize);
            return writer;
        };

        /**
         * Encodes the specified PaginationRequest message, length delimited. Does not implicitly {@link Common.PaginationRequest.verify|verify} messages.
         * @function encodeDelimited
         * @memberof Common.PaginationRequest
         * @static
         * @param {Common.IPaginationRequest} message PaginationRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PaginationRequest.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PaginationRequest message from the specified reader or buffer.
         * @function decode
         * @memberof Common.PaginationRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {Common.PaginationRequest} PaginationRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PaginationRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Common.PaginationRequest();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.page = reader.int32();
                        break;
                    }
                case 2: {
                        message.pageSize = reader.int32();
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
         * Decodes a PaginationRequest message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof Common.PaginationRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {Common.PaginationRequest} PaginationRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PaginationRequest.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PaginationRequest message.
         * @function verify
         * @memberof Common.PaginationRequest
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PaginationRequest.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.page != null && message.hasOwnProperty("page"))
                if (!$util.isInteger(message.page))
                    return "page: integer expected";
            if (message.pageSize != null && message.hasOwnProperty("pageSize"))
                if (!$util.isInteger(message.pageSize))
                    return "pageSize: integer expected";
            return null;
        };

        /**
         * Creates a PaginationRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof Common.PaginationRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {Common.PaginationRequest} PaginationRequest
         */
        PaginationRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.Common.PaginationRequest)
                return object;
            var message = new $root.Common.PaginationRequest();
            if (object.page != null)
                message.page = object.page | 0;
            if (object.pageSize != null)
                message.pageSize = object.pageSize | 0;
            return message;
        };

        /**
         * Creates a plain object from a PaginationRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof Common.PaginationRequest
         * @static
         * @param {Common.PaginationRequest} message PaginationRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PaginationRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.page = 0;
                object.pageSize = 0;
            }
            if (message.page != null && message.hasOwnProperty("page"))
                object.page = message.page;
            if (message.pageSize != null && message.hasOwnProperty("pageSize"))
                object.pageSize = message.pageSize;
            return object;
        };

        /**
         * Converts this PaginationRequest to JSON.
         * @function toJSON
         * @memberof Common.PaginationRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PaginationRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PaginationRequest
         * @function getTypeUrl
         * @memberof Common.PaginationRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PaginationRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/Common.PaginationRequest";
        };

        return PaginationRequest;
    })();

    Common.PaginationResponse = (function() {

        /**
         * Properties of a PaginationResponse.
         * @memberof Common
         * @interface IPaginationResponse
         * @property {number|null} [total] PaginationResponse total
         * @property {number|null} [page] PaginationResponse page
         * @property {number|null} [pageSize] PaginationResponse pageSize
         * @property {number|null} [totalPage] PaginationResponse totalPage
         */

        /**
         * Constructs a new PaginationResponse.
         * @memberof Common
         * @classdesc Represents a PaginationResponse.
         * @implements IPaginationResponse
         * @constructor
         * @param {Common.IPaginationResponse=} [properties] Properties to set
         */
        function PaginationResponse(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PaginationResponse total.
         * @member {number} total
         * @memberof Common.PaginationResponse
         * @instance
         */
        PaginationResponse.prototype.total = 0;

        /**
         * PaginationResponse page.
         * @member {number} page
         * @memberof Common.PaginationResponse
         * @instance
         */
        PaginationResponse.prototype.page = 0;

        /**
         * PaginationResponse pageSize.
         * @member {number} pageSize
         * @memberof Common.PaginationResponse
         * @instance
         */
        PaginationResponse.prototype.pageSize = 0;

        /**
         * PaginationResponse totalPage.
         * @member {number} totalPage
         * @memberof Common.PaginationResponse
         * @instance
         */
        PaginationResponse.prototype.totalPage = 0;

        /**
         * Creates a new PaginationResponse instance using the specified properties.
         * @function create
         * @memberof Common.PaginationResponse
         * @static
         * @param {Common.IPaginationResponse=} [properties] Properties to set
         * @returns {Common.PaginationResponse} PaginationResponse instance
         */
        PaginationResponse.create = function create(properties) {
            return new PaginationResponse(properties);
        };

        /**
         * Encodes the specified PaginationResponse message. Does not implicitly {@link Common.PaginationResponse.verify|verify} messages.
         * @function encode
         * @memberof Common.PaginationResponse
         * @static
         * @param {Common.IPaginationResponse} message PaginationResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PaginationResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.total != null && Object.hasOwnProperty.call(message, "total"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.total);
            if (message.page != null && Object.hasOwnProperty.call(message, "page"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.page);
            if (message.pageSize != null && Object.hasOwnProperty.call(message, "pageSize"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.pageSize);
            if (message.totalPage != null && Object.hasOwnProperty.call(message, "totalPage"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.totalPage);
            return writer;
        };

        /**
         * Encodes the specified PaginationResponse message, length delimited. Does not implicitly {@link Common.PaginationResponse.verify|verify} messages.
         * @function encodeDelimited
         * @memberof Common.PaginationResponse
         * @static
         * @param {Common.IPaginationResponse} message PaginationResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PaginationResponse.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PaginationResponse message from the specified reader or buffer.
         * @function decode
         * @memberof Common.PaginationResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {Common.PaginationResponse} PaginationResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PaginationResponse.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Common.PaginationResponse();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.total = reader.int32();
                        break;
                    }
                case 2: {
                        message.page = reader.int32();
                        break;
                    }
                case 3: {
                        message.pageSize = reader.int32();
                        break;
                    }
                case 4: {
                        message.totalPage = reader.int32();
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
         * Decodes a PaginationResponse message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof Common.PaginationResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {Common.PaginationResponse} PaginationResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PaginationResponse.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PaginationResponse message.
         * @function verify
         * @memberof Common.PaginationResponse
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PaginationResponse.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.total != null && message.hasOwnProperty("total"))
                if (!$util.isInteger(message.total))
                    return "total: integer expected";
            if (message.page != null && message.hasOwnProperty("page"))
                if (!$util.isInteger(message.page))
                    return "page: integer expected";
            if (message.pageSize != null && message.hasOwnProperty("pageSize"))
                if (!$util.isInteger(message.pageSize))
                    return "pageSize: integer expected";
            if (message.totalPage != null && message.hasOwnProperty("totalPage"))
                if (!$util.isInteger(message.totalPage))
                    return "totalPage: integer expected";
            return null;
        };

        /**
         * Creates a PaginationResponse message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof Common.PaginationResponse
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {Common.PaginationResponse} PaginationResponse
         */
        PaginationResponse.fromObject = function fromObject(object) {
            if (object instanceof $root.Common.PaginationResponse)
                return object;
            var message = new $root.Common.PaginationResponse();
            if (object.total != null)
                message.total = object.total | 0;
            if (object.page != null)
                message.page = object.page | 0;
            if (object.pageSize != null)
                message.pageSize = object.pageSize | 0;
            if (object.totalPage != null)
                message.totalPage = object.totalPage | 0;
            return message;
        };

        /**
         * Creates a plain object from a PaginationResponse message. Also converts values to other types if specified.
         * @function toObject
         * @memberof Common.PaginationResponse
         * @static
         * @param {Common.PaginationResponse} message PaginationResponse
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PaginationResponse.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.total = 0;
                object.page = 0;
                object.pageSize = 0;
                object.totalPage = 0;
            }
            if (message.total != null && message.hasOwnProperty("total"))
                object.total = message.total;
            if (message.page != null && message.hasOwnProperty("page"))
                object.page = message.page;
            if (message.pageSize != null && message.hasOwnProperty("pageSize"))
                object.pageSize = message.pageSize;
            if (message.totalPage != null && message.hasOwnProperty("totalPage"))
                object.totalPage = message.totalPage;
            return object;
        };

        /**
         * Converts this PaginationResponse to JSON.
         * @function toJSON
         * @memberof Common.PaginationResponse
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PaginationResponse.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PaginationResponse
         * @function getTypeUrl
         * @memberof Common.PaginationResponse
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PaginationResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/Common.PaginationResponse";
        };

        return PaginationResponse;
    })();

    return Common;
})();

$root.UserInfo = (function() {

    /**
     * Properties of a UserInfo.
     * @exports IUserInfo
     * @interface IUserInfo
     * @property {string|null} [id] UserInfo id
     * @property {string|null} [email] UserInfo email
     * @property {string|null} [nickname] UserInfo nickname
     * @property {string|null} [avatarUrl] UserInfo avatarUrl
     * @property {number|null} [state] UserInfo state
     * @property {number|Long|null} [updateTime] UserInfo updateTime
     */

    /**
     * Constructs a new UserInfo.
     * @exports UserInfo
     * @classdesc Represents a UserInfo.
     * @implements IUserInfo
     * @constructor
     * @param {IUserInfo=} [properties] Properties to set
     */
    function UserInfo(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * UserInfo id.
     * @member {string} id
     * @memberof UserInfo
     * @instance
     */
    UserInfo.prototype.id = "";

    /**
     * UserInfo email.
     * @member {string} email
     * @memberof UserInfo
     * @instance
     */
    UserInfo.prototype.email = "";

    /**
     * UserInfo nickname.
     * @member {string|null|undefined} nickname
     * @memberof UserInfo
     * @instance
     */
    UserInfo.prototype.nickname = null;

    /**
     * UserInfo avatarUrl.
     * @member {string|null|undefined} avatarUrl
     * @memberof UserInfo
     * @instance
     */
    UserInfo.prototype.avatarUrl = null;

    /**
     * UserInfo state.
     * @member {number} state
     * @memberof UserInfo
     * @instance
     */
    UserInfo.prototype.state = 0;

    /**
     * UserInfo updateTime.
     * @member {number|Long} updateTime
     * @memberof UserInfo
     * @instance
     */
    UserInfo.prototype.updateTime = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

    // OneOf field names bound to virtual getters and setters
    var $oneOfFields;

    // Virtual OneOf for proto3 optional field
    Object.defineProperty(UserInfo.prototype, "_nickname", {
        get: $util.oneOfGetter($oneOfFields = ["nickname"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    // Virtual OneOf for proto3 optional field
    Object.defineProperty(UserInfo.prototype, "_avatarUrl", {
        get: $util.oneOfGetter($oneOfFields = ["avatarUrl"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Creates a new UserInfo instance using the specified properties.
     * @function create
     * @memberof UserInfo
     * @static
     * @param {IUserInfo=} [properties] Properties to set
     * @returns {UserInfo} UserInfo instance
     */
    UserInfo.create = function create(properties) {
        return new UserInfo(properties);
    };

    /**
     * Encodes the specified UserInfo message. Does not implicitly {@link UserInfo.verify|verify} messages.
     * @function encode
     * @memberof UserInfo
     * @static
     * @param {IUserInfo} message UserInfo message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    UserInfo.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.id != null && Object.hasOwnProperty.call(message, "id"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
        if (message.email != null && Object.hasOwnProperty.call(message, "email"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.email);
        if (message.nickname != null && Object.hasOwnProperty.call(message, "nickname"))
            writer.uint32(/* id 3, wireType 2 =*/26).string(message.nickname);
        if (message.avatarUrl != null && Object.hasOwnProperty.call(message, "avatarUrl"))
            writer.uint32(/* id 4, wireType 2 =*/34).string(message.avatarUrl);
        if (message.state != null && Object.hasOwnProperty.call(message, "state"))
            writer.uint32(/* id 5, wireType 0 =*/40).int32(message.state);
        if (message.updateTime != null && Object.hasOwnProperty.call(message, "updateTime"))
            writer.uint32(/* id 6, wireType 0 =*/48).int64(message.updateTime);
        return writer;
    };

    /**
     * Encodes the specified UserInfo message, length delimited. Does not implicitly {@link UserInfo.verify|verify} messages.
     * @function encodeDelimited
     * @memberof UserInfo
     * @static
     * @param {IUserInfo} message UserInfo message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    UserInfo.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a UserInfo message from the specified reader or buffer.
     * @function decode
     * @memberof UserInfo
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {UserInfo} UserInfo
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    UserInfo.decode = function decode(reader, length, error) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.UserInfo();
        while (reader.pos < end) {
            var tag = reader.uint32();
            if (tag === error)
                break;
            switch (tag >>> 3) {
            case 1: {
                    message.id = reader.string();
                    break;
                }
            case 2: {
                    message.email = reader.string();
                    break;
                }
            case 3: {
                    message.nickname = reader.string();
                    break;
                }
            case 4: {
                    message.avatarUrl = reader.string();
                    break;
                }
            case 5: {
                    message.state = reader.int32();
                    break;
                }
            case 6: {
                    message.updateTime = reader.int64();
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
     * Decodes a UserInfo message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof UserInfo
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {UserInfo} UserInfo
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    UserInfo.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a UserInfo message.
     * @function verify
     * @memberof UserInfo
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    UserInfo.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        var properties = {};
        if (message.id != null && message.hasOwnProperty("id"))
            if (!$util.isString(message.id))
                return "id: string expected";
        if (message.email != null && message.hasOwnProperty("email"))
            if (!$util.isString(message.email))
                return "email: string expected";
        if (message.nickname != null && message.hasOwnProperty("nickname")) {
            properties._nickname = 1;
            if (!$util.isString(message.nickname))
                return "nickname: string expected";
        }
        if (message.avatarUrl != null && message.hasOwnProperty("avatarUrl")) {
            properties._avatarUrl = 1;
            if (!$util.isString(message.avatarUrl))
                return "avatarUrl: string expected";
        }
        if (message.state != null && message.hasOwnProperty("state"))
            if (!$util.isInteger(message.state))
                return "state: integer expected";
        if (message.updateTime != null && message.hasOwnProperty("updateTime"))
            if (!$util.isInteger(message.updateTime) && !(message.updateTime && $util.isInteger(message.updateTime.low) && $util.isInteger(message.updateTime.high)))
                return "updateTime: integer|Long expected";
        return null;
    };

    /**
     * Creates a UserInfo message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof UserInfo
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {UserInfo} UserInfo
     */
    UserInfo.fromObject = function fromObject(object) {
        if (object instanceof $root.UserInfo)
            return object;
        var message = new $root.UserInfo();
        if (object.id != null)
            message.id = String(object.id);
        if (object.email != null)
            message.email = String(object.email);
        if (object.nickname != null)
            message.nickname = String(object.nickname);
        if (object.avatarUrl != null)
            message.avatarUrl = String(object.avatarUrl);
        if (object.state != null)
            message.state = object.state | 0;
        if (object.updateTime != null)
            if ($util.Long)
                (message.updateTime = $util.Long.fromValue(object.updateTime)).unsigned = false;
            else if (typeof object.updateTime === "string")
                message.updateTime = parseInt(object.updateTime, 10);
            else if (typeof object.updateTime === "number")
                message.updateTime = object.updateTime;
            else if (typeof object.updateTime === "object")
                message.updateTime = new $util.LongBits(object.updateTime.low >>> 0, object.updateTime.high >>> 0).toNumber();
        return message;
    };

    /**
     * Creates a plain object from a UserInfo message. Also converts values to other types if specified.
     * @function toObject
     * @memberof UserInfo
     * @static
     * @param {UserInfo} message UserInfo
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    UserInfo.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.id = "";
            object.email = "";
            object.state = 0;
            if ($util.Long) {
                var long = new $util.Long(0, 0, false);
                object.updateTime = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
            } else
                object.updateTime = options.longs === String ? "0" : 0;
        }
        if (message.id != null && message.hasOwnProperty("id"))
            object.id = message.id;
        if (message.email != null && message.hasOwnProperty("email"))
            object.email = message.email;
        if (message.nickname != null && message.hasOwnProperty("nickname")) {
            object.nickname = message.nickname;
            if (options.oneofs)
                object._nickname = "nickname";
        }
        if (message.avatarUrl != null && message.hasOwnProperty("avatarUrl")) {
            object.avatarUrl = message.avatarUrl;
            if (options.oneofs)
                object._avatarUrl = "avatarUrl";
        }
        if (message.state != null && message.hasOwnProperty("state"))
            object.state = message.state;
        if (message.updateTime != null && message.hasOwnProperty("updateTime"))
            if (typeof message.updateTime === "number")
                object.updateTime = options.longs === String ? String(message.updateTime) : message.updateTime;
            else
                object.updateTime = options.longs === String ? $util.Long.prototype.toString.call(message.updateTime) : options.longs === Number ? new $util.LongBits(message.updateTime.low >>> 0, message.updateTime.high >>> 0).toNumber() : message.updateTime;
        return object;
    };

    /**
     * Converts this UserInfo to JSON.
     * @function toJSON
     * @memberof UserInfo
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    UserInfo.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for UserInfo
     * @function getTypeUrl
     * @memberof UserInfo
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    UserInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/UserInfo";
    };

    return UserInfo;
})();

$root.GetUserList = (function() {

    /**
     * Properties of a GetUserList.
     * @exports IGetUserList
     * @interface IGetUserList
     * @property {Common.IPaginationRequest|null} [pagination] GetUserList pagination
     * @property {string|null} [word] GetUserList word
     */

    /**
     * Constructs a new GetUserList.
     * @exports GetUserList
     * @classdesc Represents a GetUserList.
     * @implements IGetUserList
     * @constructor
     * @param {IGetUserList=} [properties] Properties to set
     */
    function GetUserList(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * GetUserList pagination.
     * @member {Common.IPaginationRequest|null|undefined} pagination
     * @memberof GetUserList
     * @instance
     */
    GetUserList.prototype.pagination = null;

    /**
     * GetUserList word.
     * @member {string} word
     * @memberof GetUserList
     * @instance
     */
    GetUserList.prototype.word = "";

    /**
     * Creates a new GetUserList instance using the specified properties.
     * @function create
     * @memberof GetUserList
     * @static
     * @param {IGetUserList=} [properties] Properties to set
     * @returns {GetUserList} GetUserList instance
     */
    GetUserList.create = function create(properties) {
        return new GetUserList(properties);
    };

    /**
     * Encodes the specified GetUserList message. Does not implicitly {@link GetUserList.verify|verify} messages.
     * @function encode
     * @memberof GetUserList
     * @static
     * @param {IGetUserList} message GetUserList message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    GetUserList.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.pagination != null && Object.hasOwnProperty.call(message, "pagination"))
            $root.Common.PaginationRequest.encode(message.pagination, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        if (message.word != null && Object.hasOwnProperty.call(message, "word"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.word);
        return writer;
    };

    /**
     * Encodes the specified GetUserList message, length delimited. Does not implicitly {@link GetUserList.verify|verify} messages.
     * @function encodeDelimited
     * @memberof GetUserList
     * @static
     * @param {IGetUserList} message GetUserList message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    GetUserList.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a GetUserList message from the specified reader or buffer.
     * @function decode
     * @memberof GetUserList
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {GetUserList} GetUserList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    GetUserList.decode = function decode(reader, length, error) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.GetUserList();
        while (reader.pos < end) {
            var tag = reader.uint32();
            if (tag === error)
                break;
            switch (tag >>> 3) {
            case 1: {
                    message.pagination = $root.Common.PaginationRequest.decode(reader, reader.uint32());
                    break;
                }
            case 2: {
                    message.word = reader.string();
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
     * Decodes a GetUserList message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof GetUserList
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {GetUserList} GetUserList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    GetUserList.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a GetUserList message.
     * @function verify
     * @memberof GetUserList
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    GetUserList.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.pagination != null && message.hasOwnProperty("pagination")) {
            var error = $root.Common.PaginationRequest.verify(message.pagination);
            if (error)
                return "pagination." + error;
        }
        if (message.word != null && message.hasOwnProperty("word"))
            if (!$util.isString(message.word))
                return "word: string expected";
        return null;
    };

    /**
     * Creates a GetUserList message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof GetUserList
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {GetUserList} GetUserList
     */
    GetUserList.fromObject = function fromObject(object) {
        if (object instanceof $root.GetUserList)
            return object;
        var message = new $root.GetUserList();
        if (object.pagination != null) {
            if (typeof object.pagination !== "object")
                throw TypeError(".GetUserList.pagination: object expected");
            message.pagination = $root.Common.PaginationRequest.fromObject(object.pagination);
        }
        if (object.word != null)
            message.word = String(object.word);
        return message;
    };

    /**
     * Creates a plain object from a GetUserList message. Also converts values to other types if specified.
     * @function toObject
     * @memberof GetUserList
     * @static
     * @param {GetUserList} message GetUserList
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    GetUserList.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.pagination = null;
            object.word = "";
        }
        if (message.pagination != null && message.hasOwnProperty("pagination"))
            object.pagination = $root.Common.PaginationRequest.toObject(message.pagination, options);
        if (message.word != null && message.hasOwnProperty("word"))
            object.word = message.word;
        return object;
    };

    /**
     * Converts this GetUserList to JSON.
     * @function toJSON
     * @memberof GetUserList
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    GetUserList.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for GetUserList
     * @function getTypeUrl
     * @memberof GetUserList
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    GetUserList.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/GetUserList";
    };

    return GetUserList;
})();

$root.GetUserListResponse = (function() {

    /**
     * Properties of a GetUserListResponse.
     * @exports IGetUserListResponse
     * @interface IGetUserListResponse
     * @property {Common.IPaginationResponse|null} [pagination] GetUserListResponse pagination
     * @property {Array.<IUserInfo>|null} [list] GetUserListResponse list
     */

    /**
     * Constructs a new GetUserListResponse.
     * @exports GetUserListResponse
     * @classdesc Represents a GetUserListResponse.
     * @implements IGetUserListResponse
     * @constructor
     * @param {IGetUserListResponse=} [properties] Properties to set
     */
    function GetUserListResponse(properties) {
        this.list = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * GetUserListResponse pagination.
     * @member {Common.IPaginationResponse|null|undefined} pagination
     * @memberof GetUserListResponse
     * @instance
     */
    GetUserListResponse.prototype.pagination = null;

    /**
     * GetUserListResponse list.
     * @member {Array.<IUserInfo>} list
     * @memberof GetUserListResponse
     * @instance
     */
    GetUserListResponse.prototype.list = $util.emptyArray;

    /**
     * Creates a new GetUserListResponse instance using the specified properties.
     * @function create
     * @memberof GetUserListResponse
     * @static
     * @param {IGetUserListResponse=} [properties] Properties to set
     * @returns {GetUserListResponse} GetUserListResponse instance
     */
    GetUserListResponse.create = function create(properties) {
        return new GetUserListResponse(properties);
    };

    /**
     * Encodes the specified GetUserListResponse message. Does not implicitly {@link GetUserListResponse.verify|verify} messages.
     * @function encode
     * @memberof GetUserListResponse
     * @static
     * @param {IGetUserListResponse} message GetUserListResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    GetUserListResponse.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.pagination != null && Object.hasOwnProperty.call(message, "pagination"))
            $root.Common.PaginationResponse.encode(message.pagination, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        if (message.list != null && message.list.length)
            for (var i = 0; i < message.list.length; ++i)
                $root.UserInfo.encode(message.list[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified GetUserListResponse message, length delimited. Does not implicitly {@link GetUserListResponse.verify|verify} messages.
     * @function encodeDelimited
     * @memberof GetUserListResponse
     * @static
     * @param {IGetUserListResponse} message GetUserListResponse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    GetUserListResponse.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a GetUserListResponse message from the specified reader or buffer.
     * @function decode
     * @memberof GetUserListResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {GetUserListResponse} GetUserListResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    GetUserListResponse.decode = function decode(reader, length, error) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.GetUserListResponse();
        while (reader.pos < end) {
            var tag = reader.uint32();
            if (tag === error)
                break;
            switch (tag >>> 3) {
            case 1: {
                    message.pagination = $root.Common.PaginationResponse.decode(reader, reader.uint32());
                    break;
                }
            case 2: {
                    if (!(message.list && message.list.length))
                        message.list = [];
                    message.list.push($root.UserInfo.decode(reader, reader.uint32()));
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
     * Decodes a GetUserListResponse message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof GetUserListResponse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {GetUserListResponse} GetUserListResponse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    GetUserListResponse.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a GetUserListResponse message.
     * @function verify
     * @memberof GetUserListResponse
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    GetUserListResponse.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.pagination != null && message.hasOwnProperty("pagination")) {
            var error = $root.Common.PaginationResponse.verify(message.pagination);
            if (error)
                return "pagination." + error;
        }
        if (message.list != null && message.hasOwnProperty("list")) {
            if (!Array.isArray(message.list))
                return "list: array expected";
            for (var i = 0; i < message.list.length; ++i) {
                var error = $root.UserInfo.verify(message.list[i]);
                if (error)
                    return "list." + error;
            }
        }
        return null;
    };

    /**
     * Creates a GetUserListResponse message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof GetUserListResponse
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {GetUserListResponse} GetUserListResponse
     */
    GetUserListResponse.fromObject = function fromObject(object) {
        if (object instanceof $root.GetUserListResponse)
            return object;
        var message = new $root.GetUserListResponse();
        if (object.pagination != null) {
            if (typeof object.pagination !== "object")
                throw TypeError(".GetUserListResponse.pagination: object expected");
            message.pagination = $root.Common.PaginationResponse.fromObject(object.pagination);
        }
        if (object.list) {
            if (!Array.isArray(object.list))
                throw TypeError(".GetUserListResponse.list: array expected");
            message.list = [];
            for (var i = 0; i < object.list.length; ++i) {
                if (typeof object.list[i] !== "object")
                    throw TypeError(".GetUserListResponse.list: object expected");
                message.list[i] = $root.UserInfo.fromObject(object.list[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a GetUserListResponse message. Also converts values to other types if specified.
     * @function toObject
     * @memberof GetUserListResponse
     * @static
     * @param {GetUserListResponse} message GetUserListResponse
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    GetUserListResponse.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults)
            object.list = [];
        if (options.defaults)
            object.pagination = null;
        if (message.pagination != null && message.hasOwnProperty("pagination"))
            object.pagination = $root.Common.PaginationResponse.toObject(message.pagination, options);
        if (message.list && message.list.length) {
            object.list = [];
            for (var j = 0; j < message.list.length; ++j)
                object.list[j] = $root.UserInfo.toObject(message.list[j], options);
        }
        return object;
    };

    /**
     * Converts this GetUserListResponse to JSON.
     * @function toJSON
     * @memberof GetUserListResponse
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    GetUserListResponse.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for GetUserListResponse
     * @function getTypeUrl
     * @memberof GetUserListResponse
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    GetUserListResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/GetUserListResponse";
    };

    return GetUserListResponse;
})();

module.exports = $root;
