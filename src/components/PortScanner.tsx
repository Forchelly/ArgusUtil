import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Search, XCircle } from "lucide-react";
import type { PortInfo } from "../types";
import { extractError } from "../utils";
import ProcessList from "./ProcessList";

/** 本地端口扫描组件 */
export default function PortScanner() {
  const [portInput, setPortInput] = useState("");
  const [results, setResults] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<"single" | "range" | "all">("single");
  const [rangeEnd, setRangeEnd] = useState("");

  const handleScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: PortInfo[];
      if (scanMode === "all") {
        data = await invoke<PortInfo[]>("list_listening_ports");
      } else if (scanMode === "range") {
        const start = parseInt(portInput, 10);
        const end = parseInt(rangeEnd, 10);
        if (isNaN(start) || isNaN(end)) {
          setError("请输入有效的端口号");
          return;
        }
        data = await invoke<PortInfo[]>("scan_port_range", { start, end });
      } else {
        const port = parseInt(portInput, 10);
        if (isNaN(port)) {
          setError("请输入有效的端口号");
          return;
        }
        data = await invoke<PortInfo[]>("scan_port", { port });
      }
      setResults(data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [portInput, rangeEnd, scanMode]);

  return (
    <div className="space-y-6">
      {/* 扫描控制区 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Search size={20} />
          端口扫描
        </h2>

        {/* 扫描模式切换 */}
        <div className="flex gap-2 mb-4">
          {(
            [
              { key: "single", label: "单端口" },
              { key: "range", label: "端口范围" },
              { key: "all", label: "全部监听" },
            ] as const
          ).map((mode) => (
            <button
              key={mode.key}
              onClick={() => setScanMode(mode.key)}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${
                  scanMode === mode.key
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }
              `}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* 输入区 */}
        <div className="flex items-center gap-3">
          {scanMode !== "all" && (
            <>
              <input
                type="number"
                placeholder={scanMode === "single" ? "端口号 (如 8080)" : "起始端口"}
                value={portInput}
                onChange={(e) => setPortInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                className="w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              {scanMode === "range" && (
                <>
                  <span className="text-gray-400">—</span>
                  <input
                    type="number"
                    placeholder="结束端口"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    className="w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </>
              )}
            </>
          )}
          <button
            onClick={handleScan}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            {loading ? "扫描中..." : "开始扫描"}
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mt-3 px-4 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
            <XCircle size={16} />
            {error}
          </div>
        )}
      </div>

      {/* 结果列表 */}
      <ProcessList
        ports={results}
        loading={loading}
        onKill={async (pid) => {
          try {
            await invoke("kill_process", { pid });
            await handleScan();
          } catch (err) {
            setError(extractError(err));
          }
        }}
      />
    </div>
  );
}
