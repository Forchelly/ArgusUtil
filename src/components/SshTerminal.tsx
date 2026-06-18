import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Link, Lightbulb, CheckCircle2, XCircle, Search, ClipboardList } from "lucide-react";
import type { SshConfig, PortInfo } from "../types";
import { extractError } from "../utils";
import ProcessList from "./ProcessList";

/** SSH 远程端口操作组件 */
export default function SshTerminal() {
  const [configs, setConfigs] = useState<SshConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [portInput, setPortInput] = useState("");
  const [results, setResults] = useState<PortInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  // 加载已保存的 SSH 配置
  useEffect(() => {
    invoke<SshConfig[]>("load_ssh_configs")
      .then(setConfigs)
      .catch(() => {});
  }, []);

  const appendLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // 连接远程服务器
  const handleConnect = async () => {
    const cfg = configs.find((c) => c.id === selectedId);
    if (!cfg) return;

    setConnecting(true);
    setError(null);
    try {
      await invoke("ssh_connect", { config: cfg });
      setConnected(true);
      appendLog(`已连接: ${cfg.username}@${cfg.host}:${cfg.port}`);
    } catch (err) {
      const msg = extractError(err);
      setError(msg);
      appendLog(`连接失败: ${msg}`);
    } finally {
      setConnecting(false);
    }
  };

  // 断开连接
  const handleDisconnect = async () => {
    try {
      await invoke("ssh_disconnect", { sessionId: selectedId });
    } catch {
      // ignore
    }
    setConnected(false);
    setResults([]);
    appendLog("已断开连接");
  };

  // 扫描远程端口
  const handleScan = async () => {
    const port = parseInt(portInput, 10);
    if (isNaN(port)) {
      setError("请输入有效的端口号");
      return;
    }

    setScanning(true);
    setError(null);
    try {
      const data = await invoke<PortInfo[]>("ssh_scan_port", {
        sessionId: selectedId,
        port,
      });
      setResults(data);
      appendLog(`扫描端口 ${port}，找到 ${data.length} 条结果`);
    } catch (err) {
      const msg = extractError(err);
      setError(msg);
      appendLog(`扫描失败: ${msg}`);
    } finally {
      setScanning(false);
    }
  };

  // 结束远程进程
  const handleKill = async (pid: number) => {
    try {
      await invoke("ssh_kill_process", { sessionId: selectedId, pid });
      appendLog(`已结束远程进程 PID=${pid}`);
      await handleScan();
    } catch (err) {
      const msg = extractError(err);
      setError(msg);
      appendLog(`结束进程失败: ${msg}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* 连接控制区 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Link size={20} />
          远程 SSH 连接
        </h2>

        <div className="flex items-center gap-3">
          <select
            value={selectedId}
            onChange={(e) => {
              // 切换服务器前先断开旧连接，防止后端 Session 泄漏
              if (connected && selectedId) {
                invoke("ssh_disconnect", { sessionId: selectedId }).catch(() => {});
                appendLog("已断开旧连接");
              }
              setSelectedId(e.target.value);
              setConnected(false);
              setResults([]);
            }}
            disabled={connected}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
          >
            <option value="">-- 选择服务器 --</option>
            {configs.map((cfg) => (
              <option key={cfg.id} value={cfg.id}>
                {cfg.name} ({cfg.username}@{cfg.host}:{cfg.port})
              </option>
            ))}
          </select>

          {!connected ? (
            <button
              onClick={handleConnect}
              disabled={!selectedId || connecting}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {connecting ? "连接中..." : "连接"}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              断开
            </button>
          )}
        </div>

        {configs.length === 0 && (
          <p className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
            <Lightbulb size={12} />
            请先在「连接管理」页面添加 SSH 服务器配置
          </p>
        )}

        {connected && (
          <div className="mt-3 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-xs flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            已连接到 {configs.find((c) => c.id === selectedId)?.host}
          </div>
        )}

        {error && (
          <div className="mt-3 px-4 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
            <XCircle size={16} />
            {error}
          </div>
        )}
      </div>

      {/* 端口扫描区 */}
      {connected && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold mb-3 text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Search size={18} />
            远程端口扫描
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="端口号 (如 80)"
              value={portInput}
              onChange={(e) => setPortInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              className="w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              onClick={handleScan}
              disabled={scanning}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {scanning ? "扫描中..." : "扫描"}
            </button>
          </div>

          <div className="mt-4">
            <ProcessList ports={results} loading={scanning} onKill={handleKill} />
          </div>
        </div>
      )}

      {/* 操作日志 */}
      {log.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold mb-3 text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ClipboardList size={18} />
            操作日志
          </h3>
          <div className="bg-gray-900 rounded-lg p-4 max-h-48 overflow-y-auto">
            {log.map((line, i) => (
              <div key={i} className="text-xs font-mono text-green-400 leading-relaxed">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
