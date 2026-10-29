import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useToast } from "../context/ToastContext";
import { meetingsApi } from "../api/meetings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MarkdownBody } from "../components/MarkdownBody";
import { copyTextToClipboard } from "../lib/clipboard";
import type {
  MeetingSession,
  MeetingTurn,
  MeetingParticipant,
  MeetingActionItem,
} from "@paperclipai/shared";
import {
  MessagesSquare,
  Users,
  Sparkles,
  Crown,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Send,
  Download,
  Copy,
  Check,
  Briefcase,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Loader2,
  ListChecks,
  ChevronRight,
  Building2,
  Calendar,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_TEMPLATES = [
  {
    label: "Arsitektur Nice Router v2",
    task: "Rancang peluncuran dan arsitektur integrasi Nice Router versi 2.0 dengan penanganan rute modular dan performa tinggi.",
  },
  {
    label: "Integrasi Telegram & Webhook",
    task: "Rancang integrasi bot Telegram 2 arah dengan pengamanan webhook token HTTPS publik dan penanganan antrean pesan.",
  },
  {
    label: "Audit Keamanan & Hak Akses",
    task: "Lakukan audit kepatuhan keamanan menyeluruh untuk kredensial API dan terapkan prinsip hak akses minimal (least privilege).",
  },
  {
    label: "Optimasi Database & Performa",
    task: "Identifikasi hambatan query database, lakukan indexing relasional, dan tingkatkan throughput respon sistem.",
  },
];

export function Meetings() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Ruang Rapat", href: "/meetings" },
      { label: "Sesi Diskusi Multi-Agen" },
    ]);
  }, [setBreadcrumbs]);

  // Local state
  const [taskInput, setTaskInput] = useState("");
  const [activeSession, setActiveSession] = useState<MeetingSession | null>(null);
  const [sessionsHistory, setSessionsHistory] = useState<MeetingSession[]>([]);
  const [followupInput, setFollowupInput] = useState("");
  const [createdIssueMap, setCreatedIssueMap] = useState<Record<string, { id: string; identifier?: string }>>({});
  const [copiedNotulen, setCopiedNotulen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const turnsEndRef = useRef<HTMLDivElement>(null);

  // Load participants & leader
  const { data: participantsData, isLoading: participantsLoading } = useQuery({
    queryKey: ["meetings-participants", selectedCompanyId],
    queryFn: () => meetingsApi.getParticipants(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  // Load history from localStorage
  useEffect(() => {
    if (!selectedCompanyId) return;
    try {
      const stored = localStorage.getItem(`dsln_meetings_history_${selectedCompanyId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as MeetingSession[];
        setSessionsHistory(parsed);
      }
    } catch (e) {
      console.error("Gagal memuat riwayat rapat:", e);
    }
  }, [selectedCompanyId]);

  // Save history to localStorage
  const saveSessionToHistory = (session: MeetingSession) => {
    if (!selectedCompanyId) return;
    try {
      const existing = sessionsHistory.filter((s) => s.id !== session.id);
      const updated = [session, ...existing].slice(0, 20); // Simpan 20 rapat terakhir
      setSessionsHistory(updated);
      localStorage.setItem(`dsln_meetings_history_${selectedCompanyId}`, JSON.stringify(updated));
    } catch (e) {
      console.error("Gagal menyimpan riwayat rapat:", e);
    }
  };

  // Conduct meeting mutation
  const conductMutation = useMutation({
    mutationFn: (task: string) => meetingsApi.conduct(selectedCompanyId!, { task }),
    onSuccess: (session) => {
      setActiveSession(session);
      saveSessionToHistory(session);
      pushToast({
        title: "Rapat Selesai",
        body: "Seluruh agen telah berdiskusi dan Pimpinan Rapat telah menetapkan kesimpulan.",
        tone: "success",
      });
      setTimeout(() => {
        turnsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    },
    onError: (err: Error) => {
      pushToast({
        title: "Gagal Mengadakan Rapat",
        body: err.message || "Terjadi kesalahan saat memulai sesi rapat.",
        tone: "error",
      });
    },
  });

  // Follow-up continue mutation
  const continueMutation = useMutation({
    mutationFn: (message: string) =>
      meetingsApi.continue(selectedCompanyId!, {
        meetingId: activeSession!.id,
        topic: activeSession!.topic,
        userMessage: message,
        previousTurns: activeSession!.turns,
      }),
    onSuccess: (res) => {
      if (!activeSession) return;
      const updatedTurns = [...activeSession.turns, ...res.newTurns];
      const updatedSession: MeetingSession = {
        ...activeSession,
        turns: updatedTurns,
      };
      setActiveSession(updatedSession);
      saveSessionToHistory(updatedSession);
      setFollowupInput("");
      setTimeout(() => {
        turnsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    },
    onError: (err: Error) => {
      pushToast({
        title: "Gagal Mengirim Tanggapan",
        body: err.message,
        tone: "error",
      });
    },
  });

  // Create issue from action item mutation
  const createIssuesMutation = useMutation({
    mutationFn: (actionItems: MeetingActionItem[]) =>
      meetingsApi.createIssues(selectedCompanyId!, {
        actionItems,
        meetingTopic: activeSession?.topic || "Rapat Agen",
      }),
    onSuccess: (res) => {
      const newMap = { ...createdIssueMap };
      for (const created of res.createdIssues) {
        newMap[created.title] = { id: created.id, identifier: created.identifier };
      }
      setCreatedIssueMap(newMap);
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      pushToast({
        title: "Tugas Berhasil Dibuat",
        body: `${res.count} tiket tugas telah berhasil didaftarkan ke sistem Paperclip.`,
        tone: "success",
      });
    },
    onError: (err: Error) => {
      pushToast({
        title: "Gagal Membuat Tugas",
        body: err.message,
        tone: "error",
      });
    },
  });

  const handleStartMeeting = () => {
    if (!taskInput.trim()) {
      pushToast({
        title: "Topik Diperlukan",
        body: "Silakan masukkan topik tugas atau pembahasan rapat terlebih dahulu.",
        tone: "warn",
      });
      return;
    }
    conductMutation.mutate(taskInput.trim());
  };

  const handleCopyNotulen = async () => {
    if (!activeSession) return;
    const { topic, leaderAgent, participants, turns, conclusion } = activeSession;

    const notulenText = `# NOTULEN RAPAT RESMI AGEN AI - ${selectedCompany?.name || "DSLN CAPITAL"}
Tanggal: ${new Date(activeSession.createdAt).toLocaleString("id-ID")}
Topik Pembahasan: ${topic}
Pimpinan Rapat (Agen Tertinggi): ${leaderAgent.name} (${leaderAgent.role})

---

## 1. DAFTAR PESERTA RAPAT
${participants.map((p) => `- ${p.name} | Bidang: ${p.department} (${p.role}) ${p.isLeader ? "[PIMPINAN]" : ""}`).join("\n")}

---

## 2. TRANSKRIP PEMBAHASAN RAPAT
${turns
  .map(
    (t) =>
      `### [${t.stage.toUpperCase()}] ${t.agentName} (${t.department})\n${t.content}\n`,
  )
  .join("\n---\n\n")}

---

## 3. KESIMPULAN & KEPUTUSAN FINAL (AGEN TERTINGGI)
${conclusion?.summary || ""}

### Keputusan Strategis:
${conclusion?.decisions?.map((d, i) => `${i + 1}. ${d}`).join("\n") || "-"}

### Action Items & Tindak Lanjut:
${conclusion?.actionItems?.map((a, i) => `${i + 1}. [${a.priority.toUpperCase()}] ${a.title} - PJ: ${a.assigneeName}\n   Deskripsi: ${a.description}`).join("\n") || "-"}

### Langkah Selanjutnya:
${conclusion?.nextSteps?.map((s) => `- ${s}`).join("\n") || "-"}
`;

    try {
      await copyTextToClipboard(notulenText);
      setCopiedNotulen(true);
      setTimeout(() => setCopiedNotulen(false), 2000);
      pushToast({
        title: "Notulen Disalin",
        body: "Dokumen notulen rapat lengkap berhasil disalin ke clipboard.",
        tone: "success",
      });
    } catch {
      pushToast({
        title: "Gagal Menyalin",
        body: "Tidak dapat menyalin notulen ke clipboard.",
        tone: "error",
      });
    }
  };

  const handleDownloadNotulen = () => {
    if (!activeSession) return;
    const blob = new Blob(
      [
        `# NOTULEN RAPAT: ${activeSession.topic}\nTanggal: ${activeSession.createdAt}\nPimpinan: ${activeSession.leaderAgent.name}\n\n` +
          activeSession.turns.map((t) => `## ${t.agentName} - ${t.department}\n${t.content}\n`).join("\n---\n"),
      ],
      { type: "text/markdown;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Notulen-Rapat-${activeSession.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const leader = participantsData?.leader;
  const participants = participantsData?.participants || [];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground overflow-y-auto">
      {/* Header Banner */}
      <div className="border-b border-border bg-card/60 px-6 py-5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <MessagesSquare className="size-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Ruang Rapat AI</h1>
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs font-semibold">
                Multi-Agent Conference
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Mode kolaborasi agen AI: delegasikan tugas, biarkan para spesialis berdiskusi sesuai bidang masing-masing, dan Agen Tertinggi merumuskan kesimpulan eksekutif.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeSession && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyNotulen}
                  className="gap-1.5 text-xs font-medium"
                >
                  {copiedNotulen ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copiedNotulen ? "Tersalin" : "Salin Notulen"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadNotulen}
                  className="gap-1.5 text-xs font-medium"
                >
                  <Download className="size-3.5" />
                  Unduh .MD
                </Button>
              </>
            )}

            <Button
              variant={showHistory ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="gap-1.5 text-xs font-medium"
            >
              <Calendar className="size-3.5" />
              Riwayat Rapat {sessionsHistory.length > 0 && `(${sessionsHistory.length})`}
            </Button>

            {activeSession && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setActiveSession(null);
                  setTaskInput("");
                }}
                className="gap-1.5 text-xs font-medium"
              >
                <Play className="size-3.5" />
                Rapat Baru
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Sidebar: Participants & Lead Info */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Highest Agent Card */}
          <Card className="p-4 border-primary/30 bg-primary/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="size-3.5 text-amber-500" />
                Agen Tertinggi / Pimpinan Rapat
              </span>
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">
                Ketua Sidang
              </Badge>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="size-11 rounded-full border border-primary/30 bg-card flex items-center justify-center font-bold text-base text-primary overflow-hidden shrink-0 shadow-xs">
                {leader?.avatarUrl ? (
                  <img src={leader.avatarUrl} alt={leader.name} className="size-full object-cover" />
                ) : (
                  leader?.name.slice(0, 2).toUpperCase() || "SA"
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-foreground truncate">{leader?.name || "Sofia Agent (Lead)"}</h3>
                <p className="text-xs text-muted-foreground truncate">{leader?.role || "Chief Executive Agent"}</p>
                <p className="text-xs text-primary font-medium mt-0.5">{leader?.department}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground border-t border-border/60 pt-2.5">
              Bertanggung jawab memoderasi jalannya pembahasan, menyelaraskan perspektif, dan <strong>mengambil kesimpulan final</strong> serta membagi tanggung jawab penugasan.
            </div>
          </Card>

          {/* Specialist Agents List */}
          <Card className="p-4 border-border bg-card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="size-3.5" />
                Peserta Rapat Sesuai Bidang ({participants.length})
              </h3>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Hadir
              </span>
            </div>

            <div className="space-y-2 mt-1">
              {participantsLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Memuat struktur agen...
                </div>
              ) : (
                <>
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg border border-border/60 bg-muted/30 flex items-center gap-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="size-8 rounded-full bg-card border border-border flex items-center justify-center font-semibold text-xs text-foreground shrink-0">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.name} className="size-full rounded-full object-cover" />
                        ) : (
                          p.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                          {p.isLeader && <Crown className="size-3 text-amber-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{p.department}</p>
                      </div>
                    </div>
                  ))}

                  {participants.length === 1 && (
                    <div className="p-3 rounded-lg border border-border/70 bg-muted/20 text-xs text-muted-foreground space-y-1.5 mt-2">
                      <p>
                        Saat ini baru ada <strong>1 agen AI terdaftar ({participants[0]?.name})</strong> di perusahaan Anda.
                      </p>
                      <p>
                        Ingin membentuk tim rapat multi-agen dengan spesialis bidang lain (Backend, Frontend, Keamanan, QA)?
                      </p>
                      <a
                        href="/agents/new"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-xs pt-0.5"
                      >
                        <Plus className="size-3" />
                        Rekrut Agen AI Baru
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Workflow Guide */}
          <Card className="p-4 border-border bg-card/40 flex flex-col gap-2.5 text-xs text-muted-foreground">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5">
              <ListChecks className="size-3.5 text-primary" />
              Alur Pelaksanaan Rapat
            </h4>
            <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground">
              <li>
                <strong className="text-foreground">Berikan Tugas:</strong> Ketik instruksi atau topik bahasan di panel utama.
              </li>
              <li>
                <strong className="text-foreground">Diskusi Bidang:</strong> Para spesialis (Backend, Frontend, Keamanan, QA, Produk) menganalisis sesuai perannya.
              </li>
              <li>
                <strong className="text-foreground">Penyelarasan Silang:</strong> Para agen menyinkronkan dependensi dan format antarmuka.
              </li>
              <li>
                <strong className="text-foreground">Keputusan Agen Tertinggi:</strong> Pemimpin menetapkan kesimpulan resmi dan matriks action items.
              </li>
              <li>
                <strong className="text-foreground">Eksekusi Tiket:</strong> Konversikan poin rapat menjadi tiket Paperclip dengan satu klik.
              </li>
            </ol>
          </Card>

          {/* History Drawer if toggled */}
          {showHistory && (
            <Card className="p-4 border-border bg-card flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  Sesi Rapat Tersimpan
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                  className="h-6 px-2 text-xs"
                >
                  Tutup
                </Button>
              </div>

              {sessionsHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">Belum ada riwayat rapat yang tersimpan.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {sessionsHistory.map((sess) => (
                    <div
                      key={sess.id}
                      onClick={() => {
                        setActiveSession(sess);
                        setShowHistory(false);
                      }}
                      className={cn(
                        "p-2.5 rounded-lg border text-left cursor-pointer transition-all",
                        activeSession?.id === sess.id
                          ? "border-primary bg-primary/10"
                          : "border-border/70 hover:border-primary/50 bg-muted/20 hover:bg-muted/40",
                      )}
                    >
                      <p className="text-xs font-semibold text-foreground line-clamp-1">{sess.topic}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <span>{new Date(sess.createdAt).toLocaleDateString("id-ID")}</span>
                        <span className="text-primary font-medium">{sess.turns.length} balasan</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Center / Right: Meeting Console & Stream */}
        <div className="lg:col-span-8 flex flex-col gap-5 min-h-0">
          {!activeSession ? (
            /* Meeting Starter Form */
            <Card className="p-6 border-border bg-card flex flex-col gap-5">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5">
                    Mulai Sesi Rapat Baru
                  </Badge>
                  <span className="text-xs text-muted-foreground">Kordinasi Multi-Disiplin</span>
                </div>
                <h2 className="text-lg font-bold text-foreground mt-2">
                  Apa agenda atau tugas yang ingin dibahas dalam rapat hari ini?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Ketik tugas atau masalah yang dihadapi. Para agen akan langsung mengadakan rapat kerja terstruktur, memberikan telaah teknis dari sudut pandang masing-masing, dan Pimpinan Rapat akan merangkum kesimpulan final.
                </p>
              </div>

              <div className="space-y-2">
                <Textarea
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder="Contoh: Rancang arsitektur implementasi Nice Router versi 2.0 dengan integrasi bot Telegram, pastikan keamanan webhook token HTTPS publik, serta alur pengujian QA..."
                  className="min-h-32 text-sm resize-y bg-background"
                />
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Pilih Contoh Topik Cepat:</span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => setTaskInput(tmpl.task)}
                      className="text-xs h-7 rounded-full bg-muted/40 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      <Sparkles className="size-3 text-primary mr-1" />
                      {tmpl.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <Button
                  onClick={handleStartMeeting}
                  disabled={conductMutation.isPending || !taskInput.trim()}
                  className="gap-2 px-6"
                >
                  {conductMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Para Agen Sedang Rapat...
                    </>
                  ) : (
                    <>
                      <Play className="size-4" />
                      Mulai Rapat Para Agen
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ) : (
            /* Active Meeting Stream */
            <div className="flex flex-col gap-5 min-h-0">
              {/* Meeting Meta Header */}
              <Card className="p-4 border-border bg-card/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                      Sesi Selesai & Terangkum
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(activeSession.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-foreground mt-1 line-clamp-2">
                    {activeSession.topic}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveSession(null);
                      setTaskInput("");
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <RotateCcw className="size-3.5" />
                    Topik Baru
                  </Button>
                </div>
              </Card>

              {/* Stepper Progress Bar */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 text-primary font-semibold">
                  1. Pembukaan Ketua
                </div>
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 text-primary font-semibold">
                  2. Analisis Bidang
                </div>
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 text-primary font-semibold">
                  3. Sinkronisasi Tim
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold">
                  4. Keputusan Final
                </div>
              </div>

              {/* Discussion Turns Timeline */}
              <div className="space-y-4">
                {activeSession.turns.map((turn, idx) => {
                  const isLeader = turn.isLeader;
                  const isUser = turn.agentId === "user";
                  const isConclusion = turn.stage === "conclusion";

                  return (
                    <div
                      key={turn.id || idx}
                      className={cn(
                        "p-4 rounded-xl border transition-all",
                        isConclusion
                          ? "border-amber-500/40 bg-amber-500/5 shadow-xs"
                          : isLeader
                            ? "border-primary/30 bg-primary/5"
                            : isUser
                              ? "border-blue-500/30 bg-blue-500/5 ml-6"
                              : "border-border bg-card",
                      )}
                    >
                      {/* Turn Author Header */}
                      <div className="flex items-center justify-between border-b border-border/50 pb-2.5 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "size-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                              isLeader
                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                : isUser
                                  ? "bg-blue-500/20 text-blue-600 border border-blue-500/30"
                                  : "bg-muted text-foreground border border-border",
                            )}
                          >
                            {isLeader ? (
                              <Crown className="size-3.5" />
                            ) : (
                              turn.agentName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-foreground">{turn.agentName}</span>
                              {isLeader && (
                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-semibold">
                                  Pimpinan Rapat (Agen Tertinggi)
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                {turn.department}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{turn.role}</span>
                          </div>
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {new Date(turn.timestamp).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Turn Markdown Body */}
                      <div className="text-sm text-foreground/90 leading-relaxed overflow-x-auto">
                        <MarkdownBody>{turn.content}</MarkdownBody>
                      </div>
                    </div>
                  );
                })}
                <div ref={turnsEndRef} />
              </div>

              {/* Action Items & Final Decisions Card */}
              {activeSession.conclusion && (
                <Card className="p-5 border-amber-500/30 bg-card flex flex-col gap-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Crown className="size-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">
                          Matriks Eksekusi & Tindak Lanjut Rapat
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Ditetapkan resmi oleh {activeSession.leaderAgent.name} (Agen Tertinggi)
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => createIssuesMutation.mutate(activeSession.conclusion!.actionItems)}
                      disabled={createIssuesMutation.isPending}
                      className="gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {createIssuesMutation.isPending ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Membuat Tugas...
                        </>
                      ) : (
                        <>
                          <ListChecks className="size-3.5" />
                          Konversi Jadi Tugas Paperclip ({activeSession.conclusion.actionItems.length})
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Action Item Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeSession.conclusion.actionItems.map((item, idx) => {
                      const createdIssue = createdIssueMap[item.title];

                      return (
                        <div
                          key={item.id || idx}
                          className="p-3.5 rounded-lg border border-border/80 bg-muted/20 flex flex-col justify-between gap-2.5"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs font-bold uppercase",
                                  item.priority === "high"
                                    ? "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10"
                                    : "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
                                )}
                              >
                                {item.priority} priority
                              </Badge>

                              {createdIssue ? (
                                <a
                                  href="/issues"
                                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                                >
                                  <CheckCircle2 className="size-3" />
                                  Tugas Dibuat {createdIssue.identifier ? `(${createdIssue.identifier})` : ""}
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground font-medium">
                                  PJ: {item.assigneeName}
                                </span>
                              )}
                            </div>

                            <h4 className="font-semibold text-xs text-foreground mt-1.5 leading-snug">
                              {item.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* User Follow-up Input */}
              <Card className="p-4 border-border bg-card flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <MessagesSquare className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    Ada arahan lanjutan atau pertanyaan untuk peserta rapat?
                  </span>
                </div>

                <div className="flex gap-2">
                  <Textarea
                    value={followupInput}
                    onChange={(e) => setFollowupInput(e.target.value)}
                    placeholder="Ketik pertanyaan atau tanggapan tambahan untuk para agen (misal: 'Bagaimana mitigasi jika server webhook down?')..."
                    className="min-h-16 text-sm resize-none bg-background flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (followupInput.trim() && !continueMutation.isPending) {
                          continueMutation.mutate(followupInput.trim());
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (followupInput.trim()) {
                        continueMutation.mutate(followupInput.trim());
                      }
                    }}
                    disabled={continueMutation.isPending || !followupInput.trim()}
                    className="h-auto px-5 shrink-0"
                  >
                    {continueMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Meetings;
