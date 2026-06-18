/**
 * 从 Tauri invoke 错误中提取可读的错误信息
 */
export function extractError(err: unknown): string {
  return typeof err === "string" ? err : String(err);
}

/**
 * 确认危险操作（结束进程等不可逆操作）
 */
export function confirmDangerous(message: string): boolean {
  return window.confirm(message);
}
