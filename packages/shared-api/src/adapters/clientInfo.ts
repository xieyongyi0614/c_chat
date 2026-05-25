/**
 * 客户端身份，用于拼 User-Agent。
 * 平台例：
 *   - electron: `{ name: app.getName(), version: app.getVersion(), platform: process.platform }`
 *   - web:      `{ name: 'c_chat-web', version: pkg.version, platform: 'browser' }`
 *   - rn:       `{ name: 'c_chat-rn', version: pkg.version, platform: Platform.OS }`
 */
export interface ClientInfo {
  name: string;
  version: string;
  platform: string;
}
