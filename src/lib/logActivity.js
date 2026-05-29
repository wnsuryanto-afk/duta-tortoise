import { base44 } from "@/api/base44Client";

const SKIP_FIELDS = ["updated_date", "created_date", "created_by_id", "id", "is_sample"];

// Label ramah per entity type
const FIELD_LABELS = {
  Tortoise: {
    name: "Nama", status: "Status", weight_grams: "Berat (gram)",
    shell_length_cm: "Panjang karapas (cm)", enclosure: "Kandang",
    gender: "Jenis kelamin", morph: "Morph", is_currently_sick: "Sedang sakit",
    in_quarantine: "Karantina", notes: "Catatan", purchase_price: "Harga beli",
    birth_date: "Tgl lahir", age_category: "Kategori umur", species: "Spesies",
    source: "Asal", last_weighed_date: "Terakhir ditimbang", shell_type: "Tipe cangkang",
    quarantine_reason: "Alasan karantina", quarantine_notes: "Catatan karantina",
    is_proven: "Sudah proven", proven_year: "Tahun proven", microchip_id: "Microchip ID",
  },
  HealthRecord: {
    type: "Jenis", diagnosis: "Diagnosis", treatment: "Tindakan",
    biaya_obat: "Biaya obat", severity: "Keparahan", follow_up_date: "Tgl follow-up",
    description: "Deskripsi", vet_name: "Nama dokter", tortoise_name: "Nama tortoise",
    date: "Tanggal", diagnosis_notes: "Catatan diagnosis",
  },
  DailyChecklist: {
    status: "Status", approved_points: "Poin disetujui",
    rejection_reason: "Alasan ditolak", total_poin: "Total poin",
    is_verified: "Terverifikasi",
  },
  Attendance: {
    check_in: "Jam masuk", check_out: "Jam keluar",
    overtime_hours: "Jam lembur", status: "Status", late_minutes: "Menit terlambat",
    notes: "Catatan",
  },
  SalarySlip: {
    status: "Status slip", net_total: "Total gaji", kpi_bonus: "Bonus poin",
    paid_date: "Tgl dibayar", base_salary: "Gaji pokok", overtime_pay: "Uang lembur",
    absent_deduction: "Potongan absen", kasbon_deduction: "Potongan kasbon",
  },
  Sale: {
    price: "Harga", payment_status: "Status pembayaran", buyer_name: "Nama pembeli",
    buyer_phone: "No HP pembeli", shipping_method: "Metode kirim",
    after_sale_status: "Feedback pembeli",
  },
  Breeding: {
    status: "Status", egg_count: "Jumlah telur", hatched_count: "Jumlah menetas",
    failed_count: "Gagal menetas", hatch_date: "Tgl menetas",
    incubation_temp: "Suhu inkubasi", incubation_humidity: "Kelembaban inkubasi",
  },
  WarehouseItem: {
    current_stock: "Stok saat ini", purchase_price: "Harga beli",
    minimum_stock: "Stok minimum", location: "Lokasi", expired_date: "Tgl kadaluarsa",
    notes: "Catatan",
  },
  FeedStock: {
    current_stock: "Stok saat ini", price_per_unit: "Harga per satuan",
    minimum_stock: "Stok minimum", last_restocked_date: "Tgl restok terakhir",
  },
  Kasbon: {
    amount: "Jumlah", status: "Status", repaid_amount: "Jumlah dikembalikan",
    notes: "Catatan",
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

    // Bandingkan nilai — skip jika sama
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

/**
 * Log aktivitas user ke entity ActivityLog
 */
export async function logActivity({ action, entity_type, entity_id, entity_name, before, after, notes }) {
  try {
    const user = await base44.auth.me();
    if (!user) return;

    let changes_detail = [];
    let changes_summary = "";

    if (action === "update" && before && after) {
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
      entity_id,
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