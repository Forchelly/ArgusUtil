/** 端口占用信息 */
export interface PortInfo {
  port: number;
  pid: number;
  process_name: string;
  protocol: string;
  local_address: string;
  state: string;
}

/** SSH 认证方式 */
export type AuthMethod =
  | { type: "password"; password: string }
  | { type: "keyfile"; path: string; passphrase: string | null }
  | { type: "agent" };

/** SSH 连接配置 */
export interface SshConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_method: AuthMethod;
  last_used: number | null;
}

/** Tab 页类型 */
export type TabId = "local" | "remote" | "settings";
