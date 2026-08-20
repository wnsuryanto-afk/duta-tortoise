import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

/**
 * dashboardQueries — definisi query bersama untuk semua dashboard.
 *
 * Masalah yang diselesaikan:
 *
 * 1. DUPLIKASI. OwnerDashboard, RingkasanPagi, dan AdminDashboard masing-masing
 *    menarik entitas yang sama dengan queryKey berbeda, sehingga satu layar
 *    memanggil server 33 kali dan menarik Tortoise/WarehouseItem/DailyChecklist
 *    dua kali. Dengan queryKey yang sama, React Query otomatis menyatukannya.
 *
 * 2. TABRAKAN KEY. `owner-sales` dipakai dua komponen dengan queryFn berbeda —
 *    satu mengurutkan `-date` (field yang TIDAK ADA di entitas Sale, hanya ada
 *    `sale_date`), satu lagi `-sale_date`. Mana yang menang tergantung komponen
 *    mana yang mount duluan, jadi angka penjualan bisa berbeda antar muat ulang.
 *
 * Aturan: satu entitas = satu definisi di sini. Jangan menulis useQuery mentah
 * untuk entitas yang sudah terdaftar di bawah.
 */

const FIVE_MIN = 5 * 60 * 1000;
const TEN_MIN = 10 * 60 * 1000;

const q = (key, fn, staleTime = FIVE_MIN) => ({
  queryKey: key,
  queryFn: fn,
  staleTime,
  refetchInterval: false,
});

export const today = () => format(new Date(), "yyyy-MM-dd");

// ── Data inti yang dipakai lebih dari satu dashboard ──
export const dashTortoises = () =>
  q(["dash-tortoises"], () => base44.entities.Tortoise.list("-created_date", 500), TEN_MIN);

export const dashWarehouse = () =>
  q(["dash-warehouse"], () => base44.entities.WarehouseItem.list("-name", 200), TEN_MIN);

export const dashFeedStocks = () =>
  q(["dash-feedstocks"], () => base44.entities.FeedStock.list("-name", 50), TEN_MIN);

export const dashFinances = () =>
  q(["dash-finances"], () => base44.entities.FinanceTransaction.list("-date", 300));

export const dashSales = () =>
  q(["dash-sales"], () => base44.entities.Sale.list("-sale_date", 100));

export const dashBreedings = () =>
  q(["dash-breedings"], () => base44.entities.Breeding.list("-created_date", 50));

export const dashHealth = () =>
  q(["dash-health"], () => base44.entities.HealthRecord.list("-date", 100));

export const dashEnclosures = () =>
  q(["dash-enclosures"], () => base44.entities.Enclosure.list(), TEN_MIN);

export const dashCompanySettings = () =>
  q(["company-settings"], () => base44.entities.CompanySettings.filter({ setting_key: "main" }), TEN_MIN);

// ── Data harian ──
export const dashChecklistsToday = () =>
  q(["dash-checklists-today", today()], () => base44.entities.DailyChecklist.filter({ date: today() }));

export const dashAttendanceToday = () =>
  q(["dash-attendance-today", today()], () => base44.entities.Attendance.filter({ date: today() }));

export const dashPendingApproval = () =>
  q(["dash-pending-approval"], () =>
    base44.entities.DailyChecklist.filter({ status: "submitted" }, "-date", 500)
  );
