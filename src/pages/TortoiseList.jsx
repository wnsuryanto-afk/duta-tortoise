import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { bandingkanKandang, kunciUrutKandang, URUTAN_KELOMPOK, hitungIsiKandang, kuraDiKandang } from "@/lib/kandang";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ChevronDown, ChevronRight, Shell, PenLine, Home, Trees, Thermometer, Droplets, Users, Edit, Trash2, AlertTriangle, CalendarX, ShoppingBag, HeartPulse, RefreshCw, GitBranch, Clock } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import { idKuraDenganKasusTerbuka, sedangSakitLengkap } from "@/lib/kesehatanKura";
import { TortoiseArt } from "@/components/common/Illustration";
import TortoiseTerjualTab from "@/components/tortoise/TortoiseTerjualTab";
import ExportButton from "@/components/common/ExportButton";
import SaleWizard from "@/components/sales/SaleWizard";
import TortoiseCard from "@/components/tortoise/TortoiseCard";
import TortoiseForm from "@/components/tortoise/TortoiseForm";
import MoveEnclosureDialog from "@/components/tortoise/MoveEnclosureDialog";
import RenameEnclosureDialog from "@/components/tortoise/RenameEnclosureDialog";
import EnclosureForm from "@/components/enclosure/EnclosureForm";
import EmptyState from "@/components/common/EmptyState";
import CardSkeleton from "@/components/common/Skeleton";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getPerms, canDelete as canDeleteGlobal, isManagerLevel, canAccess } from "@/lib/permissions";
import KuraDiamTab from "@/components/tortoise/KuraDiamTab";
import SilsilahTab from "@/components/tortoise/SilsilahTab";
import { diPeternakan } from "@/lib/populasiKura";
import { getMissingFields } from "@/lib/incompleteChecks";
import { recalcEnclosureCountsAman, recalcEnclosureCounts } from "@/lib/enclosureCount";
import { anakan, hanyaAnakan } from "@/lib/anakanKura";

/**
 * Status kepenuhan kandang, dihitung dari ISI NYATA.
 *
 * ── Kenapa `enc.current_count` tidak dipakai lagi ──────────────────────────
 *
 * Di kartu kandang yang sama, dua angka datang dari dua sumber berbeda:
 * lencana statusnya ("Normal" / "Hampir Penuh" / "Kapasitas melebihi batas!")
 * dibaca dari kolom tersimpan `current_count`, sementara angka "28 / 36" tepat
 * di bawahnya dihitung langsung dari daftar kura. Selama keduanya kebetulan
 * sinkron tidak ada yang terasa; begitu melenceng, satu kartu menampilkan
 * "Normal" di atas angka yang jelas melebihi kapasitas.
 *
 * `current_count` hanya berubah saat seseorang menekan "Sinkronkan" di halaman
 * Kandang — jadi ia SELALU tertinggal sampai ada yang mengingatnya.
 *
 * Sekarang keduanya memakai angka yang sama: isi yang dihitung saat itu juga.
 */
function getEnclosureStatus(enc, isi) {
  const kapasitas = Number(enc?.max_capacity) || 0;
  if (!kapasitas) return "normal";
  if (isi > kapasitas) return "overcrowded";
  if (isi >= kapasitas * 0.8) return "warning";
  return "normal";
}

export default function TortoiseList() {
  const queryClient = useQueryClient();
  const { role, user } = useCurrentUser();
  const perms = getPerms(role, "tortoise");
  const canEditEnclosure = isManagerLevel(role);
  // Hapus permanen hanya untuk owner
  const ownerCanDelete = canDeleteGlobal(role);
  /*
    ── TAB DISIMPAN DI URL ────────────────────────────────────────────────
    Halaman Kandang yang berdiri sendiri (/enclosure) dihapus pada 29-09-2026
    dan digabung ke tab "Kandang" di sini. Supaya tautan lama — dua dari
    beranda pemilik, satu dari checklist awal, satu dari Data Belum Lengkap —
    tetap mendarat di tempat yang benar, tabnya harus bisa disebut di alamat.

    Manfaat keduanya: tombol kembali peramban bekerja antar tab, dan alamat
    tabnya bisa dikirim ke orang lain.
  */
  const [searchParams, setSearchParams] = useSearchParams();
  // "kematian" TIDAK ada di sini lagi — ia mengalihkan ke /death-records.
  //
  // "silsilah" dan "diam" masuk 30-09-2026 dari halamannya masing-masing.
  // Keduanya DIJAGA IZIN: `family-tree` tidak dimiliki kiper dan `kura-diam`
  // hanya dimiliki owner/admin/manajer, sedangkan `tortoise` dimiliki semua
  // peran. Tanpa penjaga, menyatukannya ke sini akan diam-diam melebarkan
  // akses — penyederhanaan yang membuka pintu bukan penyederhanaan.
  const TAB_SAH = ["kura", "kandang", "karantina", "terjual", "silsilah", "diam"];
  const tabDariUrl = searchParams.get("tab");
  const bolehSilsilah = canAccess(role, "family-tree");
  const bolehDiam = canAccess(role, "kura-diam");
  const tabBoleh = (t) =>
    TAB_SAH.includes(t) &&
    (t !== "silsilah" || bolehSilsilah) &&
    (t !== "diam" || bolehDiam);
  const mainTab = tabBoleh(tabDariUrl) ? tabDariUrl : "kura";
  const setMainTab = (nilai) => {
    const next = new URLSearchParams(searchParams);
    if (nilai === "kura") next.delete("tab");
    else next.set("tab", nilai);
    // `replace`: berpindah tab bukan langkah riwayat yang layak ditumpuk
    // setiap kali, tapi alamatnya tetap benar bila disalin.
    setSearchParams(next, { replace: true });
  };

  // Tortoise state
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [renameEnclosure, setRenameEnclosure] = useState(null);
  const [syncingKandang, setSyncingKandang] = useState(false);
  const [search, setSearch] = useState("");
  /*
    Saringan status dibaca dari ALAMAT, bukan selalu mulai dari "semua".

    Ubin "Anakan" di beranda menautkan ke /tortoise?status=baby. Tanpa ini,
    tautan itu membuka daftar lengkap 178 kura dan orang harus mencari sendiri
    saringan mana yang tadi ia tekan — angka yang bisa diklik tetapi tidak
    membawa ke mana-mana sama saja dengan angka yang tidak bisa diklik.

    Nilai yang tidak dikenal diabaikan: alamat yang diketik asal tidak boleh
    menghasilkan daftar kosong tanpa keterangan.
  */
  const STATUS_SAH = ["semua", "baby", "aktif", "sakit", "breeding", "karantina", "mati", "terjual", "diarsipkan"];
  const statusDariUrl = searchParams.get("status");
  const [statusFilter, setStatusFilter] = useState(
    STATUS_SAH.includes(statusDariUrl) ? statusDariUrl : "semua",
  );
  const [genderFilter, setGenderFilter] = useState("semua");
  const [morphFilter, setMorphFilter] = useState("semua");
  const [shellTypeFilter, setShellTypeFilter] = useState("semua");
  const [provenFilter, setProvenFilter] = useState("semua");
  const [speciesFilter, setSpeciesFilter] = useState("semua");
  const [enclosureFilter, setEnclosureFilter] = useState(null);
  const [incompleteFilter, setIncompleteFilter] = useState(false);
  const [viewMode, setViewMode] = useState("kandang");
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Enclosure state
  const [showEnclosureForm, setShowEnclosureForm] = useState(false);
  const [editingEnclosure, setEditingEnclosure] = useState(null);
  const [showSellWizard, setShowSellWizard] = useState(false);
  const [sellTarget, setSellTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedEnclosureDetail, setSelectedEnclosureDetail] = useState(null);

  // Karantina state
  const [quarantineFilter, setQuarantineFilter] = useState("all");
  const [weightFilter, setWeightFilter] = useState("semua");
  const [shellLengthFilter, setShellLengthFilter] = useState("semua");

  // ── Data Queries ──
  const { data: tortoises = [], isLoading } = useQuery({
    queryKey: ["tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 2000),
  });
  const { data: healthRecords = [] } = useQuery({
    queryKey: ["health-records-all"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 2000),
  });
  const { data: breedingRecords = [] } = useQuery({
    queryKey: ["breeding-records-all"],
    queryFn: () => base44.entities.Breeding.list("-mating_date", 2000),
  });
  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures"],
    queryFn: () => base44.entities.Enclosure.list("-created_date", 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Enclosure.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["enclosures"] }); setDeleteTarget(null); },
  });

  // ── Tortoise derived ──
  const latestHealthMap = useMemo(() => {
    const map = {};
    healthRecords.forEach((r) => {
      if (!r.tortoise_id) return;
      if (!map[r.tortoise_id] || r.date > map[r.tortoise_id].date) map[r.tortoise_id] = r;
    });
    return map;
  }, [healthRecords]);

  const hasLaidEggs = useMemo(() => {
    const s = new Set();
    breedingRecords.forEach((b) => { if (b.egg_laying_date && b.female_id) s.add(b.female_id); });
    return s;
  }, [breedingRecords]);

  const getParentIndicator = (tortoise) => {
    const rec = latestHealthMap[tortoise.id];
    if (rec && (rec.type === "sakit" || rec.type === "obat")) return "sick";
    if ((tortoise.notes || "").toLowerCase().includes("rare")) return "rare";
    if (tortoise.gender === "betina" && hasLaidEggs.has(tortoise.id)) return "hasEggs";
    return null;
  };

  const getHealthStatus = (tortoiseId) => {
    const rec = latestHealthMap[tortoiseId];
    if (!rec) return "none";
    if (rec.type === "sakit" || rec.type === "obat") return "critical";
    if (rec.type === "vaksin") return "warning";
    return "ok";
  };

  // Kura dengan kasus sakit yang masih TERBUKA.
  //
  // Aturan lama membaca "masih sakit" dari kosongnya follow_up_date. Karena
  // sebagian besar laporan sakit ringan memang tidak menjadwalkan pemeriksaan
  // ulang, hampir setiap laporan menandai kuranya sakit selamanya — dan alur
  // "tandai sembuh" tidak pernah menyentuh catatan itu, jadi lencananya tidak
  // bisa dipadamkan siapa pun. Sepuluh catatan seperti itu ditemukan pada 29
  // Agustus 2026, termasuk B106 yang memakai lencana SAKIT dan Sehat sekaligus.
  //
  // Sekarang dibaca dari penanda selesai yang ditulis secara sadar saat kura
  // dinyatakan sembuh. Definisinya ada di lib/kesehatanKura.js.
  const sickTortoiseIds = useMemo(() => idKuraDenganKasusTerbuka(healthRecords), [healthRecords]);

  // Komentar di sini dulu menyebut incompleteChecks.js sebagai sumber kebenaran
  // tunggal, lalu menuliskan ulang seluruh aturannya tepat di bawahnya. Kedua
  // salinan kebetulan masih sama persis, tetapi satu perubahan pada salah
  // satunya cukup untuk membuat penghitung di sini dan di halaman "Data Belum
  // Lengkap" menyebut angka yang berbeda tanpa ada yang menyadarinya.
  const isIncomplete = (t) => getMissingFields("tortoise", t).length > 0;

  // Jumlah kura aktif — dipakai di beberapa tempat pada JSX di bawah.
  const totalAktif = tortoises.filter(t => t.status === "aktif" && !t.is_archived).length;

  const filtered = tortoises.filter((t) => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.code?.toLowerCase().includes(search.toLowerCase());
    let matchStatus;
    if (statusFilter === "semua") matchStatus = true;
    // Aturan anakan ada di lib/anakanKura.js — umurnya, bukan kolomnya.
    // Bentuk lama di sini (`age_category === "baby" && status === "aktif"`)
    // tidak melihat tukik yang dicatat lewat HatchDialog, dan tetap
    // menghitung tukik yang sudah berumur dua tahun.
    else if (statusFilter === "baby") matchStatus = anakan(t);
    // "Sakit" dibaca lewat kedua penandanya, sama seperti lencana penghitungnya
    // di atas. Membandingkan status saja membuat tombol menyebut satu angka dan
    // menampilkan isi yang lain — dan kura yang penandanya berselisih tidak
    // muncul di mana pun, jadi tidak bisa diperbaiki dari layar ini.
    else if (statusFilter === "sakit") matchStatus = sedangSakitLengkap(t, sickTortoiseIds);
    else matchStatus = t.status === statusFilter;
    const matchGender = genderFilter === "semua" || t.gender === genderFilter;
    const matchMorph = morphFilter === "semua" || (t.morph || "normal") === morphFilter;
    const matchShell = shellTypeFilter === "semua" || (t.shell_type || "normal") === shellTypeFilter;
    const matchEnclosure = !enclosureFilter || (t.enclosure || "Tidak Ada Kandang") === enclosureFilter;
    const matchProven = provenFilter === "semua" || (provenFilter === "proven" ? !!t.is_proven : !t.is_proven);
    const matchSpecies = speciesFilter === "semua" || (t.species || "sulcata") === speciesFilter;
    const matchQuarantine = quarantineFilter === "all" || (quarantineFilter === "yes" ? t.in_quarantine : !t.in_quarantine);
    const matchIncomplete = !incompleteFilter || isIncomplete(t);

    let matchWeight = true;
    if (weightFilter !== "semua") {
      const w = t.weight_grams;
      if (!w || w === 0) return false;
      if (weightFilter === "newborn") matchWeight = w < 100;
      else if (weightFilter === "baby") matchWeight = w >= 100 && w <= 500;
      else if (weightFilter === "juvenile") matchWeight = w > 500 && w <= 2000;
      else if (weightFilter === "subadult") matchWeight = w > 2000 && w <= 8000;
      else if (weightFilter === "adult") matchWeight = w > 8000;
    }

    let matchShellLength = true;
    if (shellLengthFilter !== "semua") {
      const sl = t.shell_length_cm;
      if (!sl || sl === 0) return false;
      // Rentang panjang karapas dulu tidak rapat dan saling tindih:
      //   xl2 = 40..45, xl3 = 46..50  -> celah di antara 45 dan 46.
      //   xl3 = 46..50, xl4 = 50..55  -> 50 cm masuk DUA rentang sekaligus.
      // Akibat nyata di data hari ini: B83 (45,5 cm) tidak muncul di rentang
      // mana pun, dan delapan kura berukuran tepat 50 cm terhitung dua kali.
      // Sekarang batas bawah selalu ikut, batas atas tidak (>= a && < b),
      // jadi setiap ukuran jatuh ke tepat satu rentang tanpa celah.
      if (shellLengthFilter === "xs") matchShellLength = sl < 8;
      else if (shellLengthFilter === "s") matchShellLength = sl >= 8 && sl < 15;
      else if (shellLengthFilter === "m") matchShellLength = sl >= 15 && sl < 25;
      else if (shellLengthFilter === "l") matchShellLength = sl >= 25 && sl < 35;
      else if (shellLengthFilter === "xl1") matchShellLength = sl >= 35 && sl < 40;
      else if (shellLengthFilter === "xl2") matchShellLength = sl >= 40 && sl < 45;
      else if (shellLengthFilter === "xl3") matchShellLength = sl >= 45 && sl < 50;
      else if (shellLengthFilter === "xl4") matchShellLength = sl >= 50 && sl < 55;
      else if (shellLengthFilter === "xl5") matchShellLength = sl >= 55 && sl < 60;
      else if (shellLengthFilter === "xl6") matchShellLength = sl >= 60;
    }

    return matchSearch && matchStatus && matchGender && matchMorph && matchShell && matchEnclosure && matchProven && matchSpecies && matchQuarantine && matchIncomplete && matchWeight && matchShellLength;
  });

  const grouped = useMemo(() => {
    const map = {};
    // Di view kandang, kura mati & terjual tidak ditampilkan (kecuali filter eksplisit status mati/terjual)
    const forGrouped = (statusFilter === "mati" || statusFilter === "terjual" || statusFilter === "diarsipkan")
      ? filtered
      : filtered.filter(t => t.status !== "mati" && t.status !== "terjual" && t.status !== "diarsipkan");
    forGrouped.forEach((t) => {
      const key = t.enclosure || "Tidak Ada Kandang";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    const statusOrder = { aktif: 0, baby: 1, sakit: 2, mati: 3, terjual: 4 };
    Object.values(map).forEach((arr) => { arr.sort((a, b) => (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0)); });
    // Urutan kandang datang dari lib/kandang.js, bukan daftar tetap di sini.
    // Daftar lama ketinggalan N3, L1, dan Bonsai 1-4 — keenamnya terlempar ke
    // dasar halaman, jadi N3 tidak pernah muncul di antara N2 dan E1.
    return Object.entries(map).sort(([a], [b]) => bandingkanKandang(a, b));
  }, [filtered]);

  const toggleGroup = (key) => setCollapsedGroups(p => ({ ...p, [key]: !p[key] }));
  const handleEdit = (tortoise) => { setEditData(tortoise); setShowForm(true); };
  const handleDelete = async (tortoise) => {
    if (confirm(`Hapus ${tortoise.name}?`)) {
      await base44.entities.Tortoise.delete(tortoise.id);
      // Kura yang dihapus berhenti menghuni kandangnya.
      await recalcEnclosureCountsAman(tortoise.enclosure ? [tortoise.enclosure] : null);
      queryClient.invalidateQueries({ queryKey: ["tortoises"] });
      queryClient.invalidateQueries({ queryKey: ["enclosures"] });
    }
  };
  const handleMove = (tortoise) => setMoveTarget(tortoise);
  const handleSell = (tortoise) => { setSellTarget(tortoise); setShowSellWizard(true); };
  const handleMoved = () => queryClient.invalidateQueries({ queryKey: ["tortoises"] });

  // ── Enclosure derived ──
  const typeLabel = { indoor: "Indoor", outdoor: "Outdoor", greenhouse: "Greenhouse" };
  const typeIcon = { indoor: Home, outdoor: Trees, greenhouse: Thermometer };
  const statusStyle = { overcrowded: "border-red-400 bg-red-50", warning: "border-amber-400 bg-amber-50", normal: "border-border bg-card" };
  const statusBadge = {
    overcrowded: <Badge className="bg-red-100 text-red-700 border-red-300">Overcrowding!</Badge>,
    warning: <Badge className="bg-amber-100 text-amber-700 border-amber-300">Hampir Penuh</Badge>,
    normal: <Badge className="bg-green-100 text-green-700 border-green-300">Normal</Badge>,
  };
  // Lewat pustaka bersama: aturan penghuninya sama dengan angka di kartu, jadi
  // "28 / 36" dan panjang daftar yang terbuka saat kartunya ditekan tidak
  // pernah berbeda — termasuk sesudah kandangnya diganti nama.
  const encTortoises = kuraDiKandang(selectedEnclosureDetail, tortoises, enclosures);

  // Karantina tortoises
  const quarantinedTortoises = tortoises.filter(t => t.in_quarantine === true);

  // Ringkasan populasi untuk kepala halaman. Rasio jantan-betina ikut
  // ditampilkan karena itu yang menentukan kapasitas breeding, dan selama ini
  // hanya bisa dilihat dengan menyaring daftar satu per satu.
  const ringkasan = (() => {
    const hidup = tortoises.filter(t => !t.is_archived && t.status !== "mati" && t.status !== "terjual");
    return {
      aktif: tortoises.filter(t => t.status === "aktif" && !t.is_archived).length,
      jantan: hidup.filter(t => t.gender === "jantan").length,
      betina: hidup.filter(t => t.gender === "betina").length,
      sakit: hidup.filter((t) => sedangSakitLengkap(t, sickTortoiseIds)).length,
      karantina: quarantinedTortoises.length,
    };
  })();

  const handleSaveEnclosure = () => { setShowEnclosureForm(false); queryClient.invalidateQueries({ queryKey: ["enclosures"] }); };

  /*
    ── `?edit=<id>` MEMBUKA FORMULIR KANDANG ──────────────────────────────

    Halaman Data Belum Lengkap sudah lama menautkan `/enclosure?edit=<id>`
    untuk tiap kandang yang datanya kurang. Halaman Kandang yang lama TIDAK
    PERNAH membaca parameter itu — tidak ada useSearchParams di sana sama
    sekali — jadi menekannya hanya membuka daftar kandang biasa dan
    formulirnya tidak pernah muncul. Tautan yang tampak bekerja, dan tidak.

    Sekarang dibaca di sini. Parameternya langsung dibuang dari alamat supaya
    menutup formulir lalu memuat ulang halaman tidak membukanya lagi.
  */
  useEffect(() => {
    const id = searchParams.get("edit");
    if (!id || enclosures.length === 0) return;
    const enc = enclosures.find((e) => e.id === id);
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    next.set("tab", "kandang");
    setSearchParams(next, { replace: true });
    if (enc && canEditEnclosure) {
      setEditingEnclosure(enc);
      setShowEnclosureForm(true);
    }
  }, [searchParams, enclosures, canEditEnclosure, setSearchParams]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kura-kura & Kandang"
        subtitle="Kelola kura-kura dan kandang dalam satu tempat"
        icon={Shell}
        art={<TortoiseArt size="md" />}
        chips={[
          { key: "aktif", icon: Shell, label: "Aktif", value: ringkasan.aktif, ke: "/tortoise?tab=kura" },
          { key: "jk", icon: Home, label: "Jantan : Betina", ke: "/tortoise?tab=kandang",
            value: `${ringkasan.jantan} : ${ringkasan.betina}` },
          { key: "sakit", icon: HeartPulse, label: "Sakit", value: ringkasan.sakit, ke: "/health",
            tone: ringkasan.sakit > 0 ? "warn" : "good" },
          { key: "karantina", icon: CalendarX, label: "Karantina", value: ringkasan.karantina, ke: "/tortoise?tab=karantina",
            tone: ringkasan.karantina > 0 ? "warn" : "default" },
        ]}
      />

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="kura" className="flex-1 sm:flex-none gap-1.5">
            <Shell className="w-4 h-4" /> Kura-kura
            <Badge variant="secondary" className="text-xs ml-1">{tortoises.filter(t => t.status === "aktif" && !t.is_archived).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="kandang" className="flex-1 sm:flex-none gap-1.5">
            <Home className="w-4 h-4" /> Kandang
            <Badge variant="secondary" className="text-xs ml-1">{enclosures.filter(e => e.is_active !== false).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="karantina" className="flex-1 sm:flex-none gap-1.5">
            <CalendarX className="w-4 h-4" /> Karantina
            <Badge variant="secondary" className="text-xs ml-1">{tortoises.filter(t => t.in_quarantine === true).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="terjual" className="flex-1 sm:flex-none gap-1.5">
            <ShoppingBag className="w-4 h-4" /> Terjual
            <Badge variant="secondary" className="text-xs ml-1">{tortoises.filter(t => t.status === "terjual").length}</Badge>
          </TabsTrigger>
          {/* Pemicu disembunyikan untuk yang tidak berhak — bukan sekadar
              ditolak sesudah ditekan. Tab yang terlihat tapi selalu menolak
              hanya mengajari orang bahwa aplikasinya rusak. */}
          {bolehSilsilah && (
            <TabsTrigger value="silsilah" className="flex-1 sm:flex-none gap-1.5">
              <GitBranch className="w-4 h-4" /> Silsilah
            </TabsTrigger>
          )}
          {bolehDiam && (
            <TabsTrigger value="diam" className="flex-1 sm:flex-none gap-1.5">
              <Clock className="w-4 h-4" /> Diam
            </TabsTrigger>
          )}
        </TabsList>

        {/* ══════════ TAB KURA-KURA ══════════ */}
        <TabsContent value="kura" className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">Menampilkan <span className="font-semibold text-foreground">{filtered.length}</span> kura dari {tortoises.filter(t => t.status === "aktif" && !t.is_archived).length} aktif</p>
              {(() => {
                const activeCount = tortoises.filter(t => t.status === "aktif" && !t.is_archived).length;
                const visibleActive = filtered.filter(t => t.status === "aktif" && !t.is_archived).length;
                const hidden = activeCount - visibleActive;
                return (statusFilter === "semua" && !incompleteFilter && !enclosureFilter && !search && hidden > 0) ? (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">⚠️ {hidden} kura tidak tampil</span>
                ) : null;
              })()}
            </div>
            <div className="flex gap-2 flex-wrap">
              <ExportButton
                data={filtered}
                filename={`tortoise-${new Date().toISOString().split("T")[0]}`}
                title="Data Kura-kura"
                columns={[
                  {key:"name",label:"Nama"},{key:"code",label:"Kode"},{key:"gender",label:"Gender"},
                  {key:"morph",label:"Morph"},{key:"status",label:"Status"},{key:"enclosure",label:"Kandang"},
                  {key:"weight_grams",label:"Berat (g)"},{key:"shell_length_cm",label:"Panjang (cm)"},
                  {key:"birth_date",label:"Tgl Lahir"},{key:"source",label:"Sumber"},
                ]}
              />
              {perms.canCreate && (
                <Button onClick={() => { setEditData(null); setShowForm(true); }} className="bg-primary gap-2">
                  <Plus className="w-4 h-4" /> Tambah Tortoise
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder="Cari nama atau kode tortoise..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-12 h-11 rounded-xl" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status ({tortoises.length})</SelectItem>
                <SelectItem value="aktif">Aktif ({tortoises.filter(t => t.status === "aktif").length})</SelectItem>
                <SelectItem value="baby">🐣 Anakan ({hanyaAnakan(tortoises).length})</SelectItem>
                <SelectItem value="sakit">Sakit ({tortoises.filter((t) => sedangSakitLengkap(t, sickTortoiseIds)).length})</SelectItem>
                <SelectItem value="breeding">Breeding ({tortoises.filter(t => t.status === "breeding").length})</SelectItem>
                <SelectItem value="terjual">Terjual ({tortoises.filter(t => t.status === "terjual").length})</SelectItem>
                <SelectItem value="mati">Mati ({tortoises.filter(t => t.status === "mati").length})</SelectItem>
                <SelectItem value="diarsipkan">Diarsipkan ({tortoises.filter(t => t.status === "diarsipkan" || t.is_archived).length})</SelectItem>
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Gender</SelectItem>
                <SelectItem value="jantan">♂ Jantan</SelectItem>
                <SelectItem value="betina">♀ Betina</SelectItem>
                <SelectItem value="belum_diketahui">? Belum Diketahui</SelectItem>
              </SelectContent>
            </Select>
            <Select value={morphFilter} onValueChange={setMorphFilter}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Morph" /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="semua">Semua Morph</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="het_albino">Het. Albino (Carrier)</SelectItem>
                <SelectItem value="het_caramel_albino">Het. Caramel Albino</SelectItem>
                <SelectItem value="het_hypo">Het. Hypo</SelectItem>
                <SelectItem value="het_ivory">Het. Ivory</SelectItem>
                <SelectItem value="double_het">Double Het</SelectItem>
                <SelectItem value="albino">Albino</SelectItem>
                <SelectItem value="ivory">Ivory</SelectItem>
                <SelectItem value="caramel_albino">Caramel Albino</SelectItem>
                <SelectItem value="hypo">Hypo</SelectItem>
                <SelectItem value="golden_greek">Golden Greek</SelectItem>
                <SelectItem value="piebald">Piebald</SelectItem>
                <SelectItem value="genetic_stripe">Genetic Stripe</SelectItem>
                <SelectItem value="high_yellow">High Yellow</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="paradox">Paradox</SelectItem>
                <SelectItem value="anerythristic">Anerythristic</SelectItem>
                <SelectItem value="axanthic">Axanthic</SelectItem>
                <SelectItem value="melanistic">Melanistic</SelectItem>
                <SelectItem value="mix">Mix</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
            <Select value={shellTypeFilter} onValueChange={setShellTypeFilter}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Tempurung" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Tempurung</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="less_scute">Less Scute</SelectItem>
                <SelectItem value="over_scute">Over Scute</SelectItem>
                <SelectItem value="pyramiding">Pyramiding</SelectItem>
                <SelectItem value="smooth">Smooth</SelectItem>
                <SelectItem value="wavy">Wavy</SelectItem>
                <SelectItem value="irregular">Irregular</SelectItem>
              </SelectContent>
            </Select>
            <Select value={enclosureFilter || "semua"} onValueChange={v => setEnclosureFilter(v === "semua" ? null : v)}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Pilih Kandang..." /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="semua">Semua Kandang</SelectItem>
                {(() => {
                  /*
                   * Daftar kandang di penyaring ini DITURUNKAN dari data, bukan
                   * ditulis tangan. Versi lama punya dua cacat sekaligus:
                   *
                   *  1. Kelompoknya hanya W/N/E/L/Baby. "Bonsai 1-4" tidak
                   *     termasuk kelompok mana pun.
                   *  2. Keranjang "sisanya" menyaring dengan
                   *     ![\"W\",\"N\",\"E\",\"L\",\"B\"].some(p => name.startsWith(p)) —
                   *     dan "Bonsai" diawali huruf B, jadi ikut terbuang juga.
                   *
                   * Akibatnya keempat kandang Bonsai TIDAK PERNAH bisa dipilih,
                   * padahal 20+ kura aktif tinggal di sana.
                   *
                   * Sekarang: nama diambil dari Enclosure DAN dari data kura
                   * (kandang yang dipakai tapi belum terdaftar tetap muncul),
                   * kelompoknya ditentukan kunciUrutKandang, dan apa pun yang
                   * tidak masuk kelompok jatuh ke "Lainnya" — bukan menghilang.
                   */
                  const KELOMPOK = [
                    { label: "Barat", prefix: "W" },
                    { label: "Utara", prefix: "N" },
                    { label: "Timur", prefix: "E" },
                    { label: "Lain", prefix: "L" },
                    { label: "Kandang Baby", prefix: "Baby" },
                    { label: "Bonsai", prefix: "Bonsai" },
                  ];
                  /*
                   * Kandang yang SUDAH DIARSIPKAN tidak ditawarkan sebagai
                   * penyaring. N1, N2 dan N3 digabung jadi kandang N pada 27
                   * September 2026; catatannya sengaja disimpan supaya 382
                   * catatan kebersihan dan 14 riwayat pindah yang menyebut
                   * namanya tetap punya rujukan, tetapi menawarkannya di sini
                   * hanya membuat empat kandang Utara terlihat padahal
                   * fisiknya satu.
                   *
                   * Perkecualiannya: nama yang masih DIPAKAI kura hidup tetap
                   * muncul, bahkan bila kandangnya diarsipkan atau tidak pernah
                   * terdaftar. Menyembunyikannya akan membuat kura itu tidak
                   * bisa ditemukan lewat penyaring mana pun.
                   */
                  const diarsipkan = new Set(
                    enclosures.filter(e => e?.is_archived === true || e?.is_active === false)
                              .map(e => e?.name).filter(Boolean)
                  );
                  const dipakaiKuraHidup = new Set(
                    tortoises.filter(t => t?.enclosure && t.status !== "mati"
                                          && t.status !== "terjual" && !t.is_archived)
                             .map(t => t.enclosure)
                  );
                  const semuaNama = [...new Set([
                    ...enclosures.map(e => e?.name),
                    ...tortoises.map(t => t?.enclosure),
                  ].filter(Boolean))].filter(
                    n => !diarsipkan.has(n) || dipakaiKuraHidup.has(n)
                  );
                  const hidup = (t) => t.status !== "mati" && t.status !== "terjual" && t.status !== "diarsipkan";
                  const hitung = (nama) => tortoises.filter(t => t.enclosure === nama && hidup(t)).length;
                  const terpakai = new Set();
                  const blok = KELOMPOK.map(g => {
                    const idx = URUTAN_KELOMPOK.indexOf(g.prefix);
                    const anggota = semuaNama
                      .filter(n => kunciUrutKandang(n)[0] === idx)
                      .sort(bandingkanKandang);
                    anggota.forEach(n => terpakai.add(n));
                    if (anggota.length === 0) return null;
                    return (
                      <div key={g.label}>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50">{g.label}</div>
                        {anggota.map(nama => (
                          <SelectItem key={nama} value={nama}>{nama} ({hitung(nama)})</SelectItem>
                        ))}
                      </div>
                    );
                  });
                  const sisa = semuaNama.filter(n => !terpakai.has(n)).sort(bandingkanKandang);
                  return (
                    <>
                      {blok}
                      {sisa.length > 0 && (
                        <div key="sisa">
                          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50">Lainnya</div>
                          {sisa.map(nama => (
                            <SelectItem key={nama} value={nama}>{nama} ({hitung(nama)})</SelectItem>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </SelectContent>
            </Select>
            <div className="flex rounded-lg border overflow-hidden h-9">
              <button onClick={() => setViewMode("kandang")} className={`px-3 text-xs font-medium transition-colors ${viewMode === "kandang" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>Per Kandang</button>
              <button onClick={() => setViewMode("semua")} className={`px-3 text-xs font-medium transition-colors ${viewMode === "semua" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>Semua</button>
            </div>
            <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Spesies" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Spesies</SelectItem>
                <SelectItem value="sulcata">Sulcata</SelectItem>
                <SelectItem value="red_foot">Red Foot</SelectItem>
                <SelectItem value="leopard">Leopard</SelectItem>
                <SelectItem value="aldabra">Aldabra</SelectItem>
                <SelectItem value="russian">Russian</SelectItem>
                <SelectItem value="hermann">Hermann</SelectItem>
                <SelectItem value="greek">Greek</SelectItem>
                <SelectItem value="indian_star">Indian Star</SelectItem>
                <SelectItem value="lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Berat */}
            <Select value={weightFilter} onValueChange={setWeightFilter}>
              <SelectTrigger className={`w-36 h-9 text-xs ${weightFilter !== "semua" ? "border-primary bg-primary/5 text-primary font-semibold" : ""}`}>
                <SelectValue placeholder="Berat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Berat</SelectItem>
                <SelectItem value="newborn">Newborn (&lt;100g)</SelectItem>
                <SelectItem value="baby">Baby (100–500g)</SelectItem>
                <SelectItem value="juvenile">Juvenile (500–2000g)</SelectItem>
                <SelectItem value="subadult">Sub-Adult (2–8kg)</SelectItem>
                <SelectItem value="adult">Adult (&gt;8kg)</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Panjang Karapas */}
            <Select value={shellLengthFilter} onValueChange={setShellLengthFilter}>
              <SelectTrigger className={`w-40 h-9 text-xs ${shellLengthFilter !== "semua" ? "border-primary bg-primary/5 text-primary font-semibold" : ""}`}>
                <SelectValue placeholder="Panjang Karapas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Ukuran</SelectItem>
                <SelectItem value="xs">&lt; 8 cm</SelectItem>
                <SelectItem value="s">8 – 15 cm</SelectItem>
                <SelectItem value="m">15 – 25 cm</SelectItem>
                <SelectItem value="l">25 – 35 cm</SelectItem>
                <SelectItem value="xl1">35 – 40 cm</SelectItem>
                <SelectItem value="xl2">40 – 45 cm</SelectItem>
                <SelectItem value="xl3">45 – 50 cm</SelectItem>
                <SelectItem value="xl4">50 – 55 cm</SelectItem>
                <SelectItem value="xl5">55 – 60 cm</SelectItem>
                <SelectItem value="xl6">≥ 60 cm</SelectItem>
              </SelectContent>
            </Select>

            {/* Toggle Proven Breeder */}
            <button
              onClick={() => setProvenFilter(v => v === "proven" ? "semua" : "proven")}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${provenFilter === "proven" ? "bg-green-100 border-green-500 text-green-800" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}
            >
              ⭐ Proven Breeder
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${provenFilter === "proven" ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>{tortoises.filter(t => t.is_proven).length}</span>
            </button>

            {/* Toggle Sakit Saat Ini */}
            <button
              onClick={() => { setStatusFilter(v => v === "sakit" ? "semua" : "sakit"); }}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${statusFilter === "sakit" ? "bg-red-100 border-red-400 text-red-800" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}
            >
              🏥 Sakit Saat Ini
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === "sakit" ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"}`}>{tortoises.filter((t) => sedangSakitLengkap(t, sickTortoiseIds)).length}</span>
            </button>

            <button
              onClick={() => setIncompleteFilter(v => !v)}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${incompleteFilter ? "bg-amber-100 border-amber-400 text-amber-800" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}
            >
              ⚠️ Data Belum Lengkap
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${incompleteFilter ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>{tortoises.filter(diPeternakan).filter(isIncomplete).length}</span>
            </button>

            {(search || statusFilter !== "semua" || genderFilter !== "semua" || morphFilter !== "semua" || shellTypeFilter !== "semua" || enclosureFilter || provenFilter !== "semua" || speciesFilter !== "semua" || weightFilter !== "semua" || shellLengthFilter !== "semua" || incompleteFilter) && (
              <button
                onClick={() => {
                  setSearch(""); setStatusFilter("semua"); setGenderFilter("semua");
                  setMorphFilter("semua"); setShellTypeFilter("semua"); setEnclosureFilter(null);
                  setProvenFilter("semua"); setSpeciesFilter("semua");
                  setWeightFilter("semua"); setShellLengthFilter("semua"); setIncompleteFilter(false);
                }}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-destructive/40 bg-destructive/5 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors"
              >
                ✕ Reset Filter
              </button>
            )}
          </div>

          {enclosureFilter && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm">
              <span className="font-medium text-primary">Kandang: {enclosureFilter}</span>
              <button onClick={() => setEnclosureFilter(null)} className="ml-auto text-xs text-muted-foreground hover:text-destructive underline">Tampilkan Semua</button>
            </div>
          )}

          {isLoading ? (
            <CardSkeleton count={6} />
          ) : filtered.length === 0 ? (
            // Bedakan "belum ada data sama sekali" dari "tidak ada yang cocok dengan filter".
            // Sebelumnya keduanya menampilkan "Belum ada kura-kura terdaftar",
            // padahal datanya ada dan hanya tersaring.
            tortoises.length > 0 ? (
              <div className="text-center py-14 px-4">
                <p className="text-base font-semibold text-foreground">
                  Tidak ada kura yang cocok dengan filter
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ada {totalAktif} kura aktif ({tortoises.length} termasuk mati, terjual,
                  dan diarsipkan), tapi tidak ada yang memenuhi kombinasi filter yang sedang aktif.
                </p>
                <button
                  onClick={() => {
                    setSearch(""); setStatusFilter("semua"); setGenderFilter("semua");
                    setMorphFilter("semua"); setShellTypeFilter("semua"); setEnclosureFilter(null);
                    setProvenFilter("semua"); setSpeciesFilter("semua");
                    setWeightFilter("semua"); setShellLengthFilter("semua"); setIncompleteFilter(false);
                  }}
                  className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  Hapus semua filter
                </button>
              </div>
            ) : (
              <EmptyState
                type="tortoise"
                onAction={perms.canCreate ? () => { setEditData(null); setShowForm(true); } : null}
              />
            )
          ) : viewMode === "semua" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...filtered].sort((a, b) => ({ aktif: 0, baby: 1, sakit: 2, breeding: 3, mati: 4, terjual: 5, diarsipkan: 6 }[a.status] ?? 0) - ({ aktif: 0, baby: 1, sakit: 2, breeding: 3, mati: 4, terjual: 5, diarsipkan: 6 }[b.status] ?? 0)).map((t) => (
                <TortoiseCard key={t.id} tortoise={t} healthStatus={getHealthStatus(t.id)} latestHealth={latestHealthMap[t.id]} parentIndicator={getParentIndicator(t)} isSick={sickTortoiseIds.has(t.id)} onEdit={perms.canEdit ? handleEdit : null} onDelete={ownerCanDelete ? handleDelete : null} onMove={perms.canMove ? handleMove : null} onSell={perms.canCreate ? handleSell : null} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([enclosure, items]) => {
                const collapsed = !!collapsedGroups[enclosure];
                return (
                  <div key={enclosure} className="border rounded-xl overflow-hidden">
                    <button onClick={() => toggleGroup(enclosure)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-3">
                        {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEnclosureFilter(enclosureFilter === enclosure ? null : enclosure); }} className={`font-semibold text-sm hover:text-primary hover:underline transition-colors ${enclosureFilter === enclosure ? "text-primary underline" : ""}`}>
                          {enclosure.startsWith("Baby") ? enclosure : `Kandang ${enclosure}`}
                        </button>
                        <Badge variant="secondary" className="text-xs">{items.length} ekor</Badge>
                        <div className="flex gap-1 text-xs text-muted-foreground">
                          <span>♂ {items.filter(t => t.gender === "jantan").length}</span>
                          <span>·</span>
                          <span>♀ {items.filter(t => t.gender === "betina").length}</span>
                        </div>
                        <div className="flex gap-1 text-xs">
                          <span className="text-green-600">{items.filter(t => t.status === "aktif").length}</span>
                          <span className="text-blue-600">·{items.filter(t => t.age_category === "baby").length}</span>
                          <span className="text-yellow-600">·{items.filter((t) => sedangSakitLengkap(t, sickTortoiseIds)).length}</span>
                        </div>
                      </div>
                      {canEditEnclosure && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setRenameEnclosure({ name: enclosure, ids: items.map(t => t.id) }); }} className="mr-2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <PenLine className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </button>
                    {!collapsed && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {items.map((t) => (
                           <TortoiseCard key={t.id} tortoise={t} healthStatus={getHealthStatus(t.id)} latestHealth={latestHealthMap[t.id]} parentIndicator={getParentIndicator(t)} isSick={sickTortoiseIds.has(t.id)} onEdit={perms.canEdit ? handleEdit : null} onDelete={ownerCanDelete ? handleDelete : null} onMove={perms.canMove ? handleMove : null} onSell={perms.canCreate ? handleSell : null} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ══════════ TAB KANDANG ══════════ */}
        <TabsContent value="kandang" className="mt-5 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">{enclosures.length} kandang terdaftar</p>
            {canEditEnclosure && (
              <div className="flex items-center gap-2">
                {/* Dipindahkan dari halaman /enclosure yang dihapus 29-09-2026.
                    Ini satu-satunya hal yang hanya ada di sana.

                    Angka di layar ini TIDAK lagi bergantung pada current_count —
                    semuanya dihitung langsung dari daftar kura. Tombol ini
                    menyegarkan kolom tersimpannya, yang masih dibaca tempat
                    lain; lib/enclosureCount.js memakai aturan hitung yang sama
                    persis dengan yang ditampilkan di sini. */}
                <Button
                  variant="outline"
                  onClick={async () => {
                    setSyncingKandang(true);
                    const { updated } = await recalcEnclosureCounts();
                    queryClient.invalidateQueries({ queryKey: ["enclosures"] });
                    setSyncingKandang(false);
                    toast.success(updated > 0
                      ? `${updated} kandang disegarkan`
                      : "Semua kandang sudah sinkron");
                  }}
                  disabled={syncingKandang}
                  className="gap-1.5"
                >
                  <RefreshCw className={`w-4 h-4 ${syncingKandang ? "animate-spin" : ""}`} /> Sinkronkan
                </Button>
                <Button onClick={() => { setEditingEnclosure(null); setShowEnclosureForm(true); }} className="gap-2 bg-primary">
                  <Plus className="w-4 h-4" /> Tambah Kandang
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              /* `is_active !== false`, bukan `is_active === true`: kolom itu
                 tidak pernah ditulis oleh layar mana pun, jadi kandang lama
                 bernilai undefined dan diam-diam hilang dari hitungan ini —
                 padahal baris "N kandang terdaftar" tepat di atasnya
                 menghitungnya. Dua angka, satu daftar. */
              { label: "Total Kandang", val: enclosures.filter(e=>e.is_active !== false).length, color: "text-green-700" },
              { label: "Overcrowding", val: enclosures.filter(e=>getEnclosureStatus(e, hitungIsiKandang(e, tortoises, enclosures))==="overcrowded").length, color: "text-red-600" },
              { label: "Hampir Penuh", val: enclosures.filter(e=>getEnclosureStatus(e, hitungIsiKandang(e, tortoises, enclosures))==="warning").length, color: "text-amber-600" },
              { label: "Total Kapasitas", val: enclosures.reduce((s,e)=>s+(e.max_capacity||0),0), color: "text-green-700" },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.val}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {enclosures.length === 0 ? (
            <EmptyState
              type="enclosure"
              onAction={canEditEnclosure ? () => { setEditingEnclosure(null); setShowEnclosureForm(true); } : null}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enclosures.map(enc => {
              /*
                Isi kandang dicocokkan lewat NOMOR kandang, bukan namanya.

                Bentuk lama: `t.enclosure === enc.name`. Nama lepas begitu
                kandang diganti nama — kuranya masih menyimpan nama lama,
                kandangnya sudah bernama baru, dan isinya jatuh ke nol tanpa
                satu pun peringatan. Itu persis yang terjadi saat N1, N2 dan N3
                digabung jadi N.

                Halaman Kandang yang dulu berdiri sendiri sudah memakai nomor
                sejak lama; layar ini tidak ikut. Sejak 29-09-2026 halaman itu
                dihapus dan digabung ke tab ini, dan aturannya satu:
                hitungIsiKandang() di lib/kandang.js, yang juga dipakai
                lib/enclosureCount.js untuk menulis current_count.
              */
              const encCount = hitungIsiKandang(enc, tortoises, enclosures);
              const status = getEnclosureStatus(enc, encCount);
              const Icon = typeIcon[enc.type] || Home;
              return (
                <Card key={enc.id} className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${statusStyle[status]}`} onClick={() => setSelectedEnclosureDetail(enc)}>
                  {enc.photo_url && <div className="h-32 overflow-hidden rounded-t-xl"><img src={enc.photo_url} alt={enc.name} className="w-full h-full object-cover" /></div>}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2"><Icon className="w-5 h-5 text-green-700" /><CardTitle className="text-base">{enc.name}</CardTitle></div>
                      {statusBadge[status]}
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">{typeLabel[enc.type]}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground"><Users className="w-3.5 h-3.5" /><span>Isi / Kapasitas</span></div>
                      <span className="font-semibold">{encCount}{enc.max_capacity ? ` / ${enc.max_capacity}` : ""}</span>
                    </div>
                    {status === "overcrowded" && <div className="flex items-center gap-1 text-red-600 text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" />Kapasitas melebihi batas!</div>}
                    {enc.ideal_temp_min && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Thermometer className="w-3.5 h-3.5" /><span>{enc.ideal_temp_min}°–{enc.ideal_temp_max}°C</span>
                        {enc.ideal_humidity && <><Droplets className="w-3.5 h-3.5 ml-1" /><span>{enc.ideal_humidity}%</span></>}
                      </div>
                    )}
                    {enc.location && <p className="text-xs text-muted-foreground truncate">{enc.location}</p>}
                    {canEditEnclosure && (
                      <div className="flex justify-end gap-2 pt-1" onClick={e=>e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={()=>{setEditingEnclosure(enc);setShowEnclosureForm(true);}}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={()=>setDeleteTarget(enc)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            </div>
          )}
        </TabsContent>

        {/* ══════════ TAB KARANTINA ══════════ */}
        <TabsContent value="karantina" className="mt-5 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{quarantinedTortoises.length} tortoise dalam karantina</p>
            <Select value={quarantineFilter} onValueChange={setQuarantineFilter}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="yes">Sedang Karantina</SelectItem>
                <SelectItem value="no">Tidak Karantina</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {quarantinedTortoises.length === 0 ? (
            <EmptyState
              type="health"
              customTitle="Tidak Ada Karantina"
              customDescription="Tidak ada tortoise yang sedang dikarantina saat ini"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quarantinedTortoises.map(t => (
                <Card key={t.id} className="border-amber-300 bg-amber-50">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span>{t.name}</span>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300">Karantina</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">Alasan: {t.quarantine_reason || '-'}</p>
                    {t.quarantine_start_date && (
                      <p className="text-sm text-muted-foreground">
                        Mulai: {new Date(t.quarantine_start_date).toLocaleDateString('id-ID')}
                      </p>
                    )}
                    {t.quarantine_notes && (
                      <p className="text-xs text-muted-foreground">{t.quarantine_notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ══════════ TAB KEMATIAN ══════════ */}

        {/* ══════════ TAB TERJUAL ══════════ */}
        <TabsContent value="terjual" className="mt-5">
          <TortoiseTerjualTab tortoises={tortoises} isOwner={ownerCanDelete} />
        </TabsContent>

        {/* ══════════ TAB SILSILAH ══════════ */}
        {/* Dulu halaman /family-tree. Menjelajah daftar kura yang sama,
            menurut garis keturunan alih-alih kandang atau status. */}
        {bolehSilsilah && (
          <TabsContent value="silsilah" className="mt-5">
            <SilsilahTab />
          </TabsContent>
        )}

        {/* ══════════ TAB DIAM ══════════ */}
        {/* Dulu halaman /kura-diam. "Kura mana yang lama tidak tersentuh
            pencatatan" adalah pertanyaan tentang daftar ini juga. */}
        {bolehDiam && (
          <TabsContent value="diam" className="mt-5">
            <KuraDiamTab />
          </TabsContent>
        )}

      </Tabs>

      {/* ── Dialogs ── */}
      {showSellWizard && (
        <SaleWizard open={showSellWizard} preSelectedTortoiseId={sellTarget?.id} onClose={(success) => {
          setShowSellWizard(false);
          setSellTarget(null);
          if (success) queryClient.invalidateQueries({ queryKey: ["tortoises"] });
        }} />
      )}
      {showForm && <TortoiseForm open={showForm} onClose={() => setShowForm(false)} editData={editData} />}
      {moveTarget && <MoveEnclosureDialog tortoise={moveTarget} open={!!moveTarget} onClose={() => setMoveTarget(null)} onMoved={handleMoved} />}
      {renameEnclosure && <RenameEnclosureDialog open={!!renameEnclosure} onClose={() => setRenameEnclosure(null)} enclosureName={renameEnclosure.name} tortoiseIds={renameEnclosure.ids} />}
      {showEnclosureForm && (
        <EnclosureForm enclosure={editingEnclosure} onClose={() => setShowEnclosureForm(false)} onSaved={handleSaveEnclosure} />
      )}

      <Dialog open={!!selectedEnclosureDetail} onOpenChange={() => setSelectedEnclosureDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shell className="w-5 h-5 text-green-700" />Kandang: {selectedEnclosureDetail?.name}</DialogTitle></DialogHeader>
          {selectedEnclosureDetail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedEnclosureDetail.ideal_temp_min && <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg"><Thermometer className="w-4 h-4 text-orange-500" /><span>{selectedEnclosureDetail.ideal_temp_min}°–{selectedEnclosureDetail.ideal_temp_max}°C</span></div>}
                {selectedEnclosureDetail.ideal_humidity && <div className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg"><Droplets className="w-4 h-4 text-blue-500" /><span>{selectedEnclosureDetail.ideal_humidity}% kelembapan</span></div>}
                {selectedEnclosureDetail.size_m2 && <div className="p-2 bg-muted/40 rounded-lg"><span className="text-muted-foreground text-xs">Ukuran: </span><span className="font-medium">{selectedEnclosureDetail.size_m2} m²</span></div>}
                {selectedEnclosureDetail.location && <div className="p-2 bg-muted/40 rounded-lg"><span className="text-muted-foreground text-xs">Lokasi: </span><span className="font-medium">{selectedEnclosureDetail.location}</span></div>}
              </div>
              <p className="text-sm text-muted-foreground font-medium">{encTortoises.length} kura-kura aktif di kandang ini</p>
              {encTortoises.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Tidak ada kura-kura di kandang ini</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {encTortoises.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      {t.photo_url ? <img src={t.photo_url} alt={t.name} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Shell className="w-5 h-5 text-green-700" /></div>}
                      <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{t.name}</p><p className="text-xs text-muted-foreground">{t.morph} · {t.gender}</p></div>
                      <Badge variant="outline" className="text-xs">{t.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kandang?</AlertDialogTitle>
            <AlertDialogDescription>Kandang <b>{deleteTarget?.name}</b> akan dihapus permanen. Data kura-kura tidak akan ikut terhapus.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => deleteMutation.mutate(deleteTarget.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}