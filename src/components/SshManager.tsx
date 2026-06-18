import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Settings, Key, KeyRound, Bot, XCircle, Radio, Server } from "lucide-react";
import type { SshConfig, AuthMethod } from "../types";
import { extractError } from "../utils";
import ConnectionDialog from "./ConnectionDialog";

/** SSH 连接管理组件 */
export default function SshManager() {
  const [configs, setConfigs] = useState<SshConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SshConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke<SshConfig[]>("load_ssh_configs");
      setConfigs(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleSave = async (config: SshConfig) => {
    try {
      if (editing) {
        await invoke("update_ssh_config", { conn: config });
      } else {
        await invoke("save_ssh_config", { conn: config });
      }
      setDialogOpen(false);
      setEditing(null);
      loadConfigs();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke("delete_ssh_config", { id });
      loadConfigs();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const authLabel = (method: AuthMethod): React.ReactNode => {
    switch (method.type) {
      case "password":
        return <span className="flex items-center gap-1"><Key size={12} /> 密码</span>;
      case "keyfile":
        return <span className="flex items-center gap-1"><KeyRound size={12} /> 私钥</span>;
      case "agent":
        return <span className="flex items-center gap-1"><Bot size={12} /> SSH Agent</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Settings size={20} />
            SSH 连接管理
          </h2>
          <button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            + 新建连接
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
            <XCircle size={16} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : configs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <Radio size={48} className="mx-auto mb-3 opacity-40" />
            <p>暂无 SSH 连接配置</p>
            <p className="text-xs mt-1">点击「新建连接」添加服务器</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {configs.map((cfg) => (
              <div
                key={cfg.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <Server size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {cfg.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {cfg.username}@{cfg.host}:{cfg.port}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 flex items-center">{authLabel(cfg.auth_method)}</span>
                  <button
                    onClick={() => {
                      setEditing(cfg);
                      setDialogOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(cfg.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 连接配置对话框 */}
      {dialogOpen && (
        <ConnectionDialog
          initial={editing}
          onSave={handleSave}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
