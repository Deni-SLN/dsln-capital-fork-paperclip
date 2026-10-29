#!/usr/bin/env node
/**
 * Proxmox VE Model Context Protocol (MCP) Server.
 * Exposes Proxmox VE cluster, node, VM, and LXC operations to Paperclip AI Agents via stdio MCP protocol.
 */
import readline from "node:readline";

if (process.env.PROXMOX_INSECURE !== "false") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const BASE_URL = (process.env.PROXMOX_URL || process.env.PROXMOX_HOST || "").replace(/\/+$/, "");
const TOKEN_ID = process.env.PROXMOX_TOKEN_ID || "";
const TOKEN_SECRET = process.env.PROXMOX_TOKEN_SECRET || "";

function checkConfig() {
  if (!BASE_URL || !TOKEN_ID || !TOKEN_SECRET) {
    throw new Error(
      "Missing Proxmox configuration. Please set PROXMOX_URL, PROXMOX_TOKEN_ID, and PROXMOX_TOKEN_SECRET."
    );
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

  const response = await fetch(url, { ...options, headers });
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

const TOOLS = [
  {
    name: "proxmox_list_nodes",
    description: "List all Proxmox VE cluster nodes with status, CPU, memory, and uptime metrics.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "proxmox_get_node_status",
    description: "Get detailed CPU, memory, kernel, and hardware metrics for a specific Proxmox node.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Name of the node (e.g. 'pve')" },
      },
      required: ["node"],
    },
  },
  {
    name: "proxmox_list_vms",
    description: "List QEMU/KVM virtual machines across the cluster or on a specific node.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Optional node filter (e.g. 'pve')" },
      },
    },
  },
  {
    name: "proxmox_get_vm_status",
    description: "Get current status, resource consumption, and uptime of a virtual machine.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node where VM is hosted" },
        vmid: { type: "string", description: "ID of the VM (e.g. '100')" },
      },
      required: ["node", "vmid"],
    },
  },
  {
    name: "proxmox_start_vm",
    description: "Power on a specific virtual machine.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node where VM is hosted" },
        vmid: { type: "string", description: "ID of the VM (e.g. '100')" },
      },
      required: ["node", "vmid"],
    },
  },
  {
    name: "proxmox_stop_vm",
    description: "Gracefully shutdown or force stop a virtual machine.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node where VM is hosted" },
        vmid: { type: "string", description: "ID of the VM (e.g. '100')" },
        force: { type: "boolean", description: "If true, immediately force stop (kill) the VM instead of graceful shutdown" },
      },
      required: ["node", "vmid"],
    },
  },
  {
    name: "proxmox_reboot_vm",
    description: "Reboot a specific virtual machine.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node where VM is hosted" },
        vmid: { type: "string", description: "ID of the VM (e.g. '100')" },
      },
      required: ["node", "vmid"],
    },
  },
  {
    name: "proxmox_create_vm_snapshot",
    description: "Create a snapshot of a virtual machine before performing risky operations.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node where VM is hosted" },
        vmid: { type: "string", description: "ID of the VM (e.g. '100')" },
        snapname: { type: "string", description: "Name of the snapshot (no spaces, e.g. 'backup_before_update')" },
        description: { type: "string", description: "Optional description of the snapshot" },
      },
      required: ["node", "vmid", "snapname"],
    },
  },
  {
    name: "proxmox_rollback_vm_snapshot",
    description: "Rollback a virtual machine to an existing snapshot.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node where VM is hosted" },
        vmid: { type: "string", description: "ID of the VM" },
        snapname: { type: "string", description: "Name of the snapshot to restore" },
      },
      required: ["node", "vmid", "snapname"],
    },
  },
  {
    name: "proxmox_list_lxcs",
    description: "List all LXC Linux containers across the cluster or on a specific node.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Optional node filter" },
      },
    },
  },
  {
    name: "proxmox_get_lxc_status",
    description: "Get detailed status and resource usage of an LXC container.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node where container is hosted" },
        vmid: { type: "string", description: "ID of the container" },
      },
      required: ["node", "vmid"],
    },
  },
  {
    name: "proxmox_start_lxc",
    description: "Power on an LXC container.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node where container is hosted" },
        vmid: { type: "string", description: "ID of the container" },
      },
      required: ["node", "vmid"],
    },
  },
  {
    name: "proxmox_stop_lxc",
    description: "Shutdown an LXC container.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Node where container is hosted" },
        vmid: { type: "string", description: "ID of the container" },
      },
      required: ["node", "vmid"],
    },
  },
  {
    name: "proxmox_list_storage",
    description: "List storage pools, types, capacity, and available free space in Proxmox.",
    inputSchema: {
      type: "object",
      properties: {
        node: { type: "string", description: "Optional node filter" },
      },
    },
  },
];

async function handleToolCall(name, args) {
  switch (name) {
    case "proxmox_list_nodes": {
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
    case "proxmox_get_node_status": {
      return await proxmoxFetch(`/nodes/${args.node}/status`);
    }
    case "proxmox_list_vms": {
      const nodes = args.node ? [{ node: args.node }] : await proxmoxFetch("/nodes");
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
        } catch (e) {
          allVms.push({ node: n.node, error: e.message });
        }
      }
      return allVms;
    }
    case "proxmox_get_vm_status": {
      return await proxmoxFetch(`/nodes/${args.node}/qemu/${args.vmid}/status/current`);
    }
    case "proxmox_start_vm": {
      const res = await proxmoxFetch(`/nodes/${args.node}/qemu/${args.vmid}/status/start`, { method: "POST" });
      return { success: true, taskId: res, message: `Start signal sent to VM ${args.vmid} on node ${args.node}` };
    }
    case "proxmox_stop_vm": {
      const action = args.force ? "stop" : "shutdown";
      const res = await proxmoxFetch(`/nodes/${args.node}/qemu/${args.vmid}/status/${action}`, { method: "POST" });
      return { success: true, taskId: res, message: `${args.force ? "Force stop" : "Graceful shutdown"} sent to VM ${args.vmid}` };
    }
    case "proxmox_reboot_vm": {
      const res = await proxmoxFetch(`/nodes/${args.node}/qemu/${args.vmid}/status/reboot`, { method: "POST" });
      return { success: true, taskId: res, message: `Reboot signal sent to VM ${args.vmid}` };
    }
    case "proxmox_create_vm_snapshot": {
      const body = new URLSearchParams({ snapname: args.snapname, description: args.description || "Created by AI Agent" });
      const res = await proxmoxFetch(`/nodes/${args.node}/qemu/${args.vmid}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      return { success: true, taskId: res, message: `Snapshot '${args.snapname}' initiated for VM ${args.vmid}` };
    }
    case "proxmox_rollback_vm_snapshot": {
      const res = await proxmoxFetch(`/nodes/${args.node}/qemu/${args.vmid}/snapshot/${args.snapname}/rollback`, {
        method: "POST",
      });
      return { success: true, taskId: res, message: `Rollback to '${args.snapname}' initiated for VM ${args.vmid}` };
    }
    case "proxmox_list_lxcs": {
      const nodes = args.node ? [{ node: args.node }] : await proxmoxFetch("/nodes");
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
        } catch (e) {
          allLxcs.push({ node: n.node, error: e.message });
        }
      }
      return allLxcs;
    }
    case "proxmox_get_lxc_status": {
      return await proxmoxFetch(`/nodes/${args.node}/lxc/${args.vmid}/status/current`);
    }
    case "proxmox_start_lxc": {
      const res = await proxmoxFetch(`/nodes/${args.node}/lxc/${args.vmid}/status/start`, { method: "POST" });
      return { success: true, taskId: res, message: `Start signal sent to LXC Container ${args.vmid}` };
    }
    case "proxmox_stop_lxc": {
      const res = await proxmoxFetch(`/nodes/${args.node}/lxc/${args.vmid}/status/shutdown`, { method: "POST" });
      return { success: true, taskId: res, message: `Shutdown signal sent to LXC Container ${args.vmid}` };
    }
    case "proxmox_list_storage": {
      const nodes = args.node ? [{ node: args.node }] : await proxmoxFetch("/nodes");
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
        } catch (e) {
          allStorage.push({ node: n.node, error: e.message });
        }
      }
      return allStorage;
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// JSON-RPC Stdio Loop
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch {
    return;
  }

  const { id, method, params } = request;

  try {
    if (method === "initialize") {
      const response = {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "proxmox-mcp-server", version: "1.0.0" },
        },
      };
      console.log(JSON.stringify(response));
    } else if (method === "tools/list") {
      const response = {
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS },
      };
      console.log(JSON.stringify(response));
    } else if (method === "tools/call") {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const result = await handleToolCall(toolName, toolArgs);
      const response = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        },
      };
      console.log(JSON.stringify(response));
    } else if (method === "notifications/initialized") {
      // client ack, no response needed
    } else {
      console.log(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        })
      );
    }
  } catch (err) {
    console.log(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: err.message },
      })
    );
  }
});
