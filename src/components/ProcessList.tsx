import type { PortInfo } from "../types";
import { confirmDangerous } from "../utils";

interface ProcessListProps {
  ports: PortInfo[];
  loading: boolean;
  onKill: (pid: number) => void;
}

/** 状态标签颜色映射 */
function stateColor(state: string): string {
  switch (state.toUpperCase()) {
    case "LISTEN":
      return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
    case "ESTABLISHED":
    case "ESTAB":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
    case "TIME_WAIT":
    case "TIME-WAIT":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400";
    case "CLOSE_WAIT":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  }
}

/** 进程列表 / 端口结果表格 */
export default function ProcessList({ ports, loading, onKill }: ProcessListProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm">正在扫描...</p>
      </div>
    );
  }

  if (ports.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500 text-sm">
        暂无结果，请先扫描端口
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          扫描结果：共 {ports.length} 条
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-750 text-left text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-3 font-medium">端口</th>
              <th className="px-6 py-3 font-medium">PID</th>
              <th className="px-6 py-3 font-medium">进程名</th>
              <th className="px-6 py-3 font-medium">协议</th>
              <th className="px-6 py-3 font-medium">本地地址</th>
              <th className="px-6 py-3 font-medium">状态</th>
              <th className="px-6 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {ports.map((p, idx) => (
              <tr
                key={`${p.port}-${p.pid}-${idx}`}
                className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <td className="px-6 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {p.port}
                </td>
                <td className="px-6 py-3 font-mono text-gray-700 dark:text-gray-300">
                  {p.pid || "—"}
                </td>
                <td className="px-6 py-3 text-gray-800 dark:text-gray-200">
                  {p.process_name}
                </td>
                <td className="px-6 py-3">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {p.protocol}
                  </span>
                </td>
                <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                  {p.local_address}
                </td>
                <td className="px-6 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${stateColor(p.state)}`}>
                    {p.state}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  {p.pid > 0 && (
                    <button
                      onClick={() => {
                        if (confirmDangerous(`确定要结束进程 ${p.process_name} (PID=${p.pid}) 吗？此操作不可撤销。`)) {
                          onKill(p.pid);
                        }
                      }}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs font-medium transition-colors shadow-sm"
                    >
                      结束进程
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
