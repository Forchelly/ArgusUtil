mod config;
mod error;
mod port;
mod ssh;

use ssh::SshManager;

/// 应用全局状态
///
/// `SshManager` 内部已使用 `parking_lot::Mutex` 保护会话表，
/// 外层无需再包 `Mutex`。
pub struct AppState {
    pub ssh_manager: SshManager,
}

// ==================== 本地端口命令 ====================

#[tauri::command]
fn scan_port(port: u16) -> Result<Vec<port::PortInfo>, String> {
    port::scan_port(port).map_err(|e| e.to_string())
}

#[tauri::command]
fn scan_port_range(start: u16, end: u16) -> Result<Vec<port::PortInfo>, String> {
    port::scan_port_range(start, end).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_listening_ports() -> Result<Vec<port::PortInfo>, String> {
    port::list_listening_ports().map_err(|e| e.to_string())
}

#[tauri::command]
fn kill_process(pid: u32) -> Result<(), String> {
    port::kill_process(pid).map_err(|e| e.to_string())
}

// ==================== SSH 连接命令 ====================

#[tauri::command]
fn ssh_connect(state: tauri::State<'_, AppState>, config: ssh::SshConfig) -> Result<(), String> {
    state.ssh_manager.connect(&config).map_err(|e| e.to_string())?;

    // 更新 last_used 时间戳（非关键操作，仅记录日志）
    let mut conn = config;
    conn.last_used = Some(chrono::Utc::now().timestamp());
    if let Err(e) = config::update_ssh_connection(conn) {
        log::warn!("更新 last_used 失败: {e}");
    }

    Ok(())
}

#[tauri::command]
fn ssh_execute(
    state: tauri::State<'_, AppState>,
    session_id: String,
    command: String,
) -> Result<String, String> {
    let (stdout, _stderr) = state
        .ssh_manager
        .execute(&session_id, &command)
        .map_err(|e| e.to_string())?;
    Ok(stdout)
}

#[tauri::command]
fn ssh_scan_port(
    state: tauri::State<'_, AppState>,
    session_id: String,
    port: u16,
) -> Result<Vec<port::PortInfo>, String> {
    state
        .ssh_manager
        .scan_remote_port(&session_id, port)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn ssh_kill_process(
    state: tauri::State<'_, AppState>,
    session_id: String,
    pid: u32,
) -> Result<(), String> {
    state
        .ssh_manager
        .kill_remote_process(&session_id, pid)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn ssh_disconnect(state: tauri::State<'_, AppState>, session_id: String) -> Result<(), String> {
    state.ssh_manager.disconnect(&session_id);
    Ok(())
}

// ==================== 配置管理命令 ====================

#[tauri::command]
fn load_ssh_configs() -> Result<Vec<ssh::SshConfig>, String> {
    config::get_ssh_configs().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_ssh_config(conn: ssh::SshConfig) -> Result<(), String> {
    config::add_ssh_connection(conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_ssh_config(conn: ssh::SshConfig) -> Result<(), String> {
    config::update_ssh_connection(conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_ssh_config(id: String) -> Result<(), String> {
    config::remove_ssh_connection(&id).map_err(|e| e.to_string())
}

// ==================== 应用入口 ====================

pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .manage(AppState {
            ssh_manager: SshManager::new(),
        })
        .invoke_handler(tauri::generate_handler![
            scan_port,
            scan_port_range,
            list_listening_ports,
            kill_process,
            ssh_connect,
            ssh_execute,
            ssh_scan_port,
            ssh_kill_process,
            ssh_disconnect,
            load_ssh_configs,
            save_ssh_config,
            update_ssh_config,
            delete_ssh_config,
        ])
        .run(tauri::generate_context!())
        .expect("ArgusUtil 启动失败");
}
