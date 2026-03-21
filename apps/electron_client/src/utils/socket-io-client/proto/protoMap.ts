import { Result } from '.';

export const protoMap = {
  201: Result,
  101: null,
};

export type ProtoMapKey = keyof typeof protoMap;
