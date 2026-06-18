use crate::error::AppError;
use crate::ssh::SshConfig;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// 应用配置
#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub ssh_connections: Vec<SshConfig>,
}

/// 获取配置文件路径
///
/// - Windows: %APPDATA%/ArgusUtil/config.json
/// - macOS: ~/Library/Application Support/ArgusUtil/config.json
/// - Linux: ~/.config/ArgusUtil/config.json
fn config_path() -> Result<PathBuf, AppError> {
    let base = dirs::config_dir().ok_or_else(|| AppError::Config("无法获取系统配置目录".into()))?;
    let dir = base.join("ArgusUtil");
    fs::create_dir_all(&dir).map_err(|e| AppError::Config(format!("创建配置目录失败: {e}")))?;
    Ok(dir.join("config.json"))
}

/// 加载配置
pub fn load_config() -> Result<AppConfig, AppError> {
    let path = config_path()?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| AppError::Config(format!("读取配置文件失败: {e}")))?;
    serde_json::from_str(&content)
        .map_err(|e| AppError::Config(format!("解析配置文件失败: {e}")))
}

/// 保存配置（原子写入：先写临时文件，再 rename，防止中途崩溃导致配置损坏）
pub fn save_config(config: &AppConfig) -> Result<(), AppError> {
    let path = config_path()?;
    let tmp_path = path.with_extension("json.tmp");
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| AppError::Config(format!("序列化配置失败: {e}")))?;
    fs::write(&tmp_path, content)
        .map_err(|e| AppError::Config(format!("写入临时配置文件失败: {e}")))?;
    fs::rename(&tmp_path, &path)
        .map_err(|e| AppError::Config(format!("替换配置文件失败: {e}")))?;
    Ok(())
}

/// 添加 SSH 连接配置
pub fn add_ssh_connection(conn: SshConfig) -> Result<(), AppError> {
    let mut config = load_config()?;
    config.ssh_connections.push(conn);
    save_config(&config)
}

/// 删除 SSH 连接配置
pub fn remove_ssh_connection(id: &str) -> Result<(), AppError> {
    let mut config = load_config()?;
    config.ssh_connections.retain(|c| c.id != id);
    save_config(&config)
}

/// 更新 SSH 连接配置
pub fn update_ssh_connection(conn: SshConfig) -> Result<(), AppError> {
    let mut config = load_config()?;
    if let Some(existing) = config.ssh_connections.iter_mut().find(|c| c.id == conn.id) {
        *existing = conn;
    } else {
        return Err(AppError::Config(format!("未找到连接 ID={}", conn.id)));
    }
    save_config(&config)
}

/// 获取所有 SSH 连接配置（不包含敏感信息的副本）
pub fn get_ssh_configs() -> Result<Vec<SshConfig>, AppError> {
    let config = load_config()?;
    Ok(config.ssh_connections)
}
