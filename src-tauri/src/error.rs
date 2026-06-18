use serde::Serialize;
use thiserror::Error;

/// 统一应用错误类型
#[derive(Error, Debug, Serialize)]
pub enum AppError {
    #[error("端口扫描失败: {0}")]
    PortScan(String),

    #[error("进程操作失败: {0}")]
    Process(String),

    #[error("SSH 连接失败: {0}")]
    SshConnection(String),

    #[error("SSH 命令执行失败: {0}")]
    SshCommand(String),

    #[error("配置读写失败: {0}")]
    Config(String),

    #[error("权限不足: {0}")]
    Permission(String),

    #[error("会话不存在: {0}")]
    SessionNotFound(String),
}

// Tauri commands 要求错误类型实现 Into<String>
impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}
