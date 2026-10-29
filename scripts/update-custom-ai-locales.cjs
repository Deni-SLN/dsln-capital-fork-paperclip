const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'ui', 'src', 'i18n', 'locales');
const enPath = path.join(localesDir, 'en.json');
const idPath = path.join(localesDir, 'id.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const id = JSON.parse(fs.readFileSync(idPath, 'utf8'));

const customAiEn = {
  title: "AI Provider & API Gateway",
  description: "Configure custom endpoints (9Router, OpenRouter, OmniRoute, or custom OpenAI-compatible server)",
  providerLabel: "AI Provider",
  provider9router: "9Router (Local: localhost:20128)",
  providerOpenrouter: "OpenRouter (openrouter.ai)",
  providerOmnirouter: "OmniRoute Gateway",
  providerCustom: "Custom Provider (OpenAI Compatible)",
  providerOpenai: "OpenAI (Direct)",
  providerAnthropic: "Anthropic (Direct)",
  providerGoogle: "Google Gemini (Direct)",
  providerNone: "Default / Standalone",
  baseUrlLabel: "Base URL / Endpoint",
  baseUrlPlaceholder: "e.g. http://localhost:20128/v1 or https://api.openai.com/v1",
  apiKeyLabel: "API Key",
  apiKeyPlaceholder: "Enter API Key (e.g. 9router-key, sk-...)",
  modelLabel: "Model Name / ID",
  modelPlaceholder: "e.g. anthropic/claude-3.5-sonnet, deepseek-chat, gpt-4o",
  modelPresetLabel: "Quick suggestions",
  activeNotice: "Agent is configured to route via {provider}",
  tip9router: "9Router connects your agent to 40-60+ LLM providers locally with smart fallback and token optimization.",
  tipCustom: "Enter any OpenAI-compatible base URL (e.g. LiteLLM, vLLM, Ollama, LocalAI, Groq).",
  importModels: "Import Models",
  importing: "Importing...",
  autoTest: "Auto Test All",
  testing: "Testing...",
  testProgress: "Testing ({current}/{total})...",
  testSingle: "Test",
  hideFailed: "Auto-hide failed models",
  showAll: "Show all ({count})",
  failedHiddenCount: "{count} failed models hidden",
  freeBadge: "FREE",
  passedBadge: "Ready",
  failedBadge: "Failed",
  testingBadge: "Testing...",
  untestedBadge: "Untested",
  selectModel: "Use model",
  noModelsFound: "No models found or imported yet. Click 'Import Models' or enter manually.",
  searchModelPlaceholder: "Search models...",
  importSuccess: "Successfully imported {count} models ({freeCount} free)",
  importFailed: "Failed to import models: {error}",
  modelsCount: "{total} models found ({free} free, {working} working)"
};

const customAiId = {
  title: "Penyedia AI & API Gateway",
  description: "Konfigurasi endpoint kustom (9Router, OpenRouter, OmniRoute, atau server kompatibel OpenAI)",
  providerLabel: "Penyedia AI",
  provider9router: "9Router (Lokal: localhost:20128)",
  providerOpenrouter: "OpenRouter (openrouter.ai)",
  providerOmnirouter: "OmniRoute Gateway",
  providerCustom: "Custom Provider (Kompatibel OpenAI)",
  providerOpenai: "OpenAI (Langsung)",
  providerAnthropic: "Anthropic (Langsung)",
  providerGoogle: "Google Gemini (Langsung)",
  providerNone: "Bawaan / Standalone",
  baseUrlLabel: "Base URL / Endpoint",
  baseUrlPlaceholder: "contoh: http://localhost:20128/v1 atau https://api.openai.com/v1",
  apiKeyLabel: "Kunci API (API Key)",
  apiKeyPlaceholder: "Masukkan API Key (contoh: 9router-key, sk-...)",
  modelLabel: "Nama / ID Model",
  modelPlaceholder: "contoh: anthropic/claude-3.5-sonnet, deepseek-chat, gpt-4o",
  modelPresetLabel: "Saran cepat",
  activeNotice: "Agen dikonfigurasi untuk diarahkan melalui {provider}",
  tip9router: "9Router menghubungkan agen Anda ke 40-60+ provider LLM lokal dengan smart fallback dan penghematan token.",
  tipCustom: "Masukkan Base URL yang kompatibel dengan format OpenAI (contoh: LiteLLM, vLLM, Ollama, LocalAI, Groq).",
  importModels: "Impor Model",
  importing: "Mengimpor...",
  autoTest: "Tes Otomatis Semua",
  testing: "Menguji...",
  testProgress: "Menguji ({current}/{total})...",
  testSingle: "Uji",
  hideFailed: "Sembunyikan otomatis model yang gagal",
  showAll: "Tampilkan semua ({count})",
  failedHiddenCount: "{count} model gagal disembunyikan",
  freeBadge: "GRATIS",
  passedBadge: "Siap",
  failedBadge: "Gagal",
  testingBadge: "Menguji...",
  untestedBadge: "Belum diuji",
  selectModel: "Gunakan model",
  noModelsFound: "Belum ada model yang diimpor. Klik 'Impor Model' atau masukkan manual.",
  searchModelPlaceholder: "Cari model...",
  importSuccess: "Berhasil mengimpor {count} model ({freeCount} gratis)",
  importFailed: "Gagal mengimpor model: {error}",
  modelsCount: "{total} model ditemukan ({free} gratis, {working} siap pakai)"
};

en.customAi = customAiEn;
id.customAi = customAiId;

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
fs.writeFileSync(idPath, JSON.stringify(id, null, 2) + '\n');

// Sync all other locale files
function deepSync(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object') {
        target[k] = {};
      }
      deepSync(target[k], v);
    } else if (target[k] === undefined) {
      target[k] = v;
    }
  }
}

for (const file of fs.readdirSync(localesDir)) {
  if (file.endsWith('.json') && file !== 'en.json' && file !== 'id.json') {
    const filePath = path.join(localesDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    deepSync(content, en);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  }
}

console.log('Custom AI locales updated successfully across all languages!');
