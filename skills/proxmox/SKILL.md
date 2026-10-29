---
name: proxmox
description: Manage Proxmox VE (Virtual Environment) nodes, QEMU/KVM virtual machines, LXC containers, snapshots, storage, and cluster resources via Proxmox REST API, MCP, or CLI.
---

# Proxmox VE Management Skill for AI Agents

Use this skill when you are tasked with inspecting, monitoring, deploying, or managing infrastructure on **Proxmox Virtual Environment (PVE)**.

---

## 🔑 Authentication & Configuration

Proxmox VE uses API Tokens for automated and non-interactive management without requiring session CSRF tokens or password expiration.

Required Environment Variables:
* `PROXMOX_URL` (atau `PROXMOX_HOST`): URL dasar server Proxmox, contoh: `https://192.168.1.100:8006` atau `https://pve.internal:8006`.
* `PROXMOX_TOKEN_ID`: Token ID Proxmox, format: `user@realm!tokenname` (contoh: `root@pam!paperclip` atau `devops@pve!agent`).
* `PROXMOX_TOKEN_SECRET`: UUID rahasia token Proxmox (contoh: `12345678-abcd-1234-abcd-1234567890ab`).
* `PROXMOX_INSECURE`: Default `true` untuk mengizinkan sertifikat SSL self-signed umum pada Proxmox internal.

---

## 🛠️ Cara Penggunaan (2 Pilihan)

### Opsi A: Menggunakan Tool CLI Script (`proxmox-tool.mjs`)
Agen dapat menjalankan skrip utilitas bawaan kapan saja dari workspace:

```bash
# 1. Melihat semua node di cluster Proxmox
node skills/proxmox/scripts/proxmox-tool.mjs nodes

# 2. Melihat status detail resource node
node skills/proxmox/scripts/proxmox-tool.mjs node-status pve

# 3. Melihat daftar Virtual Machines (VM)
node skills/proxmox/scripts/proxmox-tool.mjs vms

# 4. Melihat status spesifik VM
node skills/proxmox/scripts/proxmox-tool.mjs vm-status pve 100

# 5. Menyalakan VM
node skills/proxmox/scripts/proxmox-tool.mjs vm-start pve 100

# 6. Mematikan VM secara halus (Graceful Shutdown)
node skills/proxmox/scripts/proxmox-tool.mjs vm-stop pve 100

# 7. Mematikan VM secara paksa (Force Stop / Poweroff)
node skills/proxmox/scripts/proxmox-tool.mjs vm-stop pve 100 --force

# 8. Me-reboot VM
node skills/proxmox/scripts/proxmox-tool.mjs vm-reboot pve 100

# 9. Membuat Snapshot VM sebelum update
node skills/proxmox/scripts/proxmox-tool.mjs vm-snapshot pve 100 "backup_sebelum_update" "Snapshot otomatis oleh AI Agent"

# 10. Mengembalikan Snapshot VM (Rollback)
node skills/proxmox/scripts/proxmox-tool.mjs vm-rollback pve 100 "backup_sebelum_update"

# 11. Mengelola Kontainer LXC
node skills/proxmox/scripts/proxmox-tool.mjs lxcs
node skills/proxmox/scripts/proxmox-tool.mjs lxc-status pve 105
node skills/proxmox/scripts/proxmox-tool.mjs lxc-start pve 105
node skills/proxmox/scripts/proxmox-tool.mjs lxc-stop pve 105

# 12. Melihat status Storage Pools
node skills/proxmox/scripts/proxmox-tool.mjs storage
```

---

### Opsi B: Menggunakan Proxmox MCP Server (Native Tools)
Paperclip dapat menghubungkan server MCP Proxmox melalui menu **Apps -> Connect your own MCP server**:

```json
{
  "name": "Proxmox VE",
  "transport": "stdio",
  "command": "node",
  "args": ["skills/proxmox/scripts/proxmox-mcp.mjs"],
  "env": {
    "PROXMOX_URL": "https://192.168.1.100:8006",
    "PROXMOX_TOKEN_ID": "root@pam!paperclip",
    "PROXMOX_TOKEN_SECRET": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

Tool yang otomatis tersedia untuk AI Agent:
* `proxmox_list_nodes()`: Daftar node, CPU%, RAM%, Uptime.
* `proxmox_get_node_status(node)`: Kesehatan dan metrik hardware.
* `proxmox_list_vms(node?)`: Daftar semua VM QEMU/KVM.
* `proxmox_get_vm_status(node, vmid)`: Status dan penggunaan sumber daya VM.
* `proxmox_start_vm(node, vmid)`: Menyalakan VM.
* `proxmox_stop_vm(node, vmid, force?)`: Mematikan VM.
* `proxmox_reboot_vm(node, vmid)`: Me-restart VM.
* `proxmox_create_vm_snapshot(node, vmid, snapname, description?)`: Membuat snapshot.
* `proxmox_rollback_vm_snapshot(node, vmid, snapname)`: Mengembalikan ke snapshot.
* `proxmox_list_lxcs(node?)`: Daftar kontainer LXC Linux.
* `proxmox_get_lxc_status(node, vmid)`: Status kontainer LXC.
* `proxmox_start_lxc(node, vmid)`: Menyalakan kontainer LXC.
* `proxmox_stop_lxc(node, vmid)`: Mematikan kontainer LXC.
* `proxmox_list_storage(node?)`: Status kapasitas storage pool.

---

## 🛡️ Aturan Keamanan & Keselamatan Operasi

1. **Selalu Buat Snapshot Sebelum Perubahan Berisiko**:
   Sebelum melakukan pembaruan kernel, instalasi paket besar, atau pengubahan konfigurasi database di dalam VM, selalu panggil `proxmox_create_vm_snapshot` terlebih dahulu.
2. **Prioritaskan Graceful Shutdown**:
   Gunakan shutdown normal terlebih dahulu agar sistem operasi di dalam VM menutup database dan berkas dengan aman. Hanya gunakan `--force` atau `force: true` jika VM hang atau tidak merespons sinyal ACPI.
3. **Persetujuan Manusia ("Ask First")**:
   Tindakan yang mematikan VM produksi atau melakukan *rollback snapshot* harus selalu dikonfirmasikan kepada pengguna sebelum dieksekusi.
