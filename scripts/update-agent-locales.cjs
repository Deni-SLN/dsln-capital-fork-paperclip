const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'ui', 'src', 'i18n', 'locales');
const enPath = path.join(localesDir, 'en.json');
const idPath = path.join(localesDir, 'id.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const id = JSON.parse(fs.readFileSync(idPath, 'utf8'));

const newAgentNavEn = {
  sections: {
    agent: "Agent",
    runtime: "Runtime",
    governance: "Governance",
    audit: "Audit"
  },
  overview: "Overview",
  instructions: "Instructions",
  skills: "Skills",
  runtime: "Harness / Runtime",
  secrets: "Secrets & variables",
  tools: "Tools",
  channels: "Channels",
  permissions: "Permissions / Trust",
  apiKeys: "API Keys",
  revisions: "Revisions",
  activity: "Activity",
  runs: "Runs",
  costs: "Costs",
  budgets: "Budgets"
};

const newAgentNavId = {
  sections: {
    agent: "Agen",
    runtime: "Waktu Proses",
    governance: "Tata Kelola",
    audit: "Audit"
  },
  overview: "Ikhtisar",
  instructions: "Instruksi",
  skills: "Keahlian",
  runtime: "Harness / Runtime",
  secrets: "Rahasia & Variabel",
  tools: "Alat",
  channels: "Saluran",
  permissions: "Izin / Kepercayaan",
  apiKeys: "Kunci API",
  revisions: "Revisi",
  activity: "Aktivitas",
  runs: "Run",
  costs: "Biaya",
  budgets: "Anggaran"
};

const newAgentConfigEn = {
  identity: "Agent identity",
  adapter: "Adapter",
  configuration: "Configuration",
  name: "Name",
  namePlaceholder: "Agent name",
  title: "Title",
  titlePlaceholder: "e.g. VP of Engineering",
  reportsTo: "Reports to",
  chooseManager: "Choose manager…",
  reportsToCeo: "Reports to: N/A (CEO)",
  harness: "Harness",
  model: "Model",
  thinkingEffort: "Thinking effort",
  comingSoon: "Coming soon",
  advanced: "Advanced",
  experimental: "Experimental",
  discard: "Discard",
  saveChanges: "Save changes",
  saving: "Saving...",
  save: "Save",
  openrouterTip: "OpenCode supports OpenRouter, 9Router, and OmniRoute models (e.g. openrouter/anthropic/claude-sonnet-4.6). Set your API keys in Secrets & variables."
};

const newAgentConfigId = {
  identity: "Identitas Agen",
  adapter: "Adapter",
  configuration: "Konfigurasi",
  name: "Nama",
  namePlaceholder: "Nama agen",
  title: "Jabatan",
  titlePlaceholder: "misal VP of Engineering",
  reportsTo: "Melapor ke",
  chooseManager: "Pilih manajer…",
  reportsToCeo: "Melapor ke: T/A (CEO)",
  harness: "Harness",
  model: "Model",
  thinkingEffort: "Upaya berpikir",
  comingSoon: "Segera hadir",
  advanced: "Lanjutan",
  experimental: "Eksperimental",
  discard: "Buang",
  saveChanges: "Simpan perubahan",
  saving: "Menyimpan...",
  save: "Simpan",
  openrouterTip: "OpenCode mendukung model OpenRouter, 9Router, dan OmniRoute (contoh: openrouter/anthropic/claude-sonnet-4.6). Masukkan API key di menu Rahasia & Variabel."
};

en.agentNav = newAgentNavEn;
id.agentNav = newAgentNavId;

en.agentConfig = newAgentConfigEn;
id.agentConfig = newAgentConfigId;

en.agent = {
  ...en.agent,
  assignTask: "Assign Task",
  searchPlaceholder: "Search agents…",
  listView: "List view",
  orgView: "Org chart view"
};

id.agent = {
  ...id.agent,
  assignTask: "Tugaskan Tugas",
  searchPlaceholder: "Cari agen…",
  listView: "Tampilan daftar",
  orgView: "Tampilan struktur"
};

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
fs.writeFileSync(idPath, JSON.stringify(id, null, 2) + '\n');

// Sync all other locale files with fallback to English so assertValidLocaleMessages passes
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

console.log('Locales updated successfully!');
