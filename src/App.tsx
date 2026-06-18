import { useState } from "react";
import type { TabId } from "./types";
import { Zap, Monitor, Link, Settings } from "lucide-react";
import PortScanner from "./components/PortScanner";
import SshTerminal from "./components/SshTerminal";
import SshManager from "./components/SshManager";

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "local", label: "本地端口", icon: <Monitor size={16} /> },
  { id: "remote", label: "远程 SSH", icon: <Link size={16} /> },
  { id: "settings", label: "连接管理", icon: <Settings size={16} /> },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("local");

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* 顶部标题栏 */}
      <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Zap size={22} />
            ArgusUtil
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            端口进程管理
          </span>
        </div>
        {/* Tab 导航 */}
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-1.5
                ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* 内容区 */}
      <main className="flex-1 overflow-auto p-6">
        {activeTab === "local" && <PortScanner />}
        {activeTab === "remote" && <SshTerminal />}
        {activeTab === "settings" && <SshManager />}
      </main>
    </div>
  );
}
