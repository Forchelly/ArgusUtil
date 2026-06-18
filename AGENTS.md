# ArgusUtil

Cross-platform port process manager built with Tauri v2 (Rust backend + React 19 frontend).

## Commands

```bash
# Dev (starts Vite on :1420 + Rust hot-reload)
npm run tauri dev

# Production build (tsc → vite build → cargo build)
npm run tauri build

# Frontend only (no Rust)
npm run dev          # Vite dev server on :1420
npm run build        # tsc + vite build → dist/

# Rust only (from src-tauri/)
cargo build
cargo clippy --all-targets --all-features -- -D warnings
```

## Validation order (mirrors CI)

1. `npx tsc --noEmit` — TypeScript strict mode (noUnusedLocals, noUnusedParameters)
2. `npx vite build` — frontend production build
3. `cargo clippy --all-targets --all-features -- -D warnings` — Rust lints (in `src-tauri/`)
4. `cargo build` — Rust compilation (in `src-tauri/`)

No ESLint or Prettier configured. Type checking and clippy are the only lint gates.

## Architecture

```
src/                    React frontend (TypeScript)
  components/           UI components (PortScanner, SshTerminal, SshManager, etc.)
  hooks/useInvoke.ts    Tauri invoke wrapper with loading/error state
  types/index.ts        Shared TS types matching Rust structs

src-tauri/              Rust backend
  src/lib.rs            Tauri command handlers + AppState (entry point for commands)
  src/port.rs           Local port scanning (netstat2) and process killing (sysinfo)
  src/ssh.rs            SSH session management (ssh2 crate, parking_lot::Mutex)
  src/config.rs         Config persistence (OS config dir, atomic writes)
  src/error.rs          Unified AppError enum (Into<String> for Tauri)
  tauri.conf.json       Tauri v2 config
  capabilities/         Tauri v2 permission capabilities
```

## Key patterns

- **Frontend → Rust**: All communication via `invoke()` from `@tauri-apps/api/core`. The `useInvoke` hook wraps this with loading/error state.
- **Rust commands**: All `#[tauri::command]` functions live in `lib.rs`. They return `Result<T, String>` (AppError implements `Into<String>`).
- **SSH sessions**: `SshManager` holds a `parking_lot::Mutex<HashMap<String, Session>>`. Lock is held during I/O (unavoidable — Session is not Clone).
- **Config storage**: SSH configs saved to OS config dir (`%APPDATA%/ArgusUtil/config.json` on Windows). Atomic write via tmp file + rename. Never commit config files (`.json.tmp` in .gitignore).
- **Types alignment**: `src/types/index.ts` must stay in sync with Rust structs in `src-tauri/src/ssh.rs` (SshConfig, AuthMethod) and `src-tauri/src/port.rs` (PortInfo).

## Gotchas

- Vite dev server runs on port **1420** (strict). HMR on **1421** when `TAURI_DEV_HOST` is set.
- `src-tauri/` is gitignored by Vite watch. Frontend rebuilds don't trigger Rust recompilation.
- `tsconfig.json` has `noEmit: true` — `tsc` is only for type checking, not compilation.
- The `npm run tauri` command delegates to `@tauri-apps/cli` — use it as the single entry point for Tauri operations.
- No test suite exists. CI validates via type checking + clippy + build only.
- UI language is Chinese (zh-CN). Component labels and error messages are in Chinese.
