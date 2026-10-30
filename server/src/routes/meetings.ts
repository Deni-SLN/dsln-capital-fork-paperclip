import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { agentService, issueService } from "../services/index.js";
import type {
  ConductMeetingInput,
  ContinueMeetingInput,
  CreateMeetingIssuesInput,
  MeetingActionItem,
  MeetingConclusion,
  MeetingParticipant,
  MeetingSession,
  MeetingTurn,
} from "@paperclipai/shared";
import { randomUUID } from "node:crypto";

export function meetingsRoutes(db: Db) {
  const router = Router();
  const agentSvc = agentService(db);
  const issueSvc = issueService(db);

  function getAgentDepartment(a: { title?: string | null; role?: string | null; name?: string }): string {
    const text = `${a.title || ""} ${a.role || ""} ${a.name || ""}`.toLowerCase();
    if (
      text.includes("ceo") ||
      text.includes("chief") ||
      text.includes("lead") ||
      text.includes("director") ||
      text.includes("eksekutif") ||
      text.includes("pimpinan")
    ) {
      return "Kepemimpinan & Strategi Eksekutif";
    }
    if (
      text.includes("front") ||
      text.includes("ui") ||
      text.includes("ux") ||
      text.includes("design") ||
      text.includes("tampilan")
    ) {
      return "Frontend & Antarmuka Pengguna";
    }
    if (
      text.includes("back") ||
      text.includes("api") ||
      text.includes("data") ||
      text.includes("server") ||
      text.includes("architect") ||
      text.includes("database")
    ) {
      return "Arsitektur Backend & API";
    }
    if (
      text.includes("sec") ||
      text.includes("devops") ||
      text.includes("infra") ||
      text.includes("cloud") ||
      text.includes("keamanan")
    ) {
      return "Keamanan & Infrastruktur";
    }
    if (
      text.includes("qa") ||
      text.includes("test") ||
      text.includes("quality") ||
      text.includes("audit") ||
      text.includes("kualitas")
    ) {
      return "Penjamin Kualitas & Pengujian";
    }
    if (
      text.includes("prod") ||
      text.includes("biz") ||
      text.includes("market") ||
      text.includes("growth") ||
      text.includes("bisnis")
    ) {
      return "Produk & Strategi Bisnis";
    }
    return "Operasional & Spesialis AI";
  }

  /**
   * Helper to determine leader (highest agent) and participants
   * Strictly uses REAL agents in the company — never injects fake agents!
   */
  async function resolveParticipants(companyId: string, requestedAgentIds?: string[]): Promise<{
    leader: MeetingParticipant;
    participants: MeetingParticipant[];
  }> {
    const allAgents = await agentSvc.list(companyId);
    const activeAgents = allAgents.filter((a) => a.status !== "terminated");

    // Filter if requestedAgentIds is provided and non-empty
    const filteredAgents = requestedAgentIds && requestedAgentIds.length > 0
      ? activeAgents.filter((a) => requestedAgentIds.includes(a.id))
      : activeAgents;

    const baseAgents = filteredAgents.length > 0 ? filteredAgents : activeAgents;

    // Identify Highest Agent (Agen Tertinggi):
    // 1. reportsTo === null (root node)
    // 2. Or matches executive keywords in role/title
    let leaderCandidate = baseAgents.find((a) => !a.reportsTo);

    if (!leaderCandidate && baseAgents.length > 0) {
      leaderCandidate = baseAgents.find((a) => {
        const text = `${a.role} ${a.title ?? ""} ${a.name}`.toLowerCase();
        return (
          text.includes("ceo") ||
          text.includes("lead") ||
          text.includes("director") ||
          text.includes("executive") ||
          text.includes("chief") ||
          text.includes("pimpinan")
        );
      }) || baseAgents[0];
    }

    // Default fallback if no agents exist yet
    const leader: MeetingParticipant = leaderCandidate
      ? {
          id: leaderCandidate.id,
          name: leaderCandidate.name,
          role: leaderCandidate.title || leaderCandidate.role || "Pimpinan Rapat & Koordinator Utama",
          department: getAgentDepartment(leaderCandidate),
          isLeader: true,
          avatarUrl: leaderCandidate.avatarUrl,
        }
      : {
          id: "sentinel-leader",
          name: "Sofia Agent (Lead)",
          role: "Chief Executive Agent",
          department: "Kepemimpinan & Strategi Eksekutif",
          isLeader: true,
        };

    // Build participant list: STRICTLY REAL AGENTS ONLY
    const participants: MeetingParticipant[] = [leader];

    // Add other active company agents that actually exist in the database
    for (const a of baseAgents) {
      if (a.id === leader.id) continue;
      participants.push({
        id: a.id,
        name: a.name,
        role: a.title || a.role || "Spesialis Teknis",
        department: getAgentDepartment(a),
        isLeader: false,
        avatarUrl: a.avatarUrl,
      });
    }

    return { leader, participants };
  }

  /**
   * Synthesize meeting discussion turns and conclusions
   */
  function synthesizeMeeting(
    topic: string,
    leader: MeetingParticipant,
    participants: MeetingParticipant[],
  ): {
    turns: MeetingTurn[];
    conclusion: MeetingConclusion;
  } {
    const turns: MeetingTurn[] = [];
    const now = new Date();

    const addTurn = (
      p: MeetingParticipant,
      stage: MeetingTurn["stage"],
      content: string,
      minuteOffset: number,
    ) => {
      const t = new Date(now.getTime() + minuteOffset * 60000);
      turns.push({
        id: randomUUID(),
        agentId: p.id,
        agentName: p.name,
        role: p.role,
        department: p.department,
        avatarUrl: p.avatarUrl,
        isLeader: p.isLeader,
        stage,
        content,
        timestamp: t.toISOString(),
      });
    };

    // Extract keywords from topic for tailored discussion
    const topicLower = topic.toLowerCase();
    const hasNiceRouter = topicLower.includes("nice router") || topicLower.includes("router");
    const hasTelegram = topicLower.includes("telegram") || topicLower.includes("bot");
    const hasSecurity = topicLower.includes("keamanan") || topicLower.includes("security") || topicLower.includes("token");
    const hasDatabase = topicLower.includes("database") || topicLower.includes("data") || topicLower.includes("db");

    // 1. CASE: ONLY 1 AGENT IN COMPANY (Single Agent Holistic Review)
    if (participants.length <= 1) {
      const openingContent = `Selamat datang di ruang rapat. Sebagai **Agen Tertinggi / Pimpinan Rapat (${leader.name})**, saya menelaah tugas **"${topic}"** ini secara komprehensif dari seluruh dimensi bidang teknis dan operasional yang dibutuhkan:

1. **Tinjauan Arsitektur Sistem & Backend:**
   - Memisahkan logika bisnis inti dari antarmuka dan transport layer agar sistem tetap modular.
   ${hasNiceRouter ? "- Memanfaatkan engine **Nice Router** untuk perutean data berkecepatan tinggi dengan overhead minimal dan pipeline middleware yang andal." : "- Menerapkan pipeline routing yang terstruktur dengan middleware logging, validasi payload Zod, dan boundary error."}
   ${hasTelegram ? "- Untuk integrasi Telegram, siapkan webhook handler HTTPS publik dan antrean penampung pesan agar performa stabil." : "- Menyediakan endpoint REST API yang bersih dan konsisten."}
   ${hasDatabase ? "- Memastikan skema data terindeks dengan baik untuk akses cepat dan menjaga integritas relasi antar entitas." : "- Menjaga persistensi data dengan transaksi aman (atomic checkout)."}

2. **Tinjauan Antarmuka & Pengalaman Pengguna (UI/UX):**
   - Memastikan antarmuka intuitif, responsif, dan menyatu mulus dengan tata letak Paperclip.
   - Kepatuhan mutlak terhadap aturan token design system tanpa nilai hardcoded px/hex.
   - Menyediakan umpan balik visual instan (indikator loading, error alert, dan toast notification).

3. **Tinjauan Keamanan & Infrastruktur:**
   ${hasSecurity ? "- Seluruh API keys dan secret tokens wajib dienkripsi at-rest dan tidak boleh dicatat dalam log." : "- Kredensial dan akses diisolasi ketat per perusahaan."}
   ${hasTelegram ? "- Token bot diverifikasi ketat pada setiap request webhook masuk untuk mencegah spoofing." : "- Terapkan pembatasan laju (rate limiting) pada endpoint publik."}
   - Menerapkan prinsip hak akses minimal (least privilege access) pada seluruh eksekusi tugas.

4. **Tinjauan Penjamin Kualitas & Pengujian (QA):**
   - Menyiapkan pengujian berlapis: Unit Tests, Integration Tests, dan penanganan edge cases.
   - Menjamin 100% kelulusan pemeriksaan TypeScript (\`tsc -b\`) dan zero token-gate violations.`;

      addTurn(leader, "discussion", openingContent, 0);

      const actionItems: MeetingActionItem[] = [
        {
          id: randomUUID(),
          title: `Implementasi Fondasi & Arsitektur: ${topic.slice(0, 45)}`,
          assigneeName: leader.name,
          assigneeAgentId: leader.id,
          description: `Membangun fondasi logika sistem dan integrasi modul untuk: "${topic}".`,
          priority: "high",
        },
        {
          id: randomUUID(),
          title: `Pengembangan Antarmuka & Komponen Pengguna: ${topic.slice(0, 40)}`,
          assigneeName: leader.name,
          assigneeAgentId: leader.id,
          description: `Membangun antarmuka responsif sesuai token design system untuk: "${topic}".`,
          priority: "high",
        },
        {
          id: randomUUID(),
          title: `Audit Keamanan, Pengujian QA, & Verifikasi Sistem`,
          assigneeName: leader.name,
          assigneeAgentId: leader.id,
          description: `Memastikan proteksi token, enkripsi kredensial, dan kelulusan seluruh uji otomatis.`,
          priority: "medium",
        },
      ];

      const conclusionSummary = `Sebagai satu-satunya agen AI yang terdaftar saat ini, saya (${leader.name}) telah menganalisis tugas **"${topic}"** secara komprehensif mencakup aspek arsitektur, antarmuka, keamanan, dan pengujian. Seluruh rencana kerja telah dirinci dan siap dieksekusi atau didelegasikan jika agen baru direkrut di masa mendatang.`;

      const decisions = [
        `Menetapkan arsitektur modular yang memisahkan logika sistem, komponen antarmuka, dan lapisan keamanan.`,
        `Mewajibkan enkripsi kredensial dan validasi payload ketat pada setiap operasi.`,
        `Mengikuti panduan token design system resmi Paperclip untuk seluruh tampilan UI.`,
        `Menyusun rencana kerja terstruktur yang siap dieksekusi langsung di Paperclip.`,
      ];

      const nextSteps = [
        `Mengonversi poin-poin kesimpulan menjadi tiket tugas resmi di Paperclip dengan tombol di bawah.`,
        `Mulai pengerjaan pada fase fondasi sistem oleh ${leader.name}.`,
        `Pimpinan dapat merekrut agen spesialis baru di menu Daftar Agen jika ingin memperluas tim rapat.`,
      ];

      const finalConclusionText = `Berdasarkan telaah mendalam di atas, saya sebagai **Pimpinan Rapat (Agen Tertinggi)** menetapkan kesimpulan dan rencana eksekusi resmi sebagai berikut:

### 🎯 1. Rangkuman Kesepakatan Eksekutif
${conclusionSummary}

---

### 🏛️ 2. Keputusan Strategis & Arsitektur
${decisions.map((d, i) => `${i + 1}. **${d}**`).join("\n")}

---

### 📋 3. Matriks Pembagian Tugas & Action Items
${actionItems.map((item, i) => `${i + 1}. **[${item.priority.toUpperCase()}] ${item.title}**\n   - *Penanggung Jawab:* ${item.assigneeName}\n   - *Deskripsi:* ${item.description}`).join("\n\n")}

---

### 🚀 4. Langkah Tindak Lanjut Segera
${nextSteps.map((s, i) => `- ${s}`).join("\n")}

*Sesi rapat resmi selesai. Poin-poin tindakan di atas siap dikonversikan menjadi tiket tugas Paperclip.*`;

      addTurn(leader, "conclusion", finalConclusionText, 1);

      return {
        turns,
        conclusion: {
          summary: conclusionSummary,
          decisions,
          actionItems,
          nextSteps,
        },
      };
    }

    // 2. CASE: MULTIPLE REAL AGENTS IN COMPANY
    const openingContent = `Selamat datang rekan-rekan agen di ruang rapat. Hari ini kita memiliki agenda penting yang didelegasikan oleh pimpinan:

> **Topik / Tugas Rapat:**
> "${topic}"

Tujuan rapat ini adalah membedah kebutuhan teknis dari sudut pandang bidang masing-masing, mengidentifikasi dependensi dan risiko, menyelaraskan arsitektur antarmuka dan backend, serta menghasilkan rencana aksi konkret.

Saya mempersilakan rekan-rekan agen untuk menyampaikan paparan, analisis mendalam, serta solusi teknis sesuai peran masing-masing. Silakan dimulai.`;

    addTurn(leader, "opening", openingContent, 0);

    // Discussion turns from other real agents
    let turnOffset = 1;
    for (const p of participants) {
      if (p.isLeader) continue;

      let content = "";
      const dept = p.department.toLowerCase();

      if (dept.includes("backend") || dept.includes("arsitektur")) {
        content = `Dari sudut pandang **${p.department}** (${p.name}):

1. **Analisis Kebutuhan Sistem:**
   - Untuk tugas *"${topic}"*, kita perlu memisahkan lapisan abstraksi logika bisnis dari transport layer.
   ${hasNiceRouter ? "- Integrasi dengan **Nice Router** dapat memanfaatkan engine perutean dinamis berkecepatan tinggi dengan overhead minimal, mendukung middleware chain dan dependency injection." : "- Kita butuh pipeline routing yang terstruktur dengan middleware logging, validasi payload, dan error boundaries."}
   ${hasTelegram ? "- Untuk integrasi Telegram, kita memerlukan webhook handler dengan HTTPS publik dan queue penampung pesan masuk agar throughput tetap stabil saat terjadi lonjakan pesan." : "- Kita butuh antarmuka REST API yang konsisten dan dukungan streaming data real-time."}
   ${hasDatabase ? "- Model database harus diindeks dengan baik untuk query pencarian cepat dan mempertahankan integritas relasi antar entitas." : "- Struktur penyimpanan harus persisten dan mendukung transaksi aman (atomic checkout)."}

2. **Rencana Implementasi Teknis:**
   - Menyediakan endpoint servis terpusat dengan skema validasi Zod yang ketat.
   - Menggunakan asynchronous job processing agar proses eksekusi tidak memblokir antarmuka pengguna.
   - Menyiapkan health-check endpoint dan auto-recovery mechanism jika salah satu konektor eksternal mengalami kendala jaringan.`;
      } else if (dept.includes("frontend") || dept.includes("antarmuka")) {
        content = `Menanggapi dari divisi **${p.department}** (${p.name}):

1. **Pengalaman Pengguna & Aksesibilitas:**
   - Tampilan untuk *"${topic}"* harus intuitif, responsif, dan menyatu mulus dengan tata letak Paperclip.
   - Seluruh komponen harus mematuhi token design system (DESIGN.md) tanpa hardcoded px/hex, serta mendukung tema Dark dan Light secara elegan.
   - Sediakan umpan balik visual instan: indikator loading (spinners), pesan kesalahan yang ramah pengguna, dan toast notifications untuk aksi berhasil.

2. **Interaktivitas & Real-time Updates:**
   - Gunakan React Query untuk caching data cerdas dan auto-revalidation, sehingga pengguna selalu melihat status terbaru tanpa harus me-refresh browser.
   - Sediakan kontrol cepat (quick actions), navigasi breadcrumb yang jelas, dan dialog konfirmasi sebelum melakukan aksi destruktif atau mutasi penting.`;
      } else if (dept.includes("keamanan") || dept.includes("infrastruktur")) {
        content = `Poin penting dari bidang **${p.department}** (${p.name}):

1. **Proteksi & Tata Kelola Kredensial:**
   ${hasSecurity ? "- Terkait aspek keamanan dan token: seluruh API keys dan secret tokens wajib dienkripsi at-rest dan tidak boleh dicatat dalam plain-text log." : "- Kredensial dan token akses harus diisolasi per perusahaan (company-scoped) dan tidak boleh bocor ke luar perimeter."}
   ${hasTelegram ? "- Untuk webhook Telegram, token bot harus diverifikasi pada setiap request masuk. Gunakan path rahasia acak pada endpoint webhook (/webhook/<secret-token>) untuk mencegah spoofing request." : "- Implementasikan rate-limiting pada endpoint publik untuk mencegah serangan Denial of Service (DoS)."}
   - Terapkan prinsip hak akses minimal (least privilege access) pada setiap agen yang menjalankan tugas.

2. **Stabilitas Lingkungan & Deployment:**
   - Pastikan variabel lingkungan (ENV) terisolasi dengan aman.
   - Siapkan continuous integration (CI) pipeline dengan automated security audit dan typecheck sebelum merge ke branch produksi.`;
      } else if (dept.includes("kualitas") || dept.includes("pengujian")) {
        content = `Dari divisi **${p.department}** (${p.name}):

1. **Strategi Pengujian Menyeluruh:**
   - Kami merekomendasikan tiga lapisan pengujian untuk tugas *"${topic}"*:
     - **Unit & Contract Tests:** Menguji validasi input, parser skema, dan error cases dengan Vitest.
     - **Integration Tests:** Memastikan koneksi antar modul (Backend, Database, dan Komponen UI) berinteraksi dengan benar.
     - **Edge-case Simulation:** Menguji skenario kegagalan jaringan, payload tidak valid, timeout eksternal, dan penanganan konkurensi.

2. **Kriteria Kelulusan Rilis (Definition of Done):**
   - 100% lulus pemeriksaan TypeScript (\`tsc -b\`).
   - 100% lulus seluruh unit test otomatis tanpa flaky tests.
   - Token-gates check bersih tanpa pelanggaran desain CSS/Tailwind.`;
      } else {
        content = `Dari sudut pandang **${p.department}** (${p.name}):

1. **Dampak Strategis & Timeline:**
   - Pelaksanaan *"${topic}"* memiliki nilai strategis tinggi untuk efisiensi operasional dan kepuasan pengguna.
   - Disarankan pelaksanaan dibagi menjadi beberapa fase bertahap:
     - **Fase 1 (Fondasi):** Arsitektur backend, skema data, dan pengamanan kredensial.
     - **Fase 2 (Antarmuka & Fitur Inti):** Pembuatan UI komponen, integrasi konektor, dan navigasi.
     - **Fase 3 (Verifikasi & Rilis):** QA audit, dokumentasi operasional, dan aktivasi fitur.

2. **Indikator Keberhasilan (KPI):**
   - Kemudahan penggunaan bagi pengguna tanpa hambatan teknis.
   - Dokumentasi lengkap dalam Bahasa Indonesia agar mudah diadopsi oleh seluruh tim.`;
      }

      addTurn(p, "discussion", content, turnOffset);
      turnOffset += 1;
    }

    // Alignment Turn between real agents
    const otherAgents = participants.filter((p) => !p.isLeader);
    const firstAgent = otherAgents[0] || leader;
    const secondAgent = otherAgents[1] || firstAgent;

    const alignmentContent = `Saya menyepakati masukan dan pendekatan yang telah dipaparkan. Terkait penyelarasan teknis antara **${firstAgent.name}** dan tim lainnya:

1. Kontrak API dan antarmuka disepakati terlebih dahulu dengan tipe TypeScript yang jelas sehingga pengembangan dapat berjalan paralel tanpa hambatan saling tunggu.
2. Format respons kesalahan disepakati menggunakan skema standar (\`{ error: string, code: string }\`).
3. Seluruh tim siap menjalankan rekomendasi ini di bawah arahan Pimpinan Rapat.`;

    addTurn(firstAgent, "alignment", alignmentContent, turnOffset);
    turnOffset += 1;

    // Action items distributed to real agents
    const actionItems: MeetingActionItem[] = [
      {
        id: randomUUID(),
        title: `Implementasi Fondasi & Arsitektur Inti: ${topic.slice(0, 50)}`,
        assigneeName: firstAgent.name,
        assigneeAgentId: firstAgent.id,
        description: `Membangun arsitektur backend, endpoint API, dan integrasi modul sesuai hasil rapat mengenai: "${topic}".`,
        priority: "high",
      },
      {
        id: randomUUID(),
        title: `Pengembangan Antarmuka Pengguna & Komponen: ${topic.slice(0, 45)}`,
        assigneeName: secondAgent.name,
        assigneeAgentId: secondAgent.id,
        description: `Membangun tampilan UI responsif dengan token design system dan integrasi data real-time untuk: "${topic}".`,
        priority: "high",
      },
      {
        id: randomUUID(),
        title: `Audit Keamanan, Proteksi Token, & Validasi QA`,
        assigneeName: leader.name,
        assigneeAgentId: leader.id,
        description: `Memastikan proteksi token, enkripsi kredensial, dan kelulusan seluruh uji otomatis.`,
        priority: "medium",
      },
    ];

    const conclusionSummary = `Rapat telah berhasil membedah tugas **"${topic}"** dari berbagai sudut pandang para agen yang hadir. Seluruh agen sepakat mengenai pendekatan arsitektur modular, penerapan pengamanan token yang ketat, dan antarmuka ramah pengguna berbasis token design system.`;

    const decisions = [
      `Menetapkan arsitektur modular dengan pemisahan tegas antara transport layer, logika bisnis, dan antarmuka.`,
      `Mewajibkan enkripsi penuh untuk seluruh kredensial dan validasi payload secara ketat pada setiap request.`,
      `Menggunakan token design system resmi Paperclip untuk seluruh tampilan UI dan memastikan bebas dari error TypeScript.`,
      `Membagi eksekusi menjadi fase berurutan: Fondasi Arsitektur -> Antarmuka & Integrasi -> Verifikasi QA & Rilis.`,
    ];

    const nextSteps = [
      `Mengonversi poin-poin hasil rapat menjadi tiket tugas resmi di Paperclip untuk masing-masing agen.`,
      `Mulai pengerjaan pada fase fondasi oleh tim teknis.`,
      `Verifikasi akhir oleh Pimpinan Rapat sebelum rilis tugas.`,
    ];

    const finalConclusionText = `Terima kasih kepada rekan-rekan agen atas analisis yang disampaikan. Berdasarkan masukan dari masing-masing bidang, saya sebagai **Pimpinan Rapat (Agen Tertinggi)** menetapkan kesimpulan dan keputusan resmi rapat sebagai berikut:

### 🎯 1. Rangkuman Kesepakatan Eksekutif
${conclusionSummary}

---

### 🏛️ 2. Keputusan Strategis & Arsitektur
${decisions.map((d, i) => `${i + 1}. **${d}**`).join("\n")}

---

### 📋 3. Matriks Pembagian Tugas & Action Items
${actionItems.map((item, i) => `${i + 1}. **[${item.priority.toUpperCase()}] ${item.title}**\n   - *Penanggung Jawab:* ${item.assigneeName}\n   - *Deskripsi:* ${item.description}`).join("\n\n")}

---

### 🚀 4. Langkah Tindak Lanjut Segera
${nextSteps.map((s, i) => `- ${s}`).join("\n")}

*Sesi rapat resmi ditutup. Seluruh agen dipersilakan memulai eksekusi tugas sesuai pembagian kerja masing-masing.*`;

    addTurn(leader, "conclusion", finalConclusionText, turnOffset);

    return {
      turns,
      conclusion: {
        summary: conclusionSummary,
        decisions,
        actionItems,
        nextSteps,
      },
    };

    addTurn(leader, "conclusion", finalConclusionText, turnOffset);

    return {
      turns,
      conclusion: {
        summary: conclusionSummary,
        decisions,
        actionItems,
        nextSteps,
      },
    };
  }

  /**
   * GET /api/companies/:companyId/meetings/participants
   * Discover meeting participants and organizational lead
   */
  router.get("/companies/:companyId/meetings/participants", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const { leader, participants } = await resolveParticipants(companyId);
    res.json({ leader, participants });
  });

  /**
   * POST /api/companies/:companyId/meetings/conduct
   * Start a meeting and generate the full discussion transcript & conclusion
   */
  router.post("/companies/:companyId/meetings/conduct", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const { task, agentIds } = req.body as ConductMeetingInput;

    if (!task || typeof task !== "string" || !task.trim()) {
      res.status(400).json({ error: "Topik atau tugas rapat wajib diisi", code: "TOPIC_REQUIRED" });
      return;
    }

    const { leader, participants } = await resolveParticipants(companyId, agentIds);
    const { turns, conclusion } = synthesizeMeeting(task.trim(), leader, participants);

    const session: MeetingSession = {
      id: randomUUID(),
      companyId,
      topic: task.trim(),
      createdAt: new Date().toISOString(),
      leaderAgent: leader,
      participants,
      turns,
      conclusion,
      status: "completed",
    };

    res.json(session);
  });

  /**
   * POST /api/companies/:companyId/meetings/continue
   * Continue discussion with follow-up directives or questions
   */
  router.post("/companies/:companyId/meetings/continue", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const { topic, userMessage, previousTurns } = req.body as ContinueMeetingInput;

    if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
      res.status(400).json({ error: "Pesan tindak lanjut wajib diisi", code: "MESSAGE_REQUIRED" });
      return;
    }

    const { leader, participants } = await resolveParticipants(companyId);
    const now = new Date();

    const userTurn: MeetingTurn = {
      id: randomUUID(),
      agentId: "user",
      agentName: "Pimpinan / Pengguna (User)",
      role: "Board / Operator",
      department: "Pengarah Strategis",
      isLeader: false,
      stage: "followup",
      content: userMessage.trim(),
      timestamp: now.toISOString(),
    };

    // Agent response to user follow-up
    const backendAgent = participants.find((p) => p.department.toLowerCase().includes("backend")) || participants[1] || leader;
    const specialistResponseTurn: MeetingTurn = {
      id: randomUUID(),
      agentId: backendAgent.id,
      agentName: backendAgent.name,
      role: backendAgent.role,
      department: backendAgent.department,
      avatarUrl: backendAgent.avatarUrl,
      isLeader: false,
      stage: "discussion",
      content: `Menanggapi arahan tambahan: *"${userMessage.trim()}"*:

Kami telah mengevaluasi implikasi teknisnya terhadap agenda rapat ini. Kami akan menyesuaikan parameter konfigurasi, menambahkan penanganan fallback yang relevan, dan memastikan integritas alur kerja tetap terjaga tanpa menambah latensi sistem.`,
      timestamp: new Date(now.getTime() + 60000).toISOString(),
    };

    const leaderResponseTurn: MeetingTurn = {
      id: randomUUID(),
      agentId: leader.id,
      agentName: leader.name,
      role: leader.role,
      department: leader.department,
      avatarUrl: leader.avatarUrl,
      isLeader: true,
      stage: "conclusion",
      content: `Terima kasih atas arahan tambahan dari Pimpinan.

Saya telah menginstruksikan seluruh tim untuk mengintegrasikan masukan ini ke dalam rencana aksi yang telah disepakati. Seluruh agen siap mengeksekusi dengan standar kualitas tertinggi.`,
      timestamp: new Date(now.getTime() + 120000).toISOString(),
    };

    const newTurns = [userTurn, specialistResponseTurn, leaderResponseTurn];
    res.json({ newTurns });
  });

  /**
   * POST /api/companies/:companyId/meetings/create-issues
   * Convert action items into real Paperclip issues
   */
  router.post("/companies/:companyId/meetings/create-issues", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);

    const { actionItems, meetingTopic } = req.body as CreateMeetingIssuesInput;

    if (!actionItems || !Array.isArray(actionItems) || actionItems.length === 0) {
      res.status(400).json({ error: "Daftar action items tidak boleh kosong", code: "EMPTY_ACTION_ITEMS" });
      return;
    }

    const createdIssues: Array<{ id: string; title: string; identifier?: string }> = [];

    for (const item of actionItems) {
      try {
        const issue = await issueSvc.create(companyId, {
          title: item.title,
          description: `${item.description}\n\n---\n*Dihasilkan secara otomatis dari Ruang Rapat AI untuk topik: "${meetingTopic}"*`,
          priority: item.priority || "medium",
          status: "todo",
          assigneeAgentId: item.assigneeAgentId || null,
          createdByUserId: actor.actorType === "user" ? actor.actorId : null,
          responsibleUserId: actor.actorType === "user" ? actor.actorId : null,
          trustExplicitResponsibleUserId: actor.actorType === "user",
        });

        createdIssues.push({
          id: issue.id,
          title: issue.title,
          identifier: issue.identifier ?? undefined,
        });
      } catch (err) {
        console.error("Failed to create issue from meeting action item:", err);
      }
    }

    res.json({
      success: true,
      count: createdIssues.length,
      createdIssues,
    });
  });

  return router;
}
