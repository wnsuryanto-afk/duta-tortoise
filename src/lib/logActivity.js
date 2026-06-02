import { base44 } from "@/api/base44Client";

const SKIP_FIELDS = ["updated_date", "created_date", "created_by_id", "id", "is_sample"];

// Label ramah per entity type
const FIELD_LABELS = {
  Tortoise: {
    name: "Nama", status: "Status", weight_grams: "Berat (gram)",
    shell_length_cm: "Panjang Cangkang (cm)", enclosure: "Kandang",
    gender: "Jenis Kelamin", morph: "Morph", is_currently_sick: "Status Sakit",
    in_quarantine: "Karantina", notes: "Catatan", purchase_price: "Harga Beli",
    birth_date: "Tanggal Lahir", age_category: "Kategori Umur", species: "Spesies",
    source: "Asal", last_weighed_date: "Terakhir Ditimbang", shell_type: "Tipe Cangkang",
    quarantine_reason: "Alasan Karantina", quarantine_notes: "Catatan Karantina",
    is_proven: "Proven Breeder", proven_year: "Tahun Proven", microchip_id: "Microchip ID",
  },
  HealthRecord: {
    type: "Jenis", diagnosis: "Diagnosis", treatment: "Tindakan",
    biaya_obat: "Biaya Obat", severity: "Keparahan", follow_up_date: "Tgl Follow-up",
    description: "Deskripsi", vet_name: "Nama Dokter", tortoise_name: "Nama Tortoise",
    date: "Tanggal", diagnosis_notes: "Catatan Diagnosis",
  },
  DailyChecklist: {
    status: "Status", approved_points: "Poin Disetujui",
    rejection_reason: "Alasan Ditolak", total_poin: "Total Poin",
  },
  Attendance: {
    check_in: "Check In", check_out: "Check Out",
    overtime_hours: "Jam Lembur", status: "Status", late_minutes: "Menit Terlambat",
    notes: "Catatan",
  },
  SalarySlip: {
    status: "Status Slip", net_total: "Total Gaji", kpi_bonus: "Bonus Poin",
    paid_date: "Tgl Dibayar", base_salary: "Gaji Pokok", overtime_pay: "Uang Lembur",
    absent_deduction: "Potongan Absen", kasbon_deduction: "Potongan Kasbon",
  },
  Sale: {
    price: "Harga", payment_status: "Status Pembayaran", buyer_name: "Nama Pembeli",
    buyer_phone: "No HP Pembeli", shipping_method: "Metode Kirim",
    after_sale_status: "Feedback Pembeli",
  },
  Breeding: {
    status: "Status Breeding", egg_count: "Jumlah Telur", hatched_count: "Jumlah Menetas",
    failed_count: "Gagal Menetas", hatch_date: "Tgl Menetas",
    incubation_temp: "Suhu Inkubasi", incubation_humidity: "Kelembaban Inkubasi",
  },
  WarehouseItem: {
    current_stock: "Stok Saat Ini", purchase_price: "Harga Beli",
    minimum_stock: "Stok Minimum", location: "Lokasi", expired_date: "Tgl Kadaluarsa",
    notes: "Catatan",
  },
  FeedStock: {
    current_stock: "Stok Saat Ini", price_per_unit: "Harga Per Satuan",
    minimum_stock: "Stok Minimum", last_restocked_date: "Tgl Restok Terakhir",
  },
  Kasbon: {
    amount: "Jumlah", status: "Status Kasbon", repaid_amount: "Jumlah Dikembalikan",
    notes: "Catatan",
  },
  Enclosure: {
    name: "Nama Kandang", type: "Tipe", max_capacity: "Kapasitas Maks",
    current_count: "Isi Saat Ini", is_active: "Status Aktif", notes: "Catatan",
  },
};

function getLabel(entityType, field) {
  return FIELD_LABELS[entityType]?.[field] || field;
}

function formatValue(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
  return String(v);
}

/**
 * Bandingkan before & after, kembalikan array changes_detail + changes_summary
 */
export function buildChanges(entityType, before, after) {
  if (!before || !after) return { changes_detail: [], changes_summary: "" };

  const detail = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (SKIP_FIELDS.includes(key)) continue;

    const oldVal = before[key];
    const newVal = after[key];

    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    const label = getLabel(entityType, key);
    const old_value = formatValue(oldVal);
    const new_value = formatValue(newVal);

    detail.push({ field: key, label, old_value, new_value });
  }

  const summary = detail.length > 0
    ? "Diubah: " + detail.map(d => `${d.label} (${d.old_value}→${d.new_value})`).join(", ")
    : "";

  return { changes_detail: detail, changes_summary: summary };
}

// Dedup cache sederhana: key = entity_id+action, value = timestamp terakhir
const _recentLogs = new Map();

function isDuplicate(entity_id, action) {
  const key = `${entity_id}__${action}`;
  const last = _recentLogs.get(key);
  const now = Date.now();
  if (last && now - last < 5000) return true;
  _recentLogs.set(key, now);
  return false;
}

/**
 * Log aktivitas user ke entity ActivityLog
 * 
 * Untuk aksi non-update, bisa langsung kirim changes_detail manual:
 * logActivity({ action: "approve", ..., changes_detail: [...], changes_summary: "..." })
 */
export async function logActivity({ action, entity_type, entity_id, entity_name, before, after, notes, changes_detail: manualDetail, changes_summary: manualSummary }) {
  try {
    if (entity_id && isDuplicate(entity_id, action)) return;

    const user = await base44.auth.me();
    if (!user) return;

    let changes_detail = manualDetail || [];
    let changes_summary = manualSummary || "";

    if (action === "update" && before && after && !manualDetail) {
      const result = buildChanges(entity_type, before, after);
      changes_detail = result.changes_detail;
      changes_summary = result.changes_summary;

      // Jika tidak ada perubahan nyata, tidak perlu log
      if (changes_detail.length === 0) return;
    }

    await base44.entities.ActivityLog.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      action,
      entity_type,
      entity_id: entity_id || "",
      entity_name: entity_name || "",
      changes_detail,
      changes_summary,
      timestamp: new Date().toISOString(),
      notes: notes || "",
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}