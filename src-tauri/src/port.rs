use crate::error::AppError;
use netstat2::{AddressFamilyFlags, ProtocolFlags, ProtocolSocketInfo, TcpSocketInfo, UdpSocketInfo};
use serde::Serialize;
use sysinfo::System;

/// 端口占用信息
#[derive(Debug, Clone, Serialize)]
pub struct PortInfo {
    pub port: u16,
    pub pid: u32,
    pub process_name: String,
    pub protocol: String,
    pub local_address: String,
    pub state: String,
}

/// 扫描指定端口的占用情况
pub fn scan_port(port: u16) -> Result<Vec<PortInfo>, AppError> {
    let all = list_all_sockets()?;
    Ok(all.into_iter().filter(|info| info.port == port).collect())
}

/// 扫描端口范围
pub fn scan_port_range(start: u16, end: u16) -> Result<Vec<PortInfo>, AppError> {
    let all = list_all_sockets()?;
    Ok(all
        .into_iter()
        .filter(|info| info.port >= start && info.port <= end)
        .collect())
}

/// 获取所有监听端口
pub fn list_listening_ports() -> Result<Vec<PortInfo>, AppError> {
    let all = list_all_sockets()?;
    Ok(all
        .into_iter()
        .filter(|info| info.state == "LISTEN" || info.protocol == "UDP")
        .collect())
}

/// 根据 PID 结束进程
pub fn kill_process(pid: u32) -> Result<(), AppError> {
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let target = sysinfo::Pid::from_u32(pid);
    if let Some(process) = sys.process(target) {
        if process.kill() {
            log::info!("成功结束进程 PID={pid}");
            Ok(())
        } else {
            Err(AppError::Process(format!("无法结束进程 PID={pid}，权限不足")))
        }
    } else {
        Err(AppError::Process(format!("未找到 PID={pid} 的进程")))
    }
}

/// 列出所有 TCP/UDP socket 并关联进程信息
fn list_all_sockets() -> Result<Vec<PortInfo>, AppError> {
    let af_flags = AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6;
    let proto_flags = ProtocolFlags::TCP | ProtocolFlags::UDP;

    let sockets_info =
        netstat2::get_sockets_info(af_flags, proto_flags).map_err(|e| AppError::PortScan(e.to_string()))?;

    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let mut results = Vec::new();

    for socket in &sockets_info {
        let (port, local_addr, protocol, state, pid) = match &socket.protocol_socket_info {
            ProtocolSocketInfo::Tcp(TcpSocketInfo {
                local_addr,
                local_port,
                state,
                ..
            }) => {
                let state_str = format!("{state:?}").to_uppercase();
                (
                    *local_port,
                    local_addr.to_string(),
                    "TCP".to_string(),
                    state_str,
                    socket.associated_pids.first().copied().unwrap_or(0),
                )
            }
            ProtocolSocketInfo::Udp(UdpSocketInfo { local_addr, local_port, .. }) => (
                *local_port,
                local_addr.to_string(),
                "UDP".to_string(),
                "NONE".to_string(),
                socket.associated_pids.first().copied().unwrap_or(0),
            ),
        };

        let process_name = if pid > 0 {
            sys.process(sysinfo::Pid::from_u32(pid))
                .map(|p| p.name().to_string_lossy().to_string())
                .unwrap_or_else(|| "<unknown>".to_string())
        } else {
            "<unknown>".to_string()
        };

        results.push(PortInfo {
            port,
            pid,
            process_name,
            protocol,
            local_address: local_addr,
            state,
        });
    }

    Ok(results)
}
