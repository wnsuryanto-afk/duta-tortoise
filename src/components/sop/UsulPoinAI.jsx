/**
 * UsulPoinAI — mengisi angka poin Inisiatif lebih dulu, bukan memutuskannya.
 *
 * ── Yang diperbaiki ────────────────────────────────────────────────────────
 *
 * Pada 6 Oktober 2026 ada 300 catatan Inisiatif dari 93 hari berbeda (23 Juni
 * sampai hari itu), 289 di antaranya berfoto, dan SELURUHNYA `poin_earned: 0`
 * dengan `approval_status: "pending"`. Tidak satu pun pernah dinilai. Tombol
 * penilaiannya ada sejak lama; yang tidak ada adalah angka awalnya. Penilai membuka baris,
 * melihat empat tombol kosong, dan harus memutuskan sendiri apakah "Siram
 * odot" itu 5 atau 10 poin — untuk setiap baris, setiap hari. Yang terjadi
 * justru tidak ada yang dinilai sama sekali.
 *
 * Komponen ini mengisikan angkanya: AI membaca judul, catatan, dan FOTO bukti,
 * lalu memilih satu dari pilihan poin yang sah beserta satu kalimat alasan.
 * Angkanya langsung terpasang di baris penilaian, jadi penilai cukup menekan
 * "Simpan penilaian".
 *
 * ── Kenapa tetap harus ditekan ─────────────────────────────────────────────
 *
 * Angka ini penilaian atas pekerjaan seseorang, dan bonus poin peternakan
 * menyala. Ada jarak besar antara "AI mengisikan angka supaya penilai tidak
 * mulai dari kosong" dan "AI yang menilai kerja orang". Yang pertama menghapus
 * pekerjaan membosankan; yang kedua memindahkan penilaian ke sesuatu yang
 * tidak bisa dimintai pertanggungjawaban oleh yang dinilainya. Jadi satu
 * ketukan, bukan nol — dan alasannya selalu ikut tampil supaya ketukan itu
 * bukan ketukan buta.
 *
 * ── Kenapa ada simpanan dan batas sesi ─────────────────────────────────────
 *
 * Baris Inisiatif ikut dirender ulang setiap kali keadaan induknya berubah —
 * centangan tugas lain, muat ulang daftar, ganti tab tim. Tanpa simpanan, satu
 * baris bisa memanggil AI berkali-kali untuk pertanyaan yang sama persis, dan
 * tagihannya nyata. `simpanan` membuat satu log hanya ditanyakan sekali per
 * sesi, dan `BATAS_SESI` menahan kerusakan bila ada yang salah: sesudah batas
 * itu layar tetap bisa menilai manual, hanya usulannya yang berhenti.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { SKEMA_USUL, bacaUsul, promptUsulPoin } from "@/lib/usulPoinInisiatif";

/** Usulan yang sudah pernah diambil, per id log. Bertahan selama tab dibuka. */
const simpanan = new Map();
/** Permintaan yang sedang jalan, supaya dua render tidak memanggil dua kali. */
const sedangJalan = new Map();

/** Sebanyak ini pemanggilan AI dalam satu sesi tab. Sesudahnya: manual saja. */
export const BATAS_SESI = 60;
let terpakaiSesi = 0;

/** Berapa pemanggilan AI yang sudah terpakai di sesi ini (dipakai pengujian). */
export function terpakai() {
  return terpakaiSesi;
}

/**
 * Minta usulan untuk satu log. Memakai simpanan bila sudah ada.
 * @returns {Promise<{poin:number, alasan:string, keyakinan:string, dibetulkan:boolean}>}
 */
export async function mintaUsul(log, { opsi, maks, terpakaiHari, paksa = false }) {
  const id = log?.id;
  if (!paksa && id && simpanan.has(id)) return simpanan.get(id);
  if (!paksa && id && sedangJalan.has(id)) return sedangJalan.get(id);
  if (terpakaiSesi >= BATAS_SESI) {
    throw new Error("Batas usulan AI untuk sesi ini sudah tercapai — tentukan poin sendiri.");
  }

  const foto = log?.photo_url || "";
  const prompt = promptUsulPoin({
    judul: log?.item_label,
    catatan: log?.extra_description,
    opsi,
    maks,
    terpakai: terpakaiHari,
    adaFoto: !!foto,
  });

  const jalan = (async () => {
    terpakaiSesi += 1;
    const hasil = await base44.integrations.Core.InvokeLLM({
      prompt,
      ...(foto ? { file_urls: [foto] } : {}),
      response_json_schema: SKEMA_USUL,
    });
    const usul = bacaUsul(hasil, opsi);
    if (id) simpanan.set(id, usul);
    return usul;
  })();

  if (id) {
    sedangJalan.set(id, jalan);
    jalan.catch(() => {}).finally(() => sedangJalan.delete(id));
  }
  return jalan;
}

const WARNA_KEYAKINAN = {
  tinggi: "bg-green-100 text-green-800",
  sedang: "bg-amber-100 text-amber-800",
  rendah: "bg-muted text-muted-foreground",
};

/**
 * @param {object}   props.log           MaintenanceLog Inisiatif yang dinilai
 * @param {number[]} props.opsi          pilihan poin yang sah
 * @param {number}   props.maks          batas harian per orang
 * @param {number}   props.terpakaiHari  poin Inisiatif yang sudah dipakai orang ini hari itu
 * @param {function} props.onUsul        dipanggil dengan angka usulan begitu siap
 * @param {function} props.onPakai       dipanggil saat penilai menekan "Pakai"
 */
export default function UsulPoinAI({ log, opsi = [], maks = 0, terpakaiHari = 0, onUsul, onPakai }) {
  const [usul, setUsul] = useState(() => simpanan.get(log?.id) || null);
  const [memuat, setMemuat] = useState(false);
  const [gagal, setGagal] = useState("");
  // Usulan hanya mengisi angka SEKALI. Kalau penilai sudah menggeser pilihannya,
  // muat ulang data di latar tidak boleh menarik angkanya kembali ke usulan AI.
  const sudahMengisi = useRef(false);

  const ambil = async (paksa = false) => {
    setMemuat(true);
    setGagal("");
    try {
      // Namanya bukan `hasil`: di berkas ini `hasil` berarti jawaban MENTAH
      // dari model, dan penjaga cek-keyakinan menolak `hasil.poin` dibaca di
      // mana pun supaya angka mentah tidak pernah sampai ke layar.
      const usulBaru = await mintaUsul(log, { opsi, maks, terpakaiHari, paksa });
      setUsul(usulBaru);
      if (!sudahMengisi.current || paksa) {
        sudahMengisi.current = true;
        onUsul?.(usulBaru.poin);
      }
    } catch (e) {
      setGagal(e?.message || "AI tidak bisa dihubungi — tentukan poin sendiri.");
    } finally {
      setMemuat(false);
    }
  };

  useEffect(() => {
    if (!log?.id) return;
    const tersimpan = simpanan.get(log.id);
    if (tersimpan) {
      setUsul(tersimpan);
      if (!sudahMengisi.current) {
        sudahMengisi.current = true;
        onUsul?.(tersimpan.poin);
      }
      return;
    }
    // Sengaja hanya bergantung pada id log: `onUsul` dan `ambil` dibuat ulang
    // setiap render induk, dan memasukkan keduanya ke daftar ketergantungan
    // berarti satu pemanggilan AI per render.
    ambil(false);
  }, [log?.id]);

  if (memuat && !usul) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" /> AI sedang menakar poinnya…
      </div>
    );
  }

  if (gagal && !usul) {
    return (
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
        <span>{gagal}</span>
        <button type="button" onClick={() => ambil(true)} className="underline hover:no-underline">
          Coba lagi
        </button>
      </div>
    );
  }

  if (!usul) return null;

  return (
    <div className="rounded-xl border border-green-200 bg-card/70 p-2.5">
      <div className="flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-green-700 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-green-800">Usul AI: {usul.poin} poin</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${WARNA_KEYAKINAN[usul.keyakinan] || WARNA_KEYAKINAN.rendah}`}>
              keyakinan {usul.keyakinan}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{usul.alasan}</p>
          {usul.dibetulkan && (
            <p className="text-[11px] text-amber-700 mt-0.5">
              Angka dari AI bukan salah satu pilihan yang sah, jadi digeser ke yang terdekat.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1 italic">
            Usulan saja — Anda yang memutuskan dan menyimpan.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onPakai?.(usul.poin)}
            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-green-700 text-white hover:bg-green-800"
          >
            Pakai {usul.poin}
          </button>
          <button
            type="button"
            onClick={() => ambil(true)}
            disabled={memuat}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            {memuat ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Ulang
          </button>
        </div>
      </div>
    </div>
  );
}
