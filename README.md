# ArgusUtil

**[English](README_EN.md)** | 中文

跨平台端口进程管理工具 — 根据端口号查找占用进程，一键结束。

支持 Windows、macOS、Linux 三大平台，同时管理本地和远程服务器。

## 功能

**本地端口管理**

输入端口号即可查询占用该端口的进程，显示 PID、进程名、协议类型（TCP/UDP）和连接状态。支持单端口查询、端口范围扫描、以及一键列出所有监听端口。选中进程后可一键终止，操作前需二次确认。

**SSH 远程管理**

通过 SSH 连接远程服务器，在本地界面直接管理远程端口和进程。支持密码认证、私钥文件认证、以及 SSH Agent 认证三种方式。常用服务器配置可保存，下次直接选择连接。

**连接配置管理**

集中管理所有 SSH 服务器连接信息，支持新增、编辑、删除。连接配置持久化存储在本地，应用重启后自动加载。

## 安装

从 [Releases](../../releases) 页面下载对应平台的安装包：

| 平台 | 架构 | 安装包 |
|------|------|--------|
| Windows | x64 | `ArgusUtil_*_x64-setup.exe` |
| Windows | ARM64 | `ArgusUtil_*_arm64-setup.exe` |
| macOS | Intel | `ArgusUtil_*_x64.dmg` |
| macOS | Apple Silicon | `ArgusUtil_*_aarch64.dmg` |
| Linux | x64 | `ArgusUtil_*_amd64.deb` 或 `.AppImage` |
| Linux | ARM64 | `ArgusUtil_*_arm64.deb` 或 `.AppImage` |

> macOS 未签名版本首次打开时，右键点击应用 → 选择「打开」即可。

## 使用

1. 启动应用后，在「本地端口」页输入端口号，点击「开始扫描」
2. 扫描结果以表格形式展示，点击「结束进程」可终止占用该端口的程序
3. 切换到「远程 SSH」页，选择已配置的服务器，连接后即可远程管理端口
4. 在「连接管理」页可以添加、编辑、删除 SSH 服务器配置

## 技术栈

- **后端**：Rust + [Tauri v2](https://tauri.app)
- **前端**：React 19 + TypeScript + Tailwind CSS
- **端口扫描**：[netstat2](https://crates.io/crates/netstat2)（跨平台网络连接查询）
- **SSH 连接**：[ssh2](https://crates.io/crates/ssh2)（libssh2 绑定）
- **进程管理**：[sysinfo](https://crates.io/crates/sysinfo)

## 开发

```bash
git clone https://github.com/你的用户名/ArgusUtil.git
cd ArgusUtil
npm install
npm run tauri dev          # 启动开发模式（热重载）
npm run tauri build        # 生产打包
```

## 许可证

[MIT](LICENSE)
