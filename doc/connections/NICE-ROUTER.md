# Panduan Integrasi Nice Router di Paperclip

Repositori Sumber: [Deni-SLN/Nice-Router](https://github.com/Deni-SLN/Nice-Router.git)

---

## 1. Ikhtisar & Arsitektur

**Nice Router** adalah platform AI Gateway cerdas berperforma tinggi yang menghubungkan seluruh agen AI di Paperclip ke **330+ AI Providers** (OpenRouter, Claude, GPT, Gemini, DeepSeek, Kiro AI, Ollama, dll.) dengan fitur:
- **Smart Routing**: Otomatis memilih model gratis (`FREE`) atau berbiaya paling optimal (`lowest-cost`, `lowest-latency`, `health-based`).
- **Auto-Fallback & Circuit Breaker**: Mencegah kegagalan eksekusi tugas agen jika suatu upstream provider mengalami downtime atau rate-limit (HTTP 429).
- **Token Saver & Anti Double-Counting**: Mengurangi penggunaan token hingga -40% dan mengisolasi reasoning/cached tokens.
- **Port Layanan**: `http://localhost:20127`
- **API Base URL**: `http://localhost:20127/v1`

---

## 2. Cara Kerja di Paperclip

Paperclip mendukung integrasi Nice Router secara native melalui 2 layer:

### A. Konfigurasi Global (Otomatis untuk Semua Agen)
Dikonfigurasi melalui file `.env` di direktori utama Paperclip:
```env
OPENAI_BASE_URL=http://localhost:20127/v1
OPENAI_API_KEY=default
ANTHROPIC_BASE_URL=http://localhost:20127/v1
ANTHROPIC_API_KEY=default
```
Semua adapter agen (`claude_local`, `codex_local`, `opencode_local`, `cursor`, `gemini_local`) akan secara default meneruskan panggilan inferensi AI ke Nice Router di port `20127`.

### B. Konfigurasi Per-Agen (Spesifik per Karakter Agen)
Pada halaman pengaturan agen (`/agents/[id]` -> **Konfigurasi / Runtime / Secrets**), Anda dapat menyetel environment variable khusus:
- `OPENAI_BASE_URL` = `http://localhost:20127/v1`
- `OPENAI_API_KEY` = `default` (atau API Key dari dashboard Nice Router)
- `ANTHROPIC_BASE_URL` = `http://localhost:20127/v1`
- `ANTHROPIC_API_KEY` = `default`

### C. Pemilihan Model & Kombo
Di field model agen, Anda dapat memasukkan:
1. **Model Kombo Pintar**:
   - `gratis` -> Otomatis memilih model gratis terbaik yang sedang aktif.
   - `opencode` -> Model coding optimal dengan tool calling.
2. **Model Spesifik Provider**:
   - `openrouter/google/gemini-2.0-flash-exp:free`
   - `kr/claude-sonnet-4.5`
   - `deepseek-chat` / `deepseek-reasoner`
   - `ocg/glm-5` / `ocg/kimi-k2.7-code`

---

## 3. Integrasi MCP (Model Context Protocol)

Nice Router menyediakan server MCP JSON-RPC 2.0 bawaan yang dapat diakses oleh agen-agen Paperclip:
- **HTTP Transport**: `http://localhost:20127/api/mcp/router`
- **Stdio Transport**: `node scripts/mcp-server.mjs`

Tools MCP yang tersedia:
- `get_router_status`: Memeriksa uptime dan status server router.
- `get_provider_health`: Memantau latensi dan kesehatan 330+ provider AI.
- `list_available_models`: Menampilkan daftar model dan kombo aktif.
- `get_budget_status`: Memantau sisa kuota dan limit biaya.
- `simulate_routing`: Melakukan simulasi pemilihan model sebelum eksekusi tugas.

---

## 4. Uji Konektivitas

Jalankan perintah berikut di terminal / PowerShell untuk memverifikasi bahwa Nice Router terhubung:
```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:20127/v1/models' -Headers @{Authorization='Bearer default'}
```
Jika respons mengembalikan daftar model dengan status HTTP 200, agen AI Paperclip siap menjalankan tugas dengan perutean pintar dari Nice Router!
