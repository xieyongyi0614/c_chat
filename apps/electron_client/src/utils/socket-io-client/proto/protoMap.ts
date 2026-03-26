import { Result } from '.';

export const protoMap = {
  /** 正常Command返回 */
  201: Result,
  /** 无返回 */
  101: null,
};

export type ProtoMapKey = keyof typeof protoMap;

export const PROTO_MAP_KEY = {
  NULL: 101,
  RESULT: 201,
} as const;
