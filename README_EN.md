# ArgusUtil

English | **[中文](README.md)**

A cross-platform port process manager — find and kill processes by port number.

Supports Windows, macOS, and Linux. Manage both local and remote servers via SSH.

## Features

**Local Port Management**

Enter a port number to find which process is using it. Results show PID, process name, protocol (TCP/UDP), and connection state. Supports single port lookup, port range scanning, and listing all listening ports at once. Selected processes can be terminated with one click, with a confirmation prompt before execution.

**SSH Remote Management**

Connect to remote servers via SSH and manage their ports and processes from the same interface. Supports password authentication, private key file authentication, and SSH Agent authentication. Frequently used server configurations can be saved for quick reconnection.

**Connection Configuration**

Manage all SSH server connections in one place — create, edit, and delete. Configurations are persisted locally and automatically loaded on application restart.

## Installation

Download the installer for your platform from the [Releases](../../releases) page:

| Platform | Architecture | Package |
|----------|-------------|---------|
| Windows | x64 | `ArgusUtil_*_x64-setup.exe` |
| Windows | ARM64 | `ArgusUtil_*_arm64-setup.exe` |
| macOS | Intel | `ArgusUtil_*_x64.dmg` |
| macOS | Apple Silicon | `ArgusUtil_*_aarch64.dmg` |
| Linux | x64 | `ArgusUtil_*_amd64.deb` or `.AppImage` |
| Linux | ARM64 | `ArgusUtil_*_arm64.deb` or `.AppImage` |

> On macOS, if the app is unsigned, right-click it and select "Open" to launch it for the first time.

## Usage

1. Launch the app and go to the **Local Ports** tab. Enter a port number and click **Scan**.
2. Results are displayed in a table. Click **Kill Process** to terminate the process using that port.
3. Switch to the **Remote SSH** tab, select a saved server, and connect to manage remote ports.
4. Use the **Connection Manager** tab to add, edit, or delete SSH server configurations.

## Tech Stack

- **Backend**: Rust + [Tauri v2](https://tauri.app)
- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Port Scanning**: [netstat2](https://crates.io/crates/netstat2) (cross-platform network connection query)
- **SSH**: [ssh2](https://crates.io/crates/ssh2) (libssh2 bindings)
- **Process Management**: [sysinfo](https://crates.io/crates/sysinfo)

## Development

```bash
git clone https://github.com/your-username/ArgusUtil.git
cd ArgusUtil
npm install
npm run tauri dev          # Start dev mode (hot reload)
npm run tauri build        # Production build
```

## License

[MIT](LICENSE)
