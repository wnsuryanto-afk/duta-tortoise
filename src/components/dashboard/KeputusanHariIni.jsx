import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { AlertTriangle, ClipboardCheck, Loader2, Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useViewAsGuard } from "@/lib/useViewAsGuard";
import { canAccess } from "@/lib/permissions";
import { logActivity } from "@/lib/logActivity";
import { nilaiUrgensiStok, gabungRiwayatPemakaian, AMBANG_GAWAT_HARI } from "@/lib/urgensiStok";
import { penandaMenunggu, sudahDidaftar, barisDariBarang } from "@/lib/daftarBelanja";
import InfoHint from "@/components/ui/info-hint";
import { cn } from "@/lib/utils";

/**
 * KeputusanHariIni — lapis paling atas beranda: hal yang perlu DIPUTUSKAN,
 * bukan hal yang perlu dibaca.
 *
 * Beranda lama menampilkan lima blok peringatan dengan bobot visual setara dan
 * nol tombol, sehingga tiap angka berakhir jadi pekerjaan mencari sendiri.
 * Di sini berlaku tiga aturan:
 *
 *   1. Sebuah kartu hanya muncul bila ada tindakan yang bisa diselesaikan
 *      dari beranda ini juga — bukan tautan ke halaman lain.
 *   2. Paling banyak tiga kartu. Kalau lebih, ambangnya yang salah, bukan
 *      layarnya yang kurang panjang.
 *   3. Yang sudah beres tetap dilaporkan, tapi sebagai satu baris tenang —
 *      supaya "70 barang" menyusut jadi "1 gawat, 69 lainnya aman".
 */

const BATAS_KARTU = 3;

function KartuKeputusan({ tone = "warn", icon: Icon, judul, rincian, anak, aksi }) {
  const nada = tone === "crit"
    ? {
        wrap: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900",
        judul: "text-red-800 dark:text-red-300",
        ikon: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
        rincian: "text-red-700/80 dark:text-red-300/70",
      }
    : {
        wrap: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
        judul: "text-amber-900 dark:text-amber-300",
        ikon: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
        rincian: "text-amber-800/80 dark:text-amber-300/70",
      };

  return (
    <div className={cn("rounded-xl border p-3.5 flex items-start gap-3 animate-fade-in", nada.wrap)}>
      <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", nada.ikon)}>
        <Icon className="w-[18px] h-[18px]" />
      </span>

      <div className="flex-1 min-w-0">
        <p className={cn("font-bold text-sm leading-snug", nada.judul)}>{judul}</p>
        {rincian && <p className={cn("text-xs mt-0.5 leading-relaxed", nada.rincian)}>{rincian}</p>}
        {anak}
        {aksi && <div className="flex flex-wrap items-center gap-2 mt-2.5">{aksi}</div>}
      </div>
    </div>
  );
}

export default function KeputusanHariIni() {
  const qc = useQueryClient();
  const { user, role } = useCurrentUser();
  const { isPreviewMode, previewProps } = useViewAsGuard();
  const [menyetujui, setMenyetujui] = useState(false);
  const [menambah, setMenambah] = useState(false);

  const bolehSetujui = canAccess(role, "approval-poin");
  const bolehBelanja = canAccess(role, "daftar-belanja");

  // Kunci query sengaja disamakan persis dengan pemakai lain (StockPredictionPage,
  // HarusDibeliPage, OwnerDashboard) supaya berbagi cache, bukan menarik ulang.
  const { data: warehouse = [] } = useQuery({
    queryKey: ["warehouse-items", "-name", 500],
    queryFn: () => base44.entities.WarehouseItem.list("-name", 500),
    staleTime: 5 * 60 * 1000,
  });
  // WarehouseTransaction DIHAPUS dari layar ini 31-08-2026. Tabel itu dibaca
  // tiga layar tapi TIDAK ADA satu pun berkas yang menulisnya — buku stok kedua
  // yang permanen kosong. Menggabungkannya dengan StockMovement tidak merusak
  // angka, tapi membuat tiap layar menunggu satu panggilan jaringan untuk daftar
  // yang selalu kosong, dan membuat pembaca kode berikutnya mengira ada dua buku
  // yang sama-sama hidup.
  const { data: pergerakan = [] } = useQuery({
    queryKey: ["stock-movements", "-date", 500],
    queryFn: () => base44.entities.StockMovement.list("-date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: sopTasks = [] } = useQuery({
    queryKey: ["sop-tasks"],
    queryFn: () => base44.entities.SOPTask.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: menungguApproval = [] } = useQuery({
    queryKey: ["owner-pending-approval"],
    queryFn: () => base44.entities.DailyChecklist.filter({ status: "submitted" }, "-date", 500),
    staleTime: 60 * 1000,
  });
  const { data: daftarBelanja = [] } = useQuery({
    queryKey: ["shopping-list-belum"],
    queryFn: () => base44.entities.ShoppingList.filter({ status: "belum_dibeli" }, "-priority", 200),
    staleTime: 60 * 1000,
  });
  const { data: pengajuanAlat = [] } = useQuery({
    queryKey: ["tool-requests-approved"],
    queryFn: () => base44.entities.ToolRequest.filter({ status: "disetujui" }, "-request_date", 200),
    staleTime: 60 * 1000,
  });

  // ── Stok ────────────────────────────────────────────────────────────
  const dinilai = nilaiUrgensiStok(warehouse, gabungRiwayatPemakaian(pergerakan), sopTasks);
  const gawat = dinilai.filter((i) => i.tingkat === "gawat");
  const waspada = dinilai.filter((i) => i.tingkat === "waspada");
  const aman = dinilai.length - gawat.length - waspada.length;

  // Barang yang sudah masuk daftar belanja tidak perlu ditawarkan lagi.
  //
  // Pencocokan lewat nama saja TIDAK PERNAH cocok: label di daftar belanja
  // memuat SKU dan tempat beli ("Chlorhexidine 0,05% [ALT-0114] - APOTEK"),
  // sementara nama gudang "Chlorhexidine 0.05% (Hibitane/Savlon)". Karena itu
  // tombol ini menawarkan menambahkan barang yang sudah terdaftar, dan
  // menekannya membuat baris kembar. Lihat lib/daftarBelanja.
  const penandaSudah = penandaMenunggu(daftarBelanja);
  const belumDidaftar = gawat.filter((i) => !sudahDidaftar(i, penandaSudah));

  // ── Checklist ───────────────────────────────────────────────────────
  // Hanya yang berfoto yang boleh disetujui massal — itu batas yang disepakati.
  const berfoto = menungguApproval.filter((c) => (c.photo_proofs || []).length > 0);
  const tanpaFoto = menungguApproval.length - berfoto.length;

  // ── Aksi: setujui semua checklist berfoto ───────────────────────────
  const setujuiSemua = async () => {
    if (berfoto.length === 0) return;
    setMenyetujui(true);
    let berhasil = 0;
    const gagal = [];

    for (const c of berfoto) {
      const poin = c.total_points_claimed || 0;
      try {
        await base44.entities.DailyChecklist.update(c.id, {
          status: "approved",
          approved_by: user?.full_name || user?.email,
          approved_points: poin,
        });
        await logActivity({
          action: "approve",
          entity_type: "DailyChecklist",
          entity_id: c.id,
          entity_name: `${c.employee_name} — ${c.date}`,
          changes_summary:
            `Menyetujui checklist ${c.employee_name} (${c.date}): ${poin} poin — ` +
            `persetujuan massal dari beranda, ${(c.photo_proofs || []).length} foto terlampir`,
        });
        berhasil++;
      } catch (e) {
        gagal.push(`${c.employee_name}: ${e?.message || "gagal"}`);
      }
    }

    // Sebagian berhasil tetap dilaporkan apa adanya — menyembunyikan kegagalan
    // di sini berarti poin karyawan hilang tanpa ada yang tahu.
    if (berhasil > 0) {
      toast.success(`${berhasil} checklist disetujui`);
      ["checklists-all", "checklists-pending-count", "owner-pending-approval",
       "my-checklist-today", "checklist-today", "kf-checklists"]
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    }
    if (gagal.length > 0) {
      toast.error(`${gagal.length} gagal disetujui — ${gagal[0]}`);
    }
    setMenyetujui(false);
  };

  // ── Aksi: masukkan barang gawat ke daftar belanja ───────────────────
  const tambahKeBelanja = async () => {
    if (belumDidaftar.length === 0) return;
    setMenambah(true);
    let berhasil = 0;
    const gagal = [];

    for (const i of belumDidaftar) {
      try {
        await base44.entities.ShoppingList.create(
          // Prioritas TIDAK diketik di sini. Versi lama menulis "segera" untuk
          // setiap baris, jadi 26 dari 32 baris di daftar belanja bertanda
          // segera dan kolomnya berhenti bisa dipakai menyaring. Sekarang
          // barisDariBarang yang menyimpulkannya dari keadaan barangnya —
          // ambangnya sama dengan yang dipakai kartu ini menilai "gawat".
          barisDariBarang(i, {
            urgensi: { sisaHari: i.sisaHari, menguncSOP: i.menguncSOP },
            notes: `Otomatis dari beranda — ${i.alasan}.`,
          })
        );
        berhasil++;
      } catch (e) {
        gagal.push(`${i.name}: ${e?.message || "gagal"}`);
      }
    }

    if (berhasil > 0) {
      toast.success(`${berhasil} barang masuk daftar belanja`);
      ["shopping-list-belum", "shopping-list", "harus-dibeli"]
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    }
    if (gagal.length > 0) {
      toast.error(`${gagal.length} gagal ditambahkan — ${gagal[0]}`);
    }
    setMenambah(false);
  };

  // ── Susun kartu, hormati batas tiga ─────────────────────────────────
  const kartu = [];

  if (gawat.length > 0) {
    const mengunci = gawat.filter((i) => i.menguncSOP).length;
    // Judulnya harus jujur soal apa yang sebenarnya terjadi. Selama tidak ada
    // catatan pergerakan stok — dan sampai 31 Agustus 2026 seluruh aplikasi
    // baru punya dua, keduanya "masuk" dari Mei — perkiraan sisa hari tidak
    // punya bahan untuk dihitung. Yang muncul di sini semuanya barang yang
    // stoknya SUDAH nol, bukan yang diperkirakan habis tiga hari lagi.
    // Menyebutnya "habis dalam 3 hari" membuat pemilik mengira ada waktu.
    const sudahNol = gawat.filter((i) => i.sisaHari === -1).length;
    kartu.push(
      <KartuKeputusan
        key="stok"
        tone="crit"
        icon={AlertTriangle}
        judul={
          mengunci > 0
            ? `${mengunci} barang menghentikan SOP`
            : sudahNol > 0 && sudahNol === gawat.length
              ? `${gawat.length} barang wajib stoknya sudah nol`
              : `${gawat.length} barang habis dalam ${AMBANG_GAWAT_HARI} hari`
        }
        rincian={
          mengunci > 0 && gawat.length > mengunci
            ? `Ditambah ${gawat.length - mengunci} barang lain yang sisa pakainya ${AMBANG_GAWAT_HARI} hari atau kurang.`
            : null
        }
        anak={
          <ul className="mt-1.5 space-y-0.5">
            {gawat.slice(0, 4).map((i) => (
              <li key={i.id} className="text-xs text-red-700/90 dark:text-red-300/80 flex items-baseline gap-1.5">
                <span className="font-semibold truncate">{i.name}</span>
                <span className="opacity-70 flex-shrink-0">— {i.alasan}</span>
              </li>
            ))}
            {gawat.length > 4 && (
              <li className="text-[11px] italic text-red-600/70 dark:text-red-400/60">
                +{gawat.length - 4} barang lainnya
              </li>
            )}
          </ul>
        }
        aksi={
          <>
            {bolehBelanja && belumDidaftar.length > 0 && (
              <Button
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={tambahKeBelanja}
                disabled={menambah || isPreviewMode}
                {...previewProps}
              >
                {menambah
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menambahkan…</>
                  : <><ShoppingCart className="w-3.5 h-3.5" /> Tambah {belumDidaftar.length} ke daftar belanja</>}
              </Button>
            )}
            {bolehBelanja && belumDidaftar.length === 0 && (
              <span className="text-xs font-medium text-red-700/70 dark:text-red-300/60 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Semuanya sudah ada di daftar belanja
              </span>
            )}
            <Button asChild size="sm" variant="outline" className="h-8 text-xs">
              <Link to="/pembelian">Lihat rincian</Link>
            </Button>
          </>
        }
      />
    );
  }

  if (bolehSetujui && berfoto.length > 0) {
    kartu.push(
      <KartuKeputusan
        key="approval"
        tone="warn"
        icon={ClipboardCheck}
        judul={`${berfoto.length} checklist siap disetujui`}
        rincian={
          tanpaFoto > 0
            ? `${tanpaFoto} checklist lain belum berfoto — itu perlu diperiksa satu per satu.`
            : "Semuanya sudah dilengkapi foto bukti."
        }
        anak={
          <ul className="mt-1.5 space-y-0.5">
            {berfoto.slice(0, 4).map((c) => (
              <li key={c.id} className="text-xs text-amber-800/90 dark:text-amber-300/80 flex items-baseline gap-1.5">
                <span className="font-semibold truncate">{c.employee_name}</span>
                <span className="opacity-70 flex-shrink-0">
                  — {c.total_points_claimed || 0} poin · {(c.photo_proofs || []).length} foto
                </span>
              </li>
            ))}
            {berfoto.length > 4 && (
              <li className="text-[11px] italic text-amber-700/70 dark:text-amber-400/60">
                +{berfoto.length - 4} lainnya
              </li>
            )}
          </ul>
        }
        aksi={
          <>
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={setujuiSemua}
              disabled={menyetujui || isPreviewMode}
              {...previewProps}
            >
              {menyetujui
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyetujui…</>
                : <><Check className="w-3.5 h-3.5" /> Setujui semua ({berfoto.length})</>}
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8 text-xs">
              <Link to="/approval-poin">Periksa dulu</Link>
            </Button>
          </>
        }
      />
    );
  }

  const ditampilkan = kartu.slice(0, BATAS_KARTU);
  const disembunyikan = kartu.length - ditampilkan.length;

  // ── Baris tenang: yang sudah aman tetap dilaporkan, tanpa warna merah ──
  const tenang = [];
  if (dinilai.length > 0) {
    tenang.push(
      waspada.length > 0
        ? `${aman} barang aman, ${waspada.length} perlu dibeli minggu ini`
        : `${aman} barang stoknya aman`
    );
  }
  // Pembelian yang SUDAH diputuskan dan tinggal dieksekusi. Dulu ini dilaporkan
  // spanduk "Harus dibeli" tersendiri berwarna kuning di bawah lapis ini —
  // padahal barang yang gawat sudah punya kartunya sendiri di atas, sehingga
  // satu barang yang sama bisa muncul dua kali dengan dua nada berbeda. Yang
  // tersisa di spanduk itu sebenarnya bukan keputusan hari ini melainkan
  // pekerjaan yang sedang berjalan, jadi tempatnya di baris tenang.
  const dalamProses = daftarBelanja.length + pengajuanAlat.length;
  if (dalamProses > 0) {
    const bagian = [];
    if (daftarBelanja.length > 0) bagian.push(`${daftarBelanja.length} di daftar belanja`);
    if (pengajuanAlat.length > 0) bagian.push(`${pengajuanAlat.length} pengajuan alat disetujui`);
    tenang.push({
      teks: `${bagian.join(" · ")} — menunggu dibeli`,
      href: "/pembelian",
      label: "Lihat rinciannya",
    });
  }
  if (bolehSetujui && tanpaFoto > 0) tenang.push(`${tanpaFoto} checklist tanpa foto menunggu diperiksa`);
  if (bolehSetujui && menungguApproval.length === 0) tenang.push("Tidak ada checklist yang menunggu persetujuan");

  const adaKeputusan = ditampilkan.length > 0;

  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold font-heading flex items-center gap-1.5">
          {adaKeputusan ? "Perlu keputusan Anda" : "Tidak ada yang perlu diputuskan"}
          <InfoHint title="Kenapa hanya ini yang tampil?" variant="info" size={14}>
            Sebuah hal naik ke sini hanya bila bisa <b>dituntaskan dari layar ini</b> dan
            memang mendesak: barang dengan sisa pakai {AMBANG_GAWAT_HARI} hari atau kurang,
            barang yang menghentikan SOP, atau checklist berfoto yang menunggu persetujuan.
            Selebihnya masuk baris &ldquo;sudah diperiksa&rdquo; di bawah.
          </InfoHint>
        </h2>
        <p className="text-xs text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale })}
          {adaKeputusan && ` · ${ditampilkan.length} hal`}
        </p>
      </div>

      {adaKeputusan ? (
        <div className="space-y-2.5">{ditampilkan}</div>
      ) : (
        <div className="rounded-xl border border-accent/25 bg-accent/8 p-3.5 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
            <Check className="w-[18px] h-[18px]" />
          </span>
          <div>
            <p className="font-bold text-sm text-accent">Semua terkendali pagi ini</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tidak ada barang gawat dan tidak ada persetujuan yang tertahan.
            </p>
          </div>
        </div>
      )}

      {disembunyikan > 0 && (
        <p className="text-[11px] text-muted-foreground italic">
          {disembunyikan} keputusan lain disembunyikan agar layar tetap terbaca — buka rinciannya lewat menu.
        </p>
      )}

      {tenang.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Sudah diperiksa, tidak perlu dibuka
          </p>
          <ul className="mt-1 space-y-0.5">
            {tenang.map((t, i) => {
              const isi = typeof t === "string" ? { teks: t } : t;
              return (
                <li key={i} className="text-xs text-muted-foreground flex items-baseline gap-1.5">
                  <Check className="w-3 h-3 text-accent flex-shrink-0 translate-y-0.5" />
                  <span>
                    {isi.teks}
                    {isi.href && (
                      <Link to={isi.href} className="ml-1.5 text-primary hover:underline whitespace-nowrap">
                        {isi.label || "Lihat"} →
                      </Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
