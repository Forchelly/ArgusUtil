use crate::error::AppError;
use crate::port::PortInfo;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use ssh2::Session;
use std::collections::HashMap;
use std::io::Read;
use std::net::TcpStream;
use std::time::Duration;

/// SSH 认证方式
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AuthMethod {
    #[serde(rename = "password")]
    Password { password: String },
    #[serde(rename = "keyfile")]
    KeyFile {
        path: String,
        passphrase: Option<String>,
    },
    #[serde(rename = "agent")]
    SshAgent,
}

/// SSH 连接配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    #[serde(default = "default_port")]
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    pub last_used: Option<i64>,
}

fn default_port() -> u16 {
    22
}

/// SSH 会话管理器
///
/// 内部使用 `parking_lot::Mutex`（无中毒概念）保护会话表。
/// 注意：SSH I/O 操作期间会持有锁，这是 `Session` 不可 Clone 的必然结果。
pub struct SshManager {
    sessions: Mutex<HashMap<String, Session>>,
}

impl SshManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    /// 建立 SSH 连接
    pub fn connect(&self, config: &SshConfig) -> Result<(), AppError> {
        // 网络 I/O 在锁外完成，只在插入时持锁
        let session = Self::establish_session(config)?;

        log::info!("SSH 连接成功: {}@{}", config.username, config.host);

        let mut sessions = self.sessions.lock();
        sessions.insert(config.id.clone(), session);
        Ok(())
    }

    /// 在远程执行命令，返回 (stdout, stderr)
    ///
    /// 仅限 crate 内部调用，防止外部传入未校验的命令字符串。
    pub(crate) fn execute(&self, session_id: &str, command: &str) -> Result<(String, String), AppError> {
        let sessions = self.sessions.lock();
        let session = sessions
            .get(session_id)
            .ok_or_else(|| AppError::SessionNotFound(session_id.into()))?;

        let mut channel = session
            .channel_session()
            .map_err(|e| AppError::SshCommand(format!("打开通道失败: {e}")))?;

        channel
            .exec(command)
            .map_err(|e| AppError::SshCommand(format!("执行命令失败: {e}")))?;

        let mut stdout = String::new();
        channel
            .read_to_string(&mut stdout)
            .map_err(|e| AppError::SshCommand(format!("读取 stdout 失败: {e}")))?;

        // 读取 stderr
        let mut stderr = String::new();
        channel
            .stderr()
            .read_to_string(&mut stderr)
            .map_err(|e| AppError::SshCommand(format!("读取 stderr 失败: {e}")))?;

        channel
            .wait_close()
            .map_err(|e| AppError::SshCommand(format!("关闭通道失败: {e}")))?;

        let exit_status = channel
            .exit_status()
            .map_err(|e| AppError::SshCommand(format!("获取退出码失败: {e}")))?;

        if exit_status != 0 {
            log::warn!("远程命令退出码 {exit_status}: {command}");
        }

        Ok((stdout, stderr))
    }

    /// 扫描远程端口（解析 ss 或 netstat 输出）
    pub fn scan_remote_port(&self, session_id: &str, port: u16) -> Result<Vec<PortInfo>, AppError> {
        let (stdout, _) = self.execute(
            session_id,
            &format!("ss -tlnp sport = :{port} 2>/dev/null || netstat -tlnp 2>/dev/null | grep :{port}"),
        )?;

        parse_port_output(&stdout, port)
    }

    /// 结束远程进程
    pub fn kill_remote_process(&self, session_id: &str, pid: u32) -> Result<(), AppError> {
        let (stdout, stderr) = self.execute(session_id, &format!("kill -9 {pid}"))?;
        let combined = format!("{stdout}{stderr}");
        if combined.contains("No such process") || combined.contains("Operation not permitted") {
            Err(AppError::Process(format!(
                "无法结束远程进程 PID={pid}: {combined}"
            )))
        } else {
            log::info!("成功结束远程进程 PID={pid}");
            Ok(())
        }
    }

    /// 断开连接
    pub fn disconnect(&self, session_id: &str) {
        let mut sessions = self.sessions.lock();
        if let Some(session) = sessions.remove(session_id) {
            let _ = session.disconnect(None, "user disconnect", None);
            log::info!("SSH 断开: {session_id}");
        }
    }

    // ---- 私有辅助方法 ----

    /// 建立底层 SSH 会话（不含锁操作）
    fn establish_session(config: &SshConfig) -> Result<Session, AppError> {
        let addr = format!("{}:{}", config.host, config.port);
        let tcp = TcpStream::connect_timeout(
            &addr
                .parse()
                .map_err(|e| AppError::SshConnection(format!("地址解析失败: {e}")))?,
            Duration::from_secs(10),
        )
        .map_err(|e| AppError::SshConnection(format!("TCP 连接失败: {e}")))?;

        let mut session = Session::new()
            .map_err(|e| AppError::SshConnection(format!("创建会话失败: {e}")))?;

        session.set_tcp_stream(tcp);
        session
            .handshake()
            .map_err(|e| AppError::SshConnection(format!("SSH 握手失败: {e}")))?;

        match &config.auth_method {
            AuthMethod::Password { password } => {
                session
                    .userauth_password(&config.username, password)
                    .map_err(|e| AppError::SshConnection(format!("密码认证失败: {e}")))?;
            }
            AuthMethod::KeyFile { path, passphrase } => {
                let pass = passphrase.as_deref().unwrap_or("");
                session
                    .userauth_pubkey_file(
                        &config.username,
                        None,
                        std::path::Path::new(path),
                        Some(pass),
                    )
                    .map_err(|e| AppError::SshConnection(format!("密钥认证失败: {e}")))?;
            }
            AuthMethod::SshAgent => {
                let mut agent = session
                    .agent()
                    .map_err(|e| AppError::SshConnection(format!("连接 SSH Agent 失败: {e}")))?;
                agent
                    .connect()
                    .map_err(|e| AppError::SshConnection(format!("SSH Agent 连接失败: {e}")))?;
                agent
                    .list_identities()
                    .map_err(|e| AppError::SshConnection(format!("列举 Agent 密钥失败: {e}")))?;

                let identities = agent
                    .identities()
                    .map_err(|e| AppError::SshConnection(format!("获取 Agent 密钥列表失败: {e}")))?;
                let authed = identities
                    .iter()
                    .any(|identity| agent.userauth(&config.username, identity).is_ok());
                if !authed {
                    return Err(AppError::SshConnection(
                        "SSH Agent 认证失败：没有可用的密钥".into(),
                    ));
                }
            }
        }

        if !session.authenticated() {
            return Err(AppError::SshConnection("认证失败".into()));
        }

        Ok(session)
    }
}

/// 解析 ss/netstat 输出为 PortInfo 列表
fn parse_port_output(output: &str, target_port: u16) -> Result<Vec<PortInfo>, AppError> {
    let mut results = Vec::new();

    for line in output.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 {
            continue;
        }

        // ss 输出格式: STATE  RECV-Q  SEND-Q  LOCAL_ADDRESS:PORT  PEER_ADDRESS:PORT  ...
        // netstat 格式: Proto  Recv-Q  Send-Q  Local Address:Port  Foreign Address  State  PID/Program
        let local_addr_part = if parts[0] == "tcp" || parts[0] == "udp" {
            // netstat 格式
            parts.get(3).unwrap_or(&"")
        } else {
            // ss 格式
            parts.get(3).unwrap_or(&parts[0])
        };

        let port_str = local_addr_part.rsplit(':').next().unwrap_or("0");
        let port_num: u16 = port_str.parse().unwrap_or(0);
        if port_num != target_port {
            continue;
        }

        let protocol = if line.contains("tcp")
            || line.contains("tcp6")
            || parts.first().is_some_and(|p| p.starts_with("tcp"))
        {
            "TCP"
        } else {
            "UDP"
        };

        let state = if parts[0] == "LISTEN" || parts[0] == "ESTAB" || parts[0] == "TIME-WAIT" {
            parts[0].to_uppercase()
        } else if parts.len() > 5 {
            parts[5].to_uppercase()
        } else {
            "UNKNOWN".to_string()
        };

        let (pid, process_name) = extract_pid_from_line(line);

        results.push(PortInfo {
            port: target_port,
            pid,
            process_name,
            protocol: protocol.to_string(),
            local_address: local_addr_part.to_string(),
            state,
        });
    }

    Ok(results)
}

/// 从 ss/netstat 输出行中提取 PID 和进程名
fn extract_pid_from_line(line: &str) -> (u32, String) {
    // ss 格式: users:(("node",pid=1234,fd=5))
    if let Some(start) = line.find("pid=") {
        let rest = &line[start + 4..];
        if let Some(end) = rest.find(|c: char| !c.is_ascii_digit()) {
            let pid_str = &rest[..end];
            if let Ok(pid) = pid_str.parse::<u32>() {
                let name = line[line.find("((").map(|i| i + 2).unwrap_or(0)..]
                    .split('"')
                    .nth(1)
                    .unwrap_or("<unknown>")
                    .to_string();
                return (pid, name);
            }
        }
    }

    // netstat 格式: 1234/process_name
    for part in line.split_whitespace() {
        if let Some((pid_str, name)) = part.split_once('/') {
            if let Ok(pid) = pid_str.parse::<u32>() {
                return (pid, name.to_string());
            }
        }
    }

    (0, "<unknown>".to_string())
}
