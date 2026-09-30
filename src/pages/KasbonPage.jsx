import PanelKasbon from "@/components/kasbon/PanelKasbon";

/**
 * KasbonPage — pintu /kasbon.
 *
 * Isinya pindah ke components/kasbon/PanelKasbon.jsx pada 30-09-2026,
 * supaya tab "Kasbon" di Penggajian Karyawan memakai layar yang SAMA
 * PERSIS, bukan salinan kedua dengan aturan sendiri. Alasan lengkapnya
 * ada di kepala berkas itu.
 *
 * Pintu ini tetap berdiri sendiri, dan itu disengaja: kiper dan kepala
 * feeder punya hak "kasbon" tetapi TIDAK punya "payroll-gaji", jadi bagi
 * mereka inilah satu-satunya jalan ke kasbonnya sendiri.
 */
export default function KasbonPage() {
  return <PanelKasbon />;
}
