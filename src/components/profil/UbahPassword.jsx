import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { periksaPasswordBaru } from "@/lib/password";

/**
 * UbahPassword — mengganti kata sandi tanpa harus keluar dari aplikasi.
 *
 * Sebelum ini tidak ada jalannya sama sekali: satu-satunya cara mengganti kata
 * sandi adalah lewat tautan "lupa password" di layar masuk, yang berarti harus
 * KELUAR dulu — dan orang yang sudah terlanjur curiga kata sandinya diketahui
 * orang lain justru paling enggan keluar dari aplikasinya.
 *
 * Sebagian orang di peternakan ini masuk lewat Google, bukan kata sandi. Bagi
 * mereka formulir ini tidak akan pernah bekerja, dan itu DIKATAKAN di sini —
 * bukan dibiarkan mereka mencoba lalu menerima pesan galat yang tidak
 * menjelaskan apa-apa.
 */
export default function UbahPassword() {
  const { user } = useCurrentUser();
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [ulang, setUlang] = useState("");
  const [lihat, setLihat] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  const masalah = periksaPasswordBaru({ lama, baru, ulang });

  const simpan = async () => {
    if (masalah || menyimpan) return;
    if (!user?.id) {
      toast.error("Data akun belum termuat. Tunggu sebentar lalu coba lagi.");
      return;
    }
    setMenyimpan(true);
    try {
      await base44.auth.changePassword({
        userId: user.id,
        currentPassword: lama,
        newPassword: baru,
      });
      setLama(""); setBaru(""); setUlang("");
      toast.success("Kata sandi berhasil diubah.");
    } catch (e) {
      // Pesan dari server didahulukan: "kata sandi lama salah" jauh lebih
      // berguna daripada kalimat umum yang dikarang di sini.
      const pesan =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "penyebabnya tidak terbaca";
      toast.error("Gagal mengubah kata sandi — " + pesan);
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" /> Ubah Kata Sandi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-muted/50 border border-border p-3 flex gap-2">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            Kalau Anda masuk lewat <b>Google</b>, kata sandi Anda diatur di akun Google —
            formulir ini tidak berlaku. Yang berlaku hanya untuk akun yang masuk dengan
            email dan kata sandi.
          </p>
        </div>

        <div>
          <Label className="text-xs">Kata sandi sekarang</Label>
          <Input
            type={lihat ? "text" : "password"}
            value={lama}
            onChange={(e) => setLama(e.target.value)}
            className="mt-1"
            autoComplete="current-password"
          />
        </div>

        <div>
          <Label className="text-xs">Kata sandi baru</Label>
          <div className="relative mt-1">
            <Input
              type={lihat ? "text" : "password"}
              value={baru}
              onChange={(e) => setBaru(e.target.value)}
              className="pr-10"
              autoComplete="new-password"
            />
            {/* Bisa dilihat, karena yang mengetik di kandang memakai satu tangan
                dan layar ponsel yang berembun — kata sandi yang salah ketik dua
                kali lebih sering daripada kata sandi yang terbaca orang lain. */}
            <button
              type="button"
              onClick={() => setLihat((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {lihat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <Label className="text-xs">Ulangi kata sandi baru</Label>
          <Input
            type={lihat ? "text" : "password"}
            value={ulang}
            onChange={(e) => setUlang(e.target.value)}
            className="mt-1"
            autoComplete="new-password"
          />
        </div>

        {/* Alasannya ditulis SEBELUM tombol ditekan, bukan sesudah. Formulir
            yang baru bilang "terlalu pendek" setelah orang menunggu kiriman ke
            server membuang waktu yang tidak perlu. */}
        {masalah && (lama || baru || ulang) && (
          <p className="text-xs text-amber-700">{masalah}</p>
        )}

        <Button onClick={simpan} disabled={!!masalah || menyimpan} className="w-full">
          {menyimpan && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Ubah Kata Sandi
        </Button>
      </CardContent>
    </Card>
  );
}
