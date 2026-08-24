/**
 * DiseaseClusterWarningCard — kartu peringatan kluster penyakit di dashboard.
 * Hanya untuk owner, manajer, admin. Membaca HealthRecord + Tortoise, lalu
 * mendeteksi kluster (3+ kura, diagnosis sama, dalam 3 hari).
 *
 * Penandaan "sudah ditinjau" disimpan di localStorage per-browser (tidak menambah
 * entity, tidak mengubah data tersimpan). Riwayat lengkap tetap ada di halaman
 * /riwayat-kluster.
 */
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { detectDiseaseClusters } from "@/lib/diseaseClusterUtils";
import DiseaseClusterCard from "@/components/health/DiseaseClusterCard";

const STORAGE_KEY = "dismissed_disease_clusters";

function loadDismissed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveDismissed(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
}

export default function DiseaseClusterWarningCard({ canDismiss = false, maxShow = 5 }) {
  const [dismissed, setDismissed] = useState(() => loadDismissed());
  useEffect(() => {
    saveDismissed(dismissed);
  }, [dismissed]);

  const { data: healthRecords = [] } = useQuery({
    queryKey: ["cluster-health-records"],
    queryFn: () => base44.entities.HealthRecord.list("-date", 1000),
    staleTime: 10 * 60 * 1000,
  });
  const { data: tortoises = [] } = useQuery({
    queryKey: ["cluster-tortoises"],
    queryFn: () => base44.entities.Tortoise.list("-name", 500),
    staleTime: 10 * 60 * 1000,
  });

  const clusters = useMemo(() => {
    const enclosureMap = {};
    tortoises.forEach((t) => {
      if (t.id) enclosureMap[t.id] = t.enclosure || "";
    });
    return detectDiseaseClusters(healthRecords, enclosureMap);
  }, [healthRecords, tortoises]);

  const visible = clusters.filter((c) => !dismissed.has(c.key)).slice(0, maxShow);

  if (visible.length === 0) return null;

  const dismiss = (key) =>
    setDismissed((p) => {
      const n = new Set(p);
      n.add(key);
      return n;
    });

  return (
    <div className="space-y-3">
      {visible.map((c) => (
        <DiseaseClusterCard
          key={c.key}
          cluster={c}
          onDismiss={canDismiss ? () => dismiss(c.key) : undefined}
        />
      ))}
      <Link
        to="/riwayat-kluster"
        className="text-xs text-primary hover:underline flex items-center gap-1 px-1"
      >
        Lihat riwayat kluster <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}