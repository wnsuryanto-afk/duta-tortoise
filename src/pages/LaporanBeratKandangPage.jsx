/**
 * LaporanBeratKandangPage — kebutuhan pakan harian per kandang.
 *
 * Untuk tiap kandang: jumlah kura, total berat badan terakhir, dan kebutuhan
 * pakan 3,5% per hari. Berat diambil dari catatan timbang terbaru tiap kura;
 * kura yang belum pernah ditimbang ditandai dan DIKELUARKAN dari jumlah —
 * tidak diisi angka tebakan. Aturannya di lib/beratKandang.js.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, ArrowLeft } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import KeadaanKosong from "@/components/common/KeadaanKosong";
import { rekapPerKandang, PORSI_HARIAN } from "@/lib/beratKandang";

const TIDAK_HIDUP = ["mati", "terjual", "diarsipkan"];

export default function LaporanBeratKandangPage() {
  const { data: tortoises = [], isLoading } = useQuery({
    queryKey: ["tortoise-berat-kandang"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 2000),
  });
  const { data: measurements = [] } = useQuery({
    queryKey: ["measurement-berat-kandang"],
    queryFn: () => base44.entities.MeasurementHistory.list("-date", 2000),
  });
  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures-berat-kandang"],
    queryFn: () => base44.entities.Enclosure.list("name", 500),
  });

  const hidup = useMemo(
    () => (tortoises || []).filter(
      (t) => !t.is_archived && !TIDAK_HIDUP.includes(t.status),
    ),
    [tortoises],
  );

  const { baris, total } = useMemo(
    () => rekapPerKandang({ tortoises: hidup, measurements, enclosures }),
    [hidup, measurements, enclosures],
  );

  const angka = (n, digit = 1) =>
    Number(n).toLocaleString("id-ID", { maximumFractionDigits: digit });

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Kebutuhan Pakan per Kandang"
        subtitle={`3,5% dari total berat badan, dihitung dari catatan timbang terbaru`}
        icon={Scale}
        chips={[
          {
            key: "kandang",
            label: "Kandang",
            value: String(baris.filter((b) => b.jumlahKura > 0).length),
            tanpaTujuan: "jumlah kandang berisi kura di tabel bawah",
          },
          {
            key: "berat",
            label: "Total berat",
            value: `${angka(total.totalBeratKg)} kg`,
            tanpaTujuan: "jumlah semua kandang di bawah",
          },
          {
            key: "butuh",
            label: "Pakan/hari",
            value: `${angka(total.kebutuhanKg, 2)} kg`,
            tanpaTujuan: "total seluruh kandang",
            tone: "good",
          },
          ...(total.belumDitimbang > 0
            ? [{
                key: "belum",
                label: "Belum ditimbang",
                value: `${total.belumDitimbang} ekor`,
                tanpaTujuan: "tidak masuk total berat",
                tone: "warn",
              }]
            : []),
        ]}
        actions={
          <Button asChild variant="outline" className="gap-2">
            <Link to="/pakan-harian"><ArrowLeft className="w-4 h-4" /> Pakan Harian</Link>
          </Button>
        }
      />

      {isLoading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Memuat…</Card>
      ) : baris.length === 0 ? (
        <Card>
          <KeadaanKosong
            gambar="kura"
            judul="Belum ada kura aktif"
            keterangan="Laporan ini dihitung dari kura yang masih tercatat aktif."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Kandang</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Kura</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Total berat</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Pakan kg/hari</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {baris.map((b) => (
                  <tr key={b.id || "tanpa_kandang"} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{b.nama}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {b.jumlahDitimbang} ditimbang
                        {b.belumDitimbang > 0 && (
                          <span className="text-amber-700"> · {b.belumDitimbang} belum ditimbang</span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">{b.jumlahKura}</td>
                    <td className="px-4 py-2.5 text-right tabular whitespace-nowrap">
                      {b.totalBeratKg > 0 ? `${angka(b.totalBeratKg)} kg` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-semibold whitespace-nowrap">
                      {b.kebutuhanKg > 0 ? `${angka(b.kebutuhanKg, 2)} kg` : <span className="font-normal text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-right tabular">{total.jumlahKura}</td>
                  <td className="px-4 py-2.5 text-right tabular whitespace-nowrap">{angka(total.totalBeratKg)} kg</td>
                  <td className="px-4 py-2.5 text-right tabular whitespace-nowrap">{angka(total.kebutuhanKg, 2)} kg</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-4 py-3 border-t bg-muted/20 text-[11px] text-muted-foreground space-y-1">
            <p>
              Berat diambil dari catatan timbang terbaru tiap kura. Kura yang belum pernah ditimbang
              tidak diisi angka tebakan — ia dikeluarkan dari total berat kandangnya.
            </p>
            <p>Kebutuhan = total berat × {PORSI_HARIAN * 100}%.</p>
          </div>
        </Card>
      )}
    </div>
  );
}