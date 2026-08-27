import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { GitBranch, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import InfoHint from "@/components/ui/info-hint";
import TortoiseSearchSelect from "@/components/health/TortoiseSearchSelect";
import { petaKura, cariInduk, calonInduk, adalahRujukanMesin } from "@/lib/silsilah";

/**
 * PilihInduk — mengisi induk seekor kura langsung dari formulirnya.
 *
 * Sampai sekarang silsilah HANYA bisa terisi lewat pencatatan penetasan. Untuk
 * kura yang datang dari luar — dibeli, dihibahkan, atau sudah ada sebelum
 * aplikasi ini dipakai — kolom induknya tidak bisa diisi dari mana pun juga:
 * tidak ada satu layar pun di seluruh aplikasi yang menulis ke sana.
 *
 * Padahal itu bukan kolom hiasan. Kura dengan induk tercatat bisa diklaim satu
 * generasi lebih tinggi (F2 alih-alih F1), dan F2 dijual lebih mahal. Silsilah
 * juga yang dipakai pemeriksaan perkawinan sedarah.
 *
 * Rujukan yang sudah tersimpan bisa berbentuk id, kode, atau nama — tiga jalur
 * pencatatan yang berbeda menulis tiga bentuk yang berbeda. Yang tersimpan
 * ditampilkan apa adanya setelah dicari; yang BARU dipilih selalu disimpan
 * sebagai id.
 */
/**
 * Satu baris pemilih induk.
 *
 * Didefinisikan di tingkat modul, BUKAN di dalam PilihInduk: komponen yang
 * dibuat ulang setiap render membuat React melepas dan memasang ulang isinya,
 * sehingga daftar pencarian menutup sendiri di setiap huruf yang diketik.
 */
function BarisInduk({ kunci, label, jenisKelamin, aksen, rujukan, peta, calon, isLoading, onUbah }) {
  const ketemu = rujukan ? cariInduk(rujukan, peta) : null;

  // Rujukan tersimpan yang tidak ketemu: kuranya sudah dihapus atau namanya
  // berubah. Ditampilkan apa adanya bila masih terbaca manusia, supaya
  // keterangan lama tidak hilang begitu saja saat formulir dibuka.
  const sisaLama = rujukan && !ketemu && !adalahRujukanMesin(rujukan) ? String(rujukan) : null;

  return (
    <div className="space-y-1">
      {/* Tanpa justify-between: pada susunan dua kolom, tautan "kosongkan" yang
          didorong ke tepi kanan berakhir menempel pada label kolom sebelahnya
          dan terbaca seolah milik kolom itu. */}
      <div className="flex items-center gap-2">
        <Label className="text-xs">{label}</Label>
        {rujukan && (
          <button
            type="button"
            onClick={() => onUbah(kunci, "")}
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
          >
            <X className="w-3 h-3" /> kosongkan
          </button>
        )}
      </div>
      <TortoiseSearchSelect
        tortoises={calon}
        value={ketemu?.id || ""}
        onChange={(id) => onUbah(kunci, id || "")}
        loading={isLoading}
        accent={aksen}
        genderFilter={jenisKelamin}
        placeholder={sisaLama ? `Tercatat: ${sisaLama}` : "Belum dipilih"}
      />
      {sisaLama && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          Tercatat sebagai "{sisaLama}", tapi kura dengan nama itu tidak ada di daftar.
          Pilih ulang untuk menyambungkannya.
        </p>
      )}
    </div>
  );
}

export default function PilihInduk({ kura, nilai, onUbah }) {
  const { data: tortoises = [], isLoading } = useQuery({
    queryKey: ["tortoises-induk"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 1000),
    staleTime: 5 * 60 * 1000,
  });

  const peta = useMemo(() => petaKura(tortoises), [tortoises]);
  const calonJantan = useMemo(() => calonInduk(kura, tortoises, "jantan", peta), [kura, tortoises, peta]);
  const calonBetina = useMemo(() => calonInduk(kura, tortoises, "betina", peta), [kura, tortoises, peta]);

  return (
    <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-3">
      <div className="flex items-center gap-1.5">
        <GitBranch className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium">Induk (silsilah)</span>
        <InfoHint title="Kenapa diisi" variant="info" size={13}>
          Kura dengan induk tercatat bisa diklaim satu generasi lebih tinggi —
          <b> F2 alih-alih F1</b> — dan F2 dijual lebih mahal. Silsilah ini juga
          yang dipakai pemeriksaan perkawinan sedarah dan pohon keluarga di
          profil kura. Untuk kura hasil tetas sendiri, kolom ini terisi otomatis.
        </InfoHint>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BarisInduk
          kunci="parent_male" label="♂ Ayah" jenisKelamin="jantan" aksen="green"
          rujukan={nilai?.parent_male} peta={peta} calon={calonJantan}
          isLoading={isLoading} onUbah={onUbah}
        />
        <BarisInduk
          kunci="parent_female" label="♀ Ibu" jenisKelamin="betina" aksen="red"
          rujukan={nilai?.parent_female} peta={peta} calon={calonBetina}
          isLoading={isLoading} onUbah={onUbah}
        />
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        Kosongkan bila induknya memang tidak diketahui. Keturunan kura ini tidak
        ditawarkan di daftar — memilihnya membuat silsilahnya berputar.
      </p>
    </div>
  );
}
