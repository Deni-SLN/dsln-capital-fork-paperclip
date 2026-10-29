#!/usr/bin/env node
/**
 * Proxmox VE CLI tool for Paperclip AI Agents.
 * Allows managing Proxmox nodes, QEMU VMs, LXC containers, snapshots, and storage pools.
 */

// Allow self-signed certificates commonly found in Proxmox installations
if (process.env.PROXMOX_INSECURE !== "false") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const BASE_URL = (process.env.PROXMOX_URL || process.env.PROXMOX_HOST || "").replace(/\/+$/, "");
const TOKEN_ID = process.env.PROXMOX_TOKEN_ID || "";
const TOKEN_SECRET = process.env.PROXMOX_TOKEN_SECRET || "";

function checkConfig() {
  if (!BASE_URL) {
    console.error("Error: PROXMOX_URL environment variable is required (e.g. https://192.168.1.100:8006)");
    process.exit(1);
  }
  if (!TOKEN_ID || !TOKEN_SECRET) {
    console.error("Error: PROXMOX_TOKEN_ID and PROXMOX_TOKEN_SECRET are required.");
    console.error("Format: PROXMOX_TOKEN_ID='user@pam!tokenname', PROXMOX_TOKEN_SECRET='uuid'");
    process.exit(1);
  }
}

async function proxmoxFetch(endpoint, options = {}) {
  checkConfig();
  const url = `${BASE_URL}/api2/json${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
  const headers = {
    Authorization: `PVEAPIToken=${TOKEN_ID}=${TOKEN_SECRET}`,
    Accept: "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const bodyText = await response.text();
  let json;
  try {
    json = JSON.parse(bodyText);
  } catch {
    throw new Error(`HTTP ${response.status} from Proxmox: ${bodyText}`);
  }

  if (!response.ok) {
    const errorMsg = json?.errors || json?.message || bodyText;
    throw new Error(`Proxmox API error (${response.status}): ${JSON.stringify(errorMsg)}`);
  }

  return json.data;
}

// ==================== COMMAND HANDLERS ====================

async function listNodes() {
  const nodes = await proxmoxFetch("/nodes");
  return nodes.map((n) => ({
    node: n.node,
    status: n.status,
    cpuUsage: `${((n.cpu || 0) * 100).toFixed(1)}%`,
    maxCpu: n.maxcpu,
    memoryUsage: `${(((n.mem || 0) / (n.maxmem || 1)) * 100).toFixed(1)}%`,
    maxMemoryGb: ((n.maxmem || 0) / (1024 * 1024 * 1024)).toFixed(2),
    uptimeHours: ((n.uptime || 0) / 3600).toFixed(1),
  }));
}

async function getNodeStatus(node) {
  return await proxmoxFetch(`/nodes/${node}/status`);
}

async function listVMs(targetNode) {
  let nodes = [];
  if (targetNode) {
    nodes = [{ node: targetNode }];
  } else {
    nodes = await proxmoxFetch("/nodes");
  }

  const allVms = [];
  for (const n of nodes) {
    try {
      const vms = await proxmoxFetch(`/nodes/${n.node}/qemu`);
      for (const vm of vms) {
        allVms.push({
          node: n.node,
          vmid: vm.vmid,
          name: vm.name || `VM ${vm.vmid}`,
          status: vm.status,
          cpus: vm.cpus,
          memoryMb: ((vm.maxmem || 0) / (1024 * 1024)).toFixed(0),
          diskGb: ((vm.maxdisk || 0) / (1024 * 1024 * 1024)).toFixed(1),
          uptime: vm.uptime ? `${(vm.uptime / 3600).toFixed(1)}h` : "-",
        });
      }
    } catch (err) {
      console.warn(`Could not fetch VMs for node ${n.node}: ${err.message}`);
    }
  }
  return allVms;
}

async function getVMStatus(node, vmid) {
  return await proxmoxFetch(`/nodes/${node}/qemu/${vmid}/status/current`);
}

async function startVM(node, vmid) {
  const res = await proxmoxFetch(`/nodes/${node}/qemu/${vmid}/status/start`, { method: "POST" });
  return { success: true, taskId: res, message: `Start signal sent to VM ${vmid} on node ${node}` };
}

async function stopVM(node, vmid, force = false) {
  const action = force ? "stop" : "shutdown";
  const res = await proxmoxFetch(`/nodes/${node}/qemu/${vmid}/status/${action}`, { method: "POST" });
  return { success: true, taskId: res, message: `${force ? "Force stop" : "Graceful shutdown"} signal sent to VM ${vmid} on node ${node}` };
}

async function rebootVM(node, vmid) {
  const res = await proxmoxFetch(`/nodes/${node}/qemu/${vmid}/status/reboot`, { method: "POST" });
  return { success: true, taskId: res, message: `Reboot signal sent to VM ${vmid} on node ${node}` };
}

async function snapshotVM(node, vmid, snapname, description = "Created by Paperclip AI Agent") {
  const body = new URLSearchParams({ snapname, description });
  const res = await proxmoxFetch(`/nodes/${node}/qemu/${vmid}/snapshot`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return { success: true, taskId: res, message: `Snapshot '${snapname}' creation initiated for VM ${vmid}` };
}

async function rollbackVM(node, vmid, snapname) {
  const res = await proxmoxFetch(`/nodes/${node}/qemu/${vmid}/snapshot/${snapname}/rollback`, {
    method: "POST",
  });
  return { success: true, taskId: res, message: `Rollback to snapshot '${snapname}' initiated for VM ${vmid}` };
}

async function listLXCs(targetNode) {
  let nodes = [];
  if (targetNode) {
    nodes = [{ node: targetNode }];
  } else {
    nodes = await proxmoxFetch("/nodes");
  }

  const allLxcs = [];
  for (const n of nodes) {
    try {
      const lxcs = await proxmoxFetch(`/nodes/${n.node}/lxc`);
      for (const ct of lxcs) {
        allLxcs.push({
          node: n.node,
          vmid: ct.vmid,
          name: ct.name || `CT ${ct.vmid}`,
          status: ct.status,
          cpus: ct.cpus,
          memoryMb: ((ct.maxmem || 0) / (1024 * 1024)).toFixed(0),
          diskGb: ((ct.maxdisk || 0) / (1024 * 1024 * 1024)).toFixed(1),
          uptime: ct.uptime ? `${(ct.uptime / 3600).toFixed(1)}h` : "-",
        });
      }
    } catch (err) {
      console.warn(`Could not fetch LXCs for node ${n.node}: ${err.message}`);
    }
  }
  return allLxcs;
}

async function getLXCStatus(node, vmid) {
  return await proxmoxFetch(`/nodes/${node}/lxc/${vmid}/status/current`);
}

async function startLXC(node, vmid) {
  const res = await proxmoxFetch(`/nodes/${node}/lxc/${vmid}/status/start`, { method: "POST" });
  return { success: true, taskId: res, message: `Start signal sent to LXC Container ${vmid} on node ${node}` };
}

async function stopLXC(node, vmid) {
  const res = await proxmoxFetch(`/nodes/${node}/lxc/${vmid}/status/shutdown`, { method: "POST" });
  return { success: true, taskId: res, message: `Shutdown signal sent to LXC Container ${vmid} on node ${node}` };
}

async function listStorage(targetNode) {
  let nodes = [];
  if (targetNode) {
    nodes = [{ node: targetNode }];
  } else {
    nodes = await proxmoxFetch("/nodes");
  }

  const allStorage = [];
  for (const n of nodes) {
    try {
      const storages = await proxmoxFetch(`/nodes/${n.node}/storage`);
      for (const s of storages) {
        allStorage.push({
          node: n.node,
          storage: s.storage,
          type: s.type,
          enabled: s.enabled === 1,
          totalGb: ((s.total || 0) / (1024 * 1024 * 1024)).toFixed(1),
          usedGb: ((s.used || 0) / (1024 * 1024 * 1024)).toFixed(1),
          freeGb: ((s.avail || 0) / (1024 * 1024 * 1024)).toFixed(1),
          usagePercent: `${(((s.used || 0) / (s.total || 1)) * 100).toFixed(1)}%`,
        });
      }
    } catch (err) {
      console.warn(`Could not fetch storage for node ${n.node}: ${err.message}`);
    }
  }
  return allStorage;
}

// ==================== CLI ENTRYPOINT ====================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    console.log(`
Proxmox VE Control Tool for AI Agents
Usage: node proxmox-tool.mjs <command> [arguments...]

Commands:
  nodes                              List all nodes in the cluster
  node-status <node>                 Get detailed health metrics for a node
  vms [node]                         List virtual machines
  vm-status <node> <vmid>            Get current status of a VM
  vm-start <node> <vmid>             Power on a VM
  vm-stop <node> <vmid> [--force]    Gracefully shutdown or force stop a VM
  vm-reboot <node> <vmid>            Reboot a VM
  vm-snapshot <node> <vmid> <name>   Create a snapshot for a VM
  vm-rollback <node> <vmid> <name>   Roll back a VM to a snapshot
  lxcs [node]                        List LXC containers
  lxc-status <node> <vmid>           Get current status of an LXC container
  lxc-start <node> <vmid>            Power on an LXC container
  lxc-stop <node> <vmid>             Shutdown an LXC container
  storage [node]                     List storage pools and usage
    `);
    process.exit(0);
  }

  try {
    let result;
    switch (command) {
      case "nodes":
        result = await listNodes();
        break;
      case "node-status":
        if (!args[1]) throw new Error("Missing node name: proxmox-tool.mjs node-status <node>");
        result = await getNodeStatus(args[1]);
        break;
      case "vms":
        result = await listVMs(args[1]);
        break;
      case "vm-status":
        if (!args[1] || !args[2]) throw new Error("Usage: vm-status <node> <vmid>");
        result = await getVMStatus(args[1], args[2]);
        break;
      case "vm-start":
        if (!args[1] || !args[2]) throw new Error("Usage: vm-start <node> <vmid>");
        result = await startVM(args[1], args[2]);
        break;
      case "vm-stop":
        if (!args[1] || !args[2]) throw new Error("Usage: vm-stop <node> <vmid> [--force]");
        result = await stopVM(args[1], args[2], args.includes("--force"));
        break;
      case "vm-reboot":
        if (!args[1] || !args[2]) throw new Error("Usage: vm-reboot <node> <vmid>");
        result = await rebootVM(args[1], args[2]);
        break;
      case "vm-snapshot":
        if (!args[1] || !args[2] || !args[3]) throw new Error("Usage: vm-snapshot <node> <vmid> <snapname> [desc]");
        result = await snapshotVM(args[1], args[2], args[3], args[4]);
        break;
      case "vm-rollback":
        if (!args[1] || !args[2] || !args[3]) throw new Error("Usage: vm-rollback <node> <vmid> <snapname>");
        result = await rollbackVM(args[1], args[2], args[3]);
        break;
      case "lxcs":
        result = await listLXCs(args[1]);
        break;
      case "lxc-status":
        if (!args[1] || !args[2]) throw new Error("Usage: lxc-status <node> <vmid>");
        result = await getLXCStatus(args[1], args[2]);
        break;
      case "lxc-start":
        if (!args[1] || !args[2]) throw new Error("Usage: lxc-start <node> <vmid>");
        result = await startLXC(args[1], args[2]);
        break;
      case "lxc-stop":
        if (!args[1] || !args[2]) throw new Error("Usage: lxc-stop <node> <vmid>");
        result = await stopLXC(args[1], args[2]);
        break;
      case "storage":
        result = await listStorage(args[1]);
        break;
      default:
        throw new Error(`Unknown command '${command}'. Run with --help for available commands.`);
    }

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
