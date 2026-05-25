export const AudioRecordErrorCode = {
  /** 权限被拒绝 */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  /** 设备不存在 */
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  /** 设备被占用 */
  DEVICE_IN_USE: 'DEVICE_IN_USE',
  /** 不支持录音 */
  NOT_SUPPORTED: 'NOT_SUPPORTED',
  /** 录音开始失败 */
  START_FAILED: 'START_FAILED',
  /** 未知错误 */
  UNKNOWN: 'UNKNOWN',
} as const;
export type AudioRecordErrorCodeTypes =
  (typeof AudioRecordErrorCode)[keyof typeof AudioRecordErrorCode];

export class AudioRecordError extends Error {
  code: AudioRecordErrorCodeTypes;

  constructor(code: AudioRecordErrorCodeTypes, message: string) {
    super(message);

    this.code = code;
  }
}
