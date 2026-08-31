import { createContext, useContext, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const TourContext = createContext(null);

export const TOUR_STEPS = [
  {
    step: 1,
    title: "Dashboard Utama",
    description: "Ini dashboard utamamu. Semua ringkasan data peternakan ada di sini — mulai dari jumlah tortoise aktif, telur, hingga laporan keuangan.",
    path: "/",
    targetId: "tour-dashboard",
  },
  {
    step: 2,
    title: "Tortoise & Kandang",
    description: "Daftarkan semua kura-kuramu di sini beserta kandangnya. Lengkapi data morph, berat, foto, dan status setiap individu.",
    path: "/tortoise",
    targetId: "tour-tortoise",
  },
  {
    step: 3,
    title: "Breeding & Telur",
    description: "Catat proses breeding dan pantau telur hingga menetas. Atur pasangan indukan dan rekam progres inkubasi secara detail.",
    path: "/breeding",
    targetId: "tour-breeding",
  },
  {
    step: 4,
    title: "Treatment & Perawatan",
    description: "Jadwalkan dan catat perawatan rutin kura-kuramu. Atur pengingat agar tidak ada treatment yang terlewat.",
    path: "/treatment",
    targetId: "tour-treatment",
  },
  {
    step: 5,
    title: "Gudang Gazebo",
    description: "Kelola stok pakan, obat, dan perlengkapan di sini. Pantau stok minimum dan terima notifikasi saat stok menipis.",
    path: "/stok-unified",
    targetId: "tour-warehouse",
  },
  {
    step: 6,
    title: "Penjualan & CRM",
    description: "Catat setiap transaksi penjualan dan kelola data pembeli. Lacak pembeli setia dan analisis performa penjualan.",
    path: "/sales",
    targetId: "tour-sales",
  },
  {
    step: 7,
    title: "Manajemen SDM",
    description: "Kelola absensi, gaji, kasbon, dan kinerja karyawan dari satu tempat. Pantau produktivitas tim secara real-time.",
    path: "/hr",
    targetId: "tour-hr",
  },
  {
    step: 8,
    title: "Notifikasi",
    description: "Aktifkan dan kelola notifikasi agar tidak ada yang terlewat — dari pengingat telur menetas hingga stok pakan habis.",
    path: "/notifications",
    targetId: "tour-notifications",
  },
  {
    step: 9,
    title: "Kamu Siap! 🎉",
    description: "Selamat! Kamu sudah mengenal semua fitur utama Duta Tortoise. Mulailah dengan menambahkan kura-kura pertamamu sekarang.",
    path: "/tortoise",
    targetId: null,
    isFinal: true,
  },
];

// Key localStorage per-user agar tidak clash antar akun
function tourKey(email) {
  return `tour_done_${email || "guest"}`;
}

// Cek apakah tutorial sudah selesai (localStorage per-user)
export function isTutorialCompleted(email) {
  return localStorage.getItem(tourKey(email)) === "true";
}

// Simpan flag tutorial selesai ke localStorage (per-user)
export function markTutorialCompletedLocally(email) {
  localStorage.setItem(tourKey(email), "true");
  // backward compat
  localStorage.setItem("tutorial_completed", "true");
}

// Simpan flag tutorial selesai ke DB (UserProfile)
export async function markTutorialCompletedInDB(userEmail) {
  if (!userEmail) return;
  try {
    const profiles = await base44.entities.UserProfile.filter({ user_email: userEmail });
    if (profiles.length > 0) {
      await base44.entities.UserProfile.update(profiles[0].id, { tutorial_completed: true, tour_completed: true });
    }
  } catch (_) {}
}

// Reset tutorial (dari Help Center) — per-user
export function resetTutorialLocally(email) {
  localStorage.removeItem(tourKey(email));
  localStorage.removeItem("tutorial_completed");
}

export function TourProvider({ children }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    setShowWelcome(false);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // endTour: simpan flag completed ke localStorage (per-user) + DB
  const endTour = useCallback(async (userEmail) => {
    setIsActive(false);
    setCurrentStep(0);
    markTutorialCompletedLocally(userEmail);
    if (userEmail) {
      markTutorialCompletedInDB(userEmail);
    }
  }, []);

  const triggerWelcome = useCallback(() => {
    setShowWelcome(true);
  }, []);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
  }, []);

  return (
    <TourContext.Provider value={{
      isActive, currentStep, showWelcome,
      startTour, nextStep, prevStep, endTour,
      triggerWelcome, dismissWelcome,
      totalSteps: TOUR_STEPS.length,
      currentStepData: TOUR_STEPS[currentStep],
    }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  return useContext(TourContext);
}