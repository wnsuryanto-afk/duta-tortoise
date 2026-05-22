import { useState } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Badge oranye "Tidak Lengkap" dengan tooltip daftar field kosong
 * @param {string[]} missingFields - daftar label field yang kosong
 * @param {function} onEdit - callback saat badge diklik untuk edit
 */
export default function IncompleteBadge({ missingFields = [], onEdit }) {
  const [show, setShow] = useState(false);

  if (!missingFields || missingFields.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onEdit) {
            onEdit();
          } else {
            setShow(s => !s);
          }
        }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 transition-colors"
        title={`Field kosong: ${missingFields.join(", ")}`}
      >
        <AlertTriangle className="w-3 h-3" />
        Tidak Lengkap
      </button>

      {/* Tooltip */}
      {show && !onEdit && (
        <div className="absolute z-50 bottom-full left-0 mb-1 w-52 bg-white border border-amber-200 rounded-xl shadow-lg p-2.5 text-xs">
          <p className="font-semibold text-amber-800 mb-1.5">Field belum diisi:</p>
          <ul className="space-y-0.5">
            {missingFields.map(f => (
              <li key={f} className="flex items-center gap-1.5 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}