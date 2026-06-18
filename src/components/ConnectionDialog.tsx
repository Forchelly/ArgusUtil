import { useState } from "react";
import { Key, KeyRound, Bot, Lightbulb } from "lucide-react";
import type { SshConfig, AuthMethod } from "../types";

interface ConnectionDialogProps {
  initial: SshConfig | null;
  onSave: (config: SshConfig) => void;
  onClose: () => void;
}

/** SSH 连接配置对话框 */
export default function ConnectionDialog({ initial, onSave, onClose }: ConnectionDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [host, setHost] = useState(initial?.host ?? "");
  const [port, setPort] = useState(String(initial?.port ?? 22));
  const [username, setUsername] = useState(initial?.username ?? "");
  const [authType, setAuthType] = useState<AuthMethod["type"]>(
    initial?.auth_method.type ?? "password",
  );
  const [password, setPassword] = useState(
    initial?.auth_method.type === "password" ? initial.auth_method.password : "",
  );
  const [keyPath, setKeyPath] = useState(
    initial?.auth_method.type === "keyfile" ? initial.auth_method.path : "",
  );
  const [passphrase, setPassphrase] = useState(
    initial?.auth_method.type === "keyfile" ? (initial.auth_method.passphrase ?? "") : "",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let auth_method: AuthMethod;
    switch (authType) {
      case "password":
        auth_method = { type: "password", password };
        break;
      case "keyfile":
        auth_method = { type: "keyfile", path: keyPath, passphrase: passphrase || null };
        break;
      case "agent":
        auth_method = { type: "agent" };
        break;
    }

    const config: SshConfig = {
      id: initial?.id ?? crypto.randomUUID(),
      name,
      host,
      port: parseInt(port, 10) || 22,
      username,
      auth_method,
      last_used: initial?.last_used ?? null,
    };

    onSave(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {initial ? "编辑连接" : "新建 SSH 连接"}
          </h3>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 连接名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              连接名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：生产服务器"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* 主机 & 端口 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                主机地址
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.100"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                端口
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* 用户名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="root"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* 认证方式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              认证方式
            </label>
            <div className="flex gap-2">
              {(
                [
                  { key: "password", label: "密码", icon: <Key size={14} /> },
                  { key: "keyfile", label: "私钥", icon: <KeyRound size={14} /> },
                  { key: "agent", label: "Agent", icon: <Bot size={14} /> },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setAuthType(opt.key)}
                  className={`
                    flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center justify-center gap-1.5
                    ${
                      authType === opt.key
                        ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }
                  `}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 认证详情 */}
          {authType === "password" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          )}

          {authType === "keyfile" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  私钥路径
                </label>
                <input
                  type="text"
                  value={keyPath}
                  onChange={(e) => setKeyPath(e.target.value)}
                  placeholder="~/.ssh/id_rsa"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  密码短语（可选）
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="无私钥密码可留空"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </>
          )}

          {authType === "agent" && (
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3 flex items-start gap-2">
              <Lightbulb size={14} className="mt-0.5 flex-shrink-0" />
              <span>将使用系统 SSH Agent 进行认证，请确保已加载密钥（ssh-add）</span>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              {initial ? "保存修改" : "创建连接"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
