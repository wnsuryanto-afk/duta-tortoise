import { AlertTriangle, Wifi, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const errorConfig = {
  network: {
    icon: Wifi,
    title: "Koneksi Internet Bermasalah",
    message: "Periksa koneksi internet Anda dan coba lagi.",
    action: "Coba Lagi",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  save: {
    icon: AlertCircle,
    title: "Gagal Menyimpan",
    message: "Mohon periksa data yang dimasukkan dan coba lagi.",
    action: "Coba Lagi",
    color: "text-red-600 bg-red-50 border-red-200",
  },
  permission: {
    icon: Lock,
    title: "Akses Ditolak",
    message: "Anda tidak memiliki izin untuk melakukan aksi ini.",
    action: null,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  generic: {
    icon: AlertTriangle,
    title: "Terjadi Kesalahan",
    message: "Tim kami akan memeriksa masalah ini. Silakan coba lagi nanti.",
    action: "Coba Lagi",
    color: "text-red-600 bg-red-50 border-red-200",
  },
};

export default function ErrorBanner({ error, onRetry, errorType = "generic" }) {
  if (!error) return null;

  const config = errorConfig[errorType] || errorConfig.generic;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${config.color}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="font-semibold text-sm">{config.title}</h3>
        <p className="text-sm mt-1 opacity-90">{config.message}</p>
        {error && typeof error === 'string' && (
          <p className="text-xs mt-2 font-mono opacity-75 break-all">{error}</p>
        )}
        {onRetry && config.action && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="mt-3"
          >
            {config.action}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Get error type from error message/code
 * @param {Error|string} error - Error object or message
 * @returns {string} Error type key
 */
export function getErrorType(error) {
  if (!error) return "generic";
  const msg = typeof error === 'string' ? error.toLowerCase() : error.message?.toLowerCase() || "";
  
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) {
    return "network";
  }
  if (msg.includes("permission") || msg.includes("forbidden") || msg.includes("unauthorized")) {
    return "permission";
  }
  if (msg.includes("save") || msg.includes("create") || msg.includes("update")) {
    return "save";
  }
  return "generic";
}