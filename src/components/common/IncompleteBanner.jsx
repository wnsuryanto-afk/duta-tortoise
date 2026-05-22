import { AlertTriangle } from "lucide-react";

/**
 * Banner kuning di atas form edit untuk reminder field kosong
 * @param {string[]} missingFields
 */
export default function IncompleteBanner({ missingFields = [] }) {
  if (!missingFields || missingFields.length === 0) return null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-800">Data ini belum lengkap</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Lengkapi field berikut:{" "}
          <span className="font-medium">{missingFields.join(", ")}</span>
        </p>
      </div>
    </div>
  );
}