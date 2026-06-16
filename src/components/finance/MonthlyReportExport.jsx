import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, Loader2, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import jsPDF from "jspdf";

const fmt = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const GREEN_DARK = [27, 67, 50];
const GREEN_MED = [34, 85, 34];
const GREEN_LIGHT = [220, 240, 220];
const WHITE = [255, 255, 255];
const GRAY = [245, 245, 245];
const RED = [180, 40, 40];
const TEXT = [30, 30, 30];

// Draw page header
function drawHeader(doc, settings, period, pageNum, totalPages) {
  // Green banner
  doc.setFillColor(...GREEN_DARK);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(settings?.company_name || "DUTA TORTOISE FARM", 14, 11);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("LAPORAN BULANAN", 14, 17);
  doc.text(period, 14, 22);

  // Right side: page number
  doc.setFontSize(9);
  doc.text(`Halaman ${pageNum}/${totalPages}`, 196, 11, { align: "right" });
  doc.text(format(new Date(), "d MMM yyyy", { locale: idLocale }), 196, 17, { align: "right" });
  doc.setTextColor(...TEXT);
}

// Draw footer
function drawFooter(doc, settings, pageNum, totalPages) {
  doc.setFillColor(...GREEN_DARK);
  doc.rect(0, 285, 210, 12, "F");
  doc.setTextColor(200, 230, 200);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const addr = [settings?.company_address, settings?.company_city].filter(Boolean).join(", ");
  doc.text(addr || "Duta Tortoise Farm", 14, 292);
  doc.text(`Halaman ${pageNum} dari ${totalPages}`, 196, 292, { align: "right" });
  doc.setTextColor(...TEXT);
}

// Draw a simple table
function drawTable(doc, headers, rows, startY, colWidths) {
  const rowH = 7;
  const x0 = 14;
  let y = startY;

  // Header row
  doc.setFillColor(...GREEN_MED);
  doc.rect(x0, y, 182, rowH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  let cx = x0;
  headers.forEach((h, i) => {
    doc.text(h, cx + 2, y + 5);
    cx += colWidths[i];
  });
  y += rowH;

  // Data rows
  rows.forEach((row, ri) => {
    if (ri % 2 === 0) {
      doc.setFillColor(...GREEN_LIGHT);
      doc.rect(x0, y, 182, rowH, "F");
    } else {
      doc.setFillColor(...WHITE);
      doc.rect(x0, y, 182, rowH, "F");
    }
    // Border
    doc.setDrawColor(180, 210, 180);
    doc.rect(x0, y, 182, rowH);
    doc.setTextColor(...TEXT);
    doc.setFont("helvetica", "normal");
    cx = x0;
    row.forEach((cell, ci) => {
      const txt = String(cell ?? "—");
      doc.text(txt, cx + 2, y + 5, { maxWidth: colWidths[ci] - 3 });
      cx += colWidths[ci];
    });
    y += rowH;
  });
  return y;
}

// Simple pie chart drawn with jsPDF
function drawPieChart(doc, data, cx, cy, r) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return;
  const COLORS = [[34,85,34],[88,168,88],[160,210,160],[200,240,200],[100,140,100],[50,100,50]];
  let startAngle = -Math.PI / 2;
  data.forEach((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const midAngle = startAngle + angle / 2;
    // Draw slice
    doc.setFillColor(...COLORS[i % COLORS.length]);
    doc.setDrawColor(255, 255, 255);
    // jsPDF doesn't have arc/path natively, simulate with many lines
    const steps = Math.max(6, Math.ceil(angle * 20));
    const points = [[cx, cy]];
    for (let s = 0; s <= steps; s++) {
      const a = startAngle + (angle * s) / steps;
      points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    // Draw filled polygon
    doc.lines(
      points.slice(1).map((p, idx) => {
        if (idx === 0) return [p[0] - points[0][0], p[1] - points[0][1]];
        return [p[0] - points[idx][0], p[1] - points[idx][1]];
      }),
      points[0][0], points[0][1], [1, 1], "FD", true
    );
    startAngle = endAngle;
  });
  // Legend
  data.forEach((d, i) => {
    const lx = cx + r + 8;
    const ly = cy - r + i * 10 + 4;
    doc.setFillColor(...COLORS[i % COLORS.length]);
    doc.rect(lx, ly - 3, 6, 5, "F");
    doc.setTextColor(...TEXT);
    doc.setFontSize(7);
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : 0;
    doc.text(`${d.name} (${pct}%)`, lx + 8, ly + 1);
  });
}

export default function MonthlyReportExport({ role }) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(format(new Date(), "yyyy-MM"));
  const [generating, setGenerating] = useState(false);

  // Only owner, admin, manajer, investor can download
  const canExport = ["owner", "admin", "manajer", "investor"].includes(role);
  if (!canExport) return null;

  const MONTHS = Array.from({ length: 12 }, (_, i) => ({
    value: format(new Date(2026, i, 1), "yyyy-MM"),
    label: format(new Date(2026, i, 1), "MMMM yyyy", { locale: idLocale }),
  }));

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const [year, month] = period.split("-").map(Number);
      const start = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
      const periodLabel = format(new Date(year, month - 1), "MMMM yyyy", { locale: idLocale });

      // Fetch all data
      const [
        transactions, tortoises, sales, healthRecords,
        breedings, attendances, kasbons, salarySlips,
        companySettings,
      ] = await Promise.all([
        base44.entities.FinanceTransaction.list("-date", 1000),
        base44.entities.Tortoise.list("-created_date", 200),
        base44.entities.Sale.list("-sale_date", 200),
        base44.entities.HealthRecord.list("-date", 200),
        base44.entities.Breeding.list("-created_date", 100),
        base44.entities.Attendance.list("-date", 200),
        base44.entities.Kasbon.list("-created_date", 50),
        base44.entities.SalarySlip.filter({ period }),
        base44.entities.CompanySettings.filter({ setting_key: "main" }),
      ]);

      const settings = companySettings[0] || {};

      // Filter by period
      const periodTx = transactions.filter(t => t.date >= start && t.date <= end && !t.excluded_from_reports);
      const periodSales = sales.filter(s => (s.sale_date || "").startsWith(period) && !s.excluded_from_reports);
      const periodHealth = healthRecords.filter(h => (h.date || "").startsWith(period));
      const periodAttendance = attendances.filter(a => (a.date || "").startsWith(period));
      const periodBreedings = breedings.filter(b => (b.egg_laying_date || "").startsWith(period));
      const activeBreedings = breedings.filter(b => ["bertelur", "inkubasi"].includes(b.status));

      const totalPemasukan = periodTx.filter(t => t.type === "pemasukan").reduce((s, t) => s + (t.amount || 0), 0);
      const totalPengeluaran = periodTx.filter(t => t.type === "pengeluaran").reduce((s, t) => s + (t.amount || 0), 0);
      const laba = totalPemasukan - totalPengeluaran;
      const margin = totalPemasukan > 0 ? ((laba / totalPemasukan) * 100).toFixed(1) : "0.0";

      const activeTortoises = tortoises.filter(t => ["aktif", "baby"].includes(t.status));
      const soldTortoises = tortoises.filter(t => t.status === "terjual" && (t.last_status_change || "").startsWith(period));
      const deadTortoises = tortoises.filter(t => t.status === "mati" && (t.death_date || "").startsWith(period));
      const hatchedThisMonth = breedings.filter(b => (b.hatch_date || "").startsWith(period)).reduce((s, b) => s + (b.hatched_count || 0), 0);

      const TOTAL_PAGES = 6;
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      // ───────────────────────────────────────────
      // PAGE 1: RINGKASAN EKSEKUTIF
      // ───────────────────────────────────────────
      drawHeader(doc, settings, periodLabel, 1, TOTAL_PAGES);
      let y = 36;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREEN_DARK);
      doc.text("RINGKASAN EKSEKUTIF", 14, y);
      y += 8;

      // Populasi box
      doc.setFillColor(...GREEN_LIGHT);
      doc.roundedRect(14, y, 86, 32, 3, 3, "F");
      doc.setTextColor(...GREEN_DARK);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("🐢 POPULASI", 18, y + 7);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      doc.text(`Aktif: ${activeTortoises.length} ekor`, 18, y + 14);
      doc.text(`Terjual bulan ini: ${soldTortoises.length} ekor`, 18, y + 20);
      doc.text(`Mati bulan ini: ${deadTortoises.length} ekor`, 18, y + 26);
      doc.text(`Menetas bulan ini: ${hatchedThisMonth} ekor`, 18, y + 32);

      // Keuangan box
      doc.setFillColor(...GREEN_LIGHT);
      doc.roundedRect(104, y, 90, 32, 3, 3, "F");
      doc.setTextColor(...GREEN_DARK);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("💰 KEUANGAN", 108, y + 7);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      doc.text(`Pemasukan: ${fmt(totalPemasukan)}`, 108, y + 14);
      doc.text(`Pengeluaran: ${fmt(totalPengeluaran)}`, 108, y + 20);
      doc.text(`Laba Bersih: ${fmt(laba)}`, 108, y + 26);
      doc.text(`Margin: ${margin}%`, 108, y + 32);
      y += 40;

      // Breeding summary
      const totalEggsActive = activeBreedings.reduce((s, b) => s + (b.egg_count || 0), 0);
      const totalFertile = activeBreedings.reduce((s, b) => s + (b.egg_records || []).filter(e => e.status === "fertile").length, 0);
      const totalHatched = activeBreedings.reduce((s, b) => s + (b.hatched_count || 0), 0);

      doc.setFillColor(...GREEN_LIGHT);
      doc.roundedRect(14, y, 86, 28, 3, 3, "F");
      doc.setTextColor(...GREEN_DARK);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("🥚 BREEDING", 18, y + 7);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      doc.text(`Batch aktif: ${activeBreedings.length}`, 18, y + 14);
      doc.text(`Total telur inkubasi: ${totalEggsActive}`, 18, y + 20);
      doc.text(`Fertile: ${totalFertile} | Menetas: ${totalHatched}`, 18, y + 26);

      // Sales summary
      const totalSalesRev = periodSales.reduce((s, x) => s + (x.price || 0), 0);
      const totalSalesLaba = periodSales.reduce((s, x) => s + ((x.price || 0) - (x.hpp || 0)), 0);
      doc.setFillColor(...GREEN_LIGHT);
      doc.roundedRect(104, y, 90, 28, 3, 3, "F");
      doc.setTextColor(...GREEN_DARK);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("📦 PENJUALAN", 108, y + 7);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      doc.text(`Transaksi: ${periodSales.length} penjualan`, 108, y + 14);
      doc.text(`Revenue: ${fmt(totalSalesRev)}`, 108, y + 20);
      doc.text(`Laba Penjualan: ${fmt(totalSalesLaba)}`, 108, y + 26);
      y += 38;

      // Bar chart pemasukan vs pengeluaran (sederhana)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREEN_DARK);
      doc.text("Pemasukan vs Pengeluaran", 14, y + 8);
      y += 12;
      const maxVal = Math.max(totalPemasukan, totalPengeluaran, 1);
      const barWidth = 50;
      const barMaxH = 40;
      // Pemasukan bar
      const hIn = Math.round((totalPemasukan / maxVal) * barMaxH);
      doc.setFillColor(34, 139, 34);
      doc.rect(30, y + barMaxH - hIn, barWidth, hIn, "F");
      doc.setFontSize(7);
      doc.setTextColor(...TEXT);
      doc.text(fmt(totalPemasukan), 30 + barWidth / 2, y + barMaxH + 6, { align: "center" });
      doc.text("Pemasukan", 30 + barWidth / 2, y + barMaxH + 11, { align: "center" });
      // Pengeluaran bar
      const hOut = Math.round((totalPengeluaran / maxVal) * barMaxH);
      doc.setFillColor(180, 50, 50);
      doc.rect(100, y + barMaxH - hOut, barWidth, hOut, "F");
      doc.text(fmt(totalPengeluaran), 100 + barWidth / 2, y + barMaxH + 6, { align: "center" });
      doc.text("Pengeluaran", 100 + barWidth / 2, y + barMaxH + 11, { align: "center" });
      // Laba bar
      const hProfit = Math.round((Math.abs(laba) / maxVal) * barMaxH);
      doc.setFillColor(laba >= 0 ? 0 : 180, laba >= 0 ? 100 : 0, 0);
      doc.rect(170, y + barMaxH - hProfit, barWidth, hProfit, "F");
      doc.text(fmt(laba), 170 + barWidth / 2, y + barMaxH + 6, { align: "center" });
      doc.text("Laba Bersih", 170 + barWidth / 2, y + barMaxH + 11, { align: "center" });

      drawFooter(doc, settings, 1, TOTAL_PAGES);

      // ───────────────────────────────────────────
      // PAGE 2: RINCIAN PENJUALAN
      // ───────────────────────────────────────────
      doc.addPage();
      drawHeader(doc, settings, periodLabel, 2, TOTAL_PAGES);
      y = 36;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREEN_DARK);
      doc.text("RINCIAN PENJUALAN", 14, y);
      y += 8;

      if (periodSales.length === 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("Tidak ada penjualan pada periode ini.", 14, y + 10);
      } else {
        const salesRows = periodSales.map((s, i) => [
          String(i + 1),
          `${s.tortoise_code || s.tortoise_name || "—"} (${s.tortoise_species || "—"})`,
          `${s.buyer_name || "—"}`,
          s.buyer_city || "—",
          fmt(s.price),
          fmt(s.hpp || 0),
          fmt((s.price || 0) - (s.hpp || 0)),
          `${s.price > 0 ? (((s.price - (s.hpp || 0)) / s.price) * 100).toFixed(0) : 0}%`,
        ]);
        y = drawTable(doc, ["No", "Kura (Kode/Species)", "Pembeli", "Kota", "Harga Jual", "HPP", "Laba", "Margin"], salesRows, y, [8, 40, 35, 22, 28, 22, 18, 13]);

        // Totals
        y += 4;
        doc.setFillColor(...GREEN_DARK);
        doc.rect(14, y, 182, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL", 16, y + 5.5);
        const totalRev = periodSales.reduce((s, x) => s + (x.price || 0), 0);
        const totalHpp = periodSales.reduce((s, x) => s + (x.hpp || 0), 0);
        const totalLabaS = totalRev - totalHpp;
        doc.text(fmt(totalRev), 14 + 8 + 40 + 35 + 22 + 2, y + 5.5);
        doc.text(fmt(totalHpp), 14 + 8 + 40 + 35 + 22 + 28 + 2, y + 5.5);
        doc.text(fmt(totalLabaS), 14 + 8 + 40 + 35 + 22 + 28 + 22 + 2, y + 5.5);
      }

      drawFooter(doc, settings, 2, TOTAL_PAGES);

      // ───────────────────────────────────────────
      // PAGE 3: RINCIAN PENGELUARAN
      // ───────────────────────────────────────────
      doc.addPage();
      drawHeader(doc, settings, periodLabel, 3, TOTAL_PAGES);
      y = 36;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREEN_DARK);
      doc.text("RINCIAN PENGELUARAN", 14, y);
      y += 8;

      const pengeluaran = periodTx.filter(t => t.type === "pengeluaran");
      if (pengeluaran.length === 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("Tidak ada pengeluaran pada periode ini.", 14, y + 10);
        y += 20;
      } else {
        // Per kategori
        const byCategory = {};
        pengeluaran.forEach(t => {
          byCategory[t.category || "lainnya"] = (byCategory[t.category || "lainnya"] || 0) + (t.amount || 0);
        });
        const catRows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => [
          cat.replace(/_/g, " ").toUpperCase(),
          fmt(amt),
          `${totalPengeluaran > 0 ? ((amt / totalPengeluaran) * 100).toFixed(1) : 0}%`,
        ]);
        catRows.push(["GRAND TOTAL", fmt(totalPengeluaran), "100%"]);
        y = drawTable(doc, ["Kategori", "Jumlah", "Persentase"], catRows, y, [100, 60, 22]);
        y += 6;

        // Tabel detail
        const expRows = pengeluaran.slice(0, 20).map(t => [
          t.date || "—",
          (t.description || "").slice(0, 40),
          (t.category || "lainnya").replace(/_/g, " "),
          fmt(t.amount),
        ]);
        if (y < 200) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...GREEN_DARK);
          doc.text("Detail Transaksi", 14, y);
          y += 6;
          y = drawTable(doc, ["Tanggal", "Keterangan", "Kategori", "Nominal"], expRows, y, [24, 80, 45, 33]);
        }

        // Pie chart
        if (y < 220) {
          y += 8;
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...GREEN_DARK);
          doc.text("Distribusi Pengeluaran", 14, y);
          const pieData = Object.entries(byCategory).map(([name, value]) => ({
            name: name.replace(/_/g, " "),
            value,
          }));
          drawPieChart(doc, pieData, 55, y + 30, 25);
        }
      }

      drawFooter(doc, settings, 3, TOTAL_PAGES);

      // ───────────────────────────────────────────
      // PAGE 4: KESEHATAN & TREATMENT
      // ───────────────────────────────────────────
      doc.addPage();
      drawHeader(doc, settings, periodLabel, 4, TOTAL_PAGES);
      y = 36;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREEN_DARK);
      doc.text("KESEHATAN & TREATMENT", 14, y);
      y += 8;

      const sickRecords = periodHealth.filter(h => h.type === "sakit");
      if (sickRecords.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(34, 139, 34);
        doc.text("✓ Tidak ada kasus penyakit pada periode ini.", 14, y + 8);
        y += 20;
      } else {
        const healthRows = sickRecords.slice(0, 20).map((h, i) => [
          String(i + 1),
          h.tortoise_name || "—",
          (h.diagnosis || []).join(", ").replace(/_/g, " ") || "—",
          h.severity || "—",
          h.type === "sakit" ? "Sakit" : "Sembuh",
        ]);
        y = drawTable(doc, ["No", "Nama Kura", "Diagnosis", "Keparahan", "Status"], healthRows, y, [10, 45, 70, 25, 22]);
        y += 6;
      }

      // Stok kritis
      const warehouseItems = await base44.entities.WarehouseItem.list("-name", 100);
      const criticalItems = warehouseItems.filter(i => i.current_stock <= (i.minimum_stock || 0));
      if (criticalItems.length > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...RED);
        doc.text("⚠ Stok Kritis / Habis", 14, y + 6);
        y += 10;
        const critRows = criticalItems.slice(0, 10).map(i => [
          i.name,
          String(i.current_stock),
          String(i.minimum_stock || 0),
          i.current_stock <= 0 ? "HABIS" : "KRITIS",
        ]);
        y = drawTable(doc, ["Nama Item", "Stok Saat Ini", "Stok Minimum", "Status"], critRows, y, [80, 35, 35, 32]);
      }

      drawFooter(doc, settings, 4, TOTAL_PAGES);

      // ───────────────────────────────────────────
      // PAGE 5: SDM
      // ───────────────────────────────────────────
      doc.addPage();
      drawHeader(doc, settings, periodLabel, 5, TOTAL_PAGES);
      y = 36;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREEN_DARK);
      doc.text("SDM — SUMBER DAYA MANUSIA", 14, y);
      y += 8;

      // Kehadiran per karyawan
      const employeeMap = {};
      periodAttendance.forEach(a => {
        if (!employeeMap[a.employee_email]) {
          employeeMap[a.employee_email] = { name: a.employee_name || a.employee_email, hadir: 0, total: 0 };
        }
        employeeMap[a.employee_email].total += 1;
        if (a.status === "hadir") employeeMap[a.employee_email].hadir += 1;
      });

      const attRows = Object.values(employeeMap).map(e => [
        e.name,
        String(e.hadir),
        String(e.total),
        `${e.total > 0 ? Math.round((e.hadir / e.total) * 100) : 0}%`,
      ]);
      if (attRows.length > 0) {
        y = drawTable(doc, ["Nama Karyawan", "Hadir", "Total Hari", "% Hadir"], attRows, y, [70, 30, 30, 52]);
        y += 6;
      } else {
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("Tidak ada data kehadiran pada periode ini.", 14, y);
        y += 12;
      }

      // Slip gaji
      const totalGaji = salarySlips.reduce((s, sl) => s + (sl.net_total || 0), 0);
      const slipRows = salarySlips.map(s => [
        s.employee_name || "—",
        s.employee_role || "—",
        fmt(s.base_salary || 0),
        fmt(s.net_total || 0),
        s.status || "—",
      ]);
      if (slipRows.length > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...GREEN_DARK);
        doc.text("Penggajian", 14, y + 6);
        y += 10;
        y = drawTable(doc, ["Nama", "Role", "Gaji Pokok", "Take Home Pay", "Status"], slipRows, y, [55, 30, 35, 40, 22]);
        y += 4;
        doc.setFillColor(...GREEN_DARK);
        doc.rect(14, y, 182, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL GAJI DIBAYARKAN: ${fmt(totalGaji)}`, 16, y + 5);
        y += 12;
      }

      // Kasbon aktif
      const activeKasbons = kasbons.filter(k => ["pending", "approved"].includes(k.status));
      if (activeKasbons.length > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...RED);
        doc.text("Kasbon Aktif", 14, y + 6);
        y += 10;
        const kRows = activeKasbons.slice(0, 5).map(k => [k.employee_name, fmt(k.amount), k.status]);
        y = drawTable(doc, ["Nama", "Jumlah", "Status"], kRows, y, [80, 70, 32]);
      }

      drawFooter(doc, settings, 5, TOTAL_PAGES);

      // ───────────────────────────────────────────
      // PAGE 6: BREEDING
      // ───────────────────────────────────────────
      doc.addPage();
      drawHeader(doc, settings, periodLabel, 6, TOTAL_PAGES);
      y = 36;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GREEN_DARK);
      doc.text("BREEDING & REPRODUKSI", 14, y);
      y += 8;

      // Semua batch aktif
      const breedingRows = activeBreedings.map((b, i) => {
        const totalEggs = b.egg_count || 0;
        const fertile = (b.egg_records || []).filter(e => e.status === "fertile").length;
        const infertil = (b.egg_records || []).filter(e => e.status === "infertil").length;
        const menetas = b.hatched_count || 0;
        const gagal = b.failed_count || 0;
        const daysSince = b.egg_laying_date ? Math.floor((new Date() - new Date(b.egg_laying_date)) / 86400000) : 0;
        const daysLeft = 105 - daysSince;
        return [
          `${b.female_name} × ${b.male_name}`,
          b.egg_laying_date || "—",
          String(totalEggs),
          String(fertile),
          String(infertil),
          String(menetas),
          daysLeft > 0 ? `${daysLeft}h lagi` : "Selesai",
        ];
      });

      if (breedingRows.length > 0) {
        y = drawTable(doc, ["Pasangan", "Tgl Bertelur", "Telur", "Fertile", "Infertil", "Menetas", "Countdown"], breedingRows, y, [50, 22, 14, 16, 16, 18, 22]);
        y += 6;
      } else {
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("Tidak ada batch breeding aktif.", 14, y);
        y += 12;
      }

      // Anakan baru bulan ini
      const newBabies = tortoises.filter(t =>
        t.source === "hasil_sendiri" &&
        (t.birth_date || "").startsWith(period)
      );
      if (newBabies.length > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...GREEN_DARK);
        doc.text(`Anakan Baru Lahir Bulan Ini (${newBabies.length} ekor)`, 14, y + 6);
        y += 10;
        const babyRows = newBabies.slice(0, 15).map(b => [
          b.code || "—",
          b.name || "—",
          b.birth_date || "—",
          b.enclosure || "—",
          b.gender === "jantan" ? "♂" : b.gender === "betina" ? "♀" : "?",
        ]);
        y = drawTable(doc, ["Kode", "Nama", "Tanggal Lahir", "Kandang", "Gender"], babyRows, y, [30, 40, 28, 60, 24]);
      }

      drawFooter(doc, settings, 6, TOTAL_PAGES);

      // Save
      doc.save(`Laporan_Bulanan_Duta_Tortoise_${period}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Gagal generate PDF. Silakan coba lagi.");
    }
    setGenerating(false);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
      >
        <FileText className="w-4 h-4" />
        Export Laporan PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-700" />
              Export Laporan Bulanan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium">Pilih Periode</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 space-y-1">
              <p className="font-semibold">📄 PDF 6 Halaman:</p>
              <p>1. Ringkasan Eksekutif</p>
              <p>2. Rincian Penjualan</p>
              <p>3. Rincian Pengeluaran + Pie Chart</p>
              <p>4. Kesehatan & Treatment</p>
              <p>5. SDM & Penggajian</p>
              <p>6. Breeding & Reproduksi</p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Batal</Button>
              <Button className="flex-1 gap-2 bg-green-700 hover:bg-green-800" onClick={generatePDF} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {generating ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}