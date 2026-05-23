import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, FileText, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

function formatRp(v) {
  return "Rp " + (v || 0).toLocaleString("id-ID");
}

function genSertifNo(sale) {
  if (!sale?.sale_date) return "DT/—/—/001";
  const d = new Date(sale.sale_date);
  const bulan = String(d.getMonth() + 1).padStart(2, "0");
  const tahun = d.getFullYear();
  const idx = String((sale.id || "").slice(-3)).toUpperCase() || "001";
  return `DT/${bulan}/${tahun}/${idx}`;
}

function genInvoiceNo(sale) {
  if (!sale?.sale_date) return "INV/—/—/001";
  const d = new Date(sale.sale_date);
  const bulan = String(d.getMonth() + 1).padStart(2, "0");
  const tahun = d.getFullYear();
  const idx = String((sale.id || "").slice(-3)).toUpperCase() || "001";
  return `INV/${bulan}/${tahun}/${idx}`;
}

// ── Certificate ────────────────────────────────────────────────────────
function CertificatePrint({ sale, tortoise }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Sertifikat Penjualan</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; }
        .cert { max-width: 500px; margin: 0 auto; border: 3px double #2D5016; padding: 30px; border-radius: 12px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2D5016; padding-bottom: 16px; }
        .logo-text { font-size: 22px; font-weight: 800; color: #2D5016; letter-spacing: 1px; }
        .subtitle { font-size: 11px; color: #6B7568; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase; }
        .cert-title { font-size: 16px; font-weight: 700; color: #2D5016; margin-top: 12px; }
        .cert-no { font-size: 11px; color: #888; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        td { padding: 6px 8px; font-size: 12px; vertical-align: top; }
        td:first-child { color: #6B7568; width: 45%; }
        td:last-child { font-weight: 600; color: #2C3E2D; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6B9B37; letter-spacing: 1px; margin: 16px 0 8px; border-bottom: 1px solid #E5E1D8; padding-bottom: 4px; }
        .statement { font-size: 11px; color: #555; line-height: 1.7; margin: 16px 0; padding: 12px; background: #F5F1E8; border-radius: 8px; border-left: 3px solid #2D5016; }
        .footer { display: flex; justify-content: space-between; margin-top: 30px; }
        .sign-box { text-align: center; }
        .sign-line { border-top: 1px solid #333; width: 120px; margin: 30px auto 4px; }
        .sign-label { font-size: 10px; color: #888; }
        .tortoise-img { width: 120px; height: 90px; object-fit: cover; border-radius: 8px; border: 2px solid #E5E1D8; margin: 12px auto; display: block; }
        @media print { body { padding: 0; } }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const sertifNo = genSertifNo(sale);
  const saleDate = sale?.sale_date ? format(new Date(sale.sale_date), "d MMMM yyyy", { locale: id }) : "—";
  const sourceMap = { hasil_sendiri: "CBB (Captive Bred)", beli_lokal: "Lokal", import: "Import", tidak_diketahui: "Tidak Diketahui" };
  const genderMap = { jantan: "Jantan (♂)", betina: "Betina (♀)", belum_diketahui: "Belum Diketahui" };

  return (
    <div>
      <div ref={printRef}>
        <div className="cert" style={{ maxWidth: 500, margin: "0 auto", border: "3px double #2D5016", padding: 28, borderRadius: 12 }}>
          <div style={{ textAlign: "center", borderBottom: "2px solid #2D5016", paddingBottom: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#2D5016", letterSpacing: 1 }}>🐢 DUTA TORTOISE</div>
            <div style={{ fontSize: 10, color: "#6B7568", marginTop: 4, letterSpacing: 2, textTransform: "uppercase" }}>Breeding & Conservation Farm</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#2D5016", marginTop: 12 }}>SERTIFIKAT PENJUALAN</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>No: {sertifNo}</div>
          </div>

          {tortoise?.photos?.[0]?.url && (
            <img src={tortoise.photos[0].url} alt="tortoise" className="tortoise-img" />
          )}

          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6B9B37", letterSpacing: 1, marginBottom: 6 }}>Data Kura-Kura</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Nama", sale?.tortoise_name || "—"],
                ["Morph", tortoise?.morph || "—"],
                ["Jenis Kelamin", genderMap[tortoise?.gender] || "—"],
                ["Berat (saat dijual)", tortoise?.weight_grams ? `${tortoise.weight_grams} gram` : "—"],
                ["Sumber", sourceMap[tortoise?.source] || "—"],
                ["Tgl Lahir/Menetas", tortoise?.birth_date ? format(new Date(tortoise.birth_date), "d MMMM yyyy", { locale: id }) : "—"],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ color: "#6B7568", padding: "5px 8px", fontSize: 11, width: "45%" }}>{label}</td>
                  <td style={{ fontWeight: 600, padding: "5px 8px", fontSize: 11, color: "#2C3E2D" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6B9B37", letterSpacing: 1, margin: "14px 0 6px", borderTop: "1px solid #E5E1D8", paddingTop: 10 }}>Data Pembeli</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Nama", sale?.buyer_name || "—"],
                ["Telepon", sale?.buyer_phone || "—"],
                ["Alamat", sale?.buyer_address || "—"],
                ["Tanggal Transaksi", saleDate],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ color: "#6B7568", padding: "5px 8px", fontSize: 11, width: "45%" }}>{label}</td>
                  <td style={{ fontWeight: 600, padding: "5px 8px", fontSize: 11, color: "#2C3E2D" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.7, margin: "16px 0", padding: 12, background: "#F5F1E8", borderRadius: 8, borderLeft: "3px solid #2D5016" }}>
            Dengan ini menyatakan bahwa kura-kura tersebut di atas telah berpindah kepemilikan kepada pembeli
            dalam kondisi sehat. Sertifikat ini merupakan bukti sah transaksi pemindahan kepemilikan hewan peliharaan
            antara Duta Tortoise Farm dan pembeli.
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#888" }}>{saleDate}</div>
              <div style={{ borderTop: "1px solid #333", width: 120, margin: "28px auto 4px" }} />
              <div style={{ fontSize: 10, color: "#888" }}>Penjual / Owner</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>Duta Tortoise</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#888" }}>&nbsp;</div>
              <div style={{ borderTop: "1px solid #333", width: 120, margin: "28px auto 4px" }} />
              <div style={{ fontSize: 10, color: "#888" }}>Pembeli</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{sale?.buyer_name}</div>
            </div>
          </div>
        </div>
      </div>
      <Button className="w-full mt-4 gap-2" onClick={handlePrint}>
        <Printer className="w-4 h-4" /> Cetak Sertifikat
      </Button>
    </div>
  );
}

// ── Invoice ────────────────────────────────────────────────────────────
function InvoicePrint({ sale }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Invoice</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; font-size: 12px; }
        .invoice { max-width: 420px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #2D5016; padding-bottom: 12px; margin-bottom: 16px; }
        .farm-name { font-size: 18px; font-weight: 800; color: #2D5016; }
        .farm-sub { font-size: 10px; color: #888; margin-top: 2px; }
        .inv-no { text-align: right; font-size: 11px; color: #888; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        td { padding: 5px 6px; font-size: 12px; }
        td:first-child { color: #666; width: 45%; }
        td:last-child { font-weight: 600; text-align: right; }
        .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
        .total-row td { font-size: 14px; font-weight: 800; color: #2D5016; border-top: 2px solid #2D5016; padding-top: 8px; }
        .remaining { color: #c0392b !important; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
        @media print { body { padding: 0; } }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const invNo = genInvoiceNo(sale);
  const saleDate = sale?.sale_date ? format(new Date(sale.sale_date), "d MMMM yyyy", { locale: id }) : "—";
  const dp = sale?.dp_amount || 0;
  const price = sale?.price || 0;
  const remaining = price - dp;

  const payMap = { lunas: "Lunas", dp: "Down Payment (DP)", belum_bayar: "Belum Dibayar" };
  const shipMap = { ambil_sendiri: "Ambil Sendiri", kirim_kurir: "Kurir", cargo: "Cargo" };

  return (
    <div>
      <div ref={printRef}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <div style={{ textAlign: "center", borderBottom: "2px solid #2D5016", paddingBottom: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#2D5016" }}>🐢 DUTA TORTOISE</div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Breeding & Conservation Farm</div>
          </div>

          <div style={{ textAlign: "right", fontSize: 11, color: "#888", marginBottom: 12 }}>
            <div>No. Invoice: <strong>{invNo}</strong></div>
            <div>Tanggal: {saleDate}</div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6B9B37", marginBottom: 6 }}>Data Pembeli</div>
          <table>
            <tbody>
              <tr><td>Nama</td><td>{sale?.buyer_name || "—"}</td></tr>
              <tr><td>Telepon</td><td>{sale?.buyer_phone || "—"}</td></tr>
              {sale?.buyer_address && <tr><td>Alamat</td><td>{sale.buyer_address}</td></tr>}
            </tbody>
          </table>

          <div style={{ borderTop: "1px dashed #ccc", margin: "10px 0" }} />
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6B9B37", marginBottom: 6 }}>Detail Barang</div>
          <table>
            <tbody>
              <tr><td>Item</td><td>Kura-kura {sale?.tortoise_name}</td></tr>
              <tr><td>Qty</td><td>1 ekor</td></tr>
              <tr><td>Harga</td><td>{formatRp(price)}</td></tr>
            </tbody>
          </table>

          <div style={{ borderTop: "1px dashed #ccc", margin: "10px 0" }} />
          <table>
            <tbody>
              {dp > 0 && (
                <>
                  <tr><td>DP Diterima</td><td>{formatRp(dp)}</td></tr>
                  <tr><td style={{ color: "#c0392b" }}>Sisa Pembayaran</td><td style={{ color: "#c0392b", fontWeight: 800 }}>{formatRp(remaining)}</td></tr>
                </>
              )}
              <tr className="total-row">
                <td style={{ fontSize: 14, fontWeight: 800, color: "#2D5016", borderTop: "2px solid #2D5016", paddingTop: 8 }}>TOTAL</td>
                <td style={{ fontSize: 14, fontWeight: 800, color: "#2D5016", borderTop: "2px solid #2D5016", paddingTop: 8, textAlign: "right" }}>{formatRp(price)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ borderTop: "1px dashed #ccc", margin: "10px 0" }} />
          <table>
            <tbody>
              <tr><td>Status Bayar</td><td>{payMap[sale?.payment_status] || sale?.payment_status}</td></tr>
              <tr><td>Pengiriman</td><td>{shipMap[sale?.shipping_method] || sale?.shipping_method}</td></tr>
            </tbody>
          </table>

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: "#999", borderTop: "1px solid #eee", paddingTop: 12 }}>
            Terima kasih telah berbelanja di Duta Tortoise 🐢<br />
            Semoga kura-kura barunya sehat dan tumbuh subur!
          </div>
        </div>
      </div>
      <Button className="w-full mt-4 gap-2" onClick={handlePrint}>
        <Printer className="w-4 h-4" /> Cetak Invoice
      </Button>
    </div>
  );
}

// ── WhatsApp ────────────────────────────────────────────────────────────
function WASection({ sale }) {
  const invNo = genInvoiceNo(sale);
  const saleDate = sale?.sale_date ? format(new Date(sale.sale_date), "d MMMM yyyy", { locale: id }) : "—";
  const formatRpLocal = (v) => "Rp " + (v || 0).toLocaleString("id-ID");

  const message = `Halo ${sale?.buyer_name} 👋

Terima kasih sudah mempercayai *Duta Tortoise* 🐢

*Detail Pembelian:*
📋 No Invoice: ${invNo}
🐢 Kura-kura: ${sale?.tortoise_name}
💰 Harga: ${formatRpLocal(sale?.price)}
${sale?.dp_amount > 0 ? `✅ DP: ${formatRpLocal(sale.dp_amount)}\n⏳ Sisa: ${formatRpLocal((sale?.price || 0) - (sale?.dp_amount || 0))}\n` : ""}📅 Tanggal: ${saleDate}

Semoga kura-kura barunya sehat dan tumbuh subur! 🌱
Jika ada pertanyaan, jangan ragu menghubungi kami ya.

_Duta Tortoise Farm_`;

  const phone = (sale?.buyer_phone || "").replace(/\D/g, "").replace(/^0/, "62");
  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-xl p-4">
        <p className="text-xs font-mono whitespace-pre-wrap text-sm leading-relaxed">{message}</p>
      </div>
      <Button
        className="w-full gap-2 bg-green-600 hover:bg-green-700"
        onClick={() => window.open(waLink, "_blank")}
        disabled={!sale?.buyer_phone}
      >
        <MessageCircle className="w-4 h-4" />
        Kirim via WhatsApp
      </Button>
      {!sale?.buyer_phone && <p className="text-xs text-destructive text-center">Nomor HP pembeli belum diisi</p>}
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────
export default function SalePrintModal({ open, onClose, sale, tortoise }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Cetak Dokumen Penjualan
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="sertifikat">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="sertifikat">Sertifikat</TabsTrigger>
            <TabsTrigger value="invoice">Invoice</TabsTrigger>
            <TabsTrigger value="wa">WhatsApp</TabsTrigger>
          </TabsList>
          <TabsContent value="sertifikat" className="mt-4">
            <CertificatePrint sale={sale} tortoise={tortoise} />
          </TabsContent>
          <TabsContent value="invoice" className="mt-4">
            <InvoicePrint sale={sale} />
          </TabsContent>
          <TabsContent value="wa" className="mt-4">
            <WASection sale={sale} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}