import { Badge } from "@/components/ui/badge";

const statusConfig = {
  aktif: { label: "Aktif", className: "bg-green-100 text-green-700 border-green-300" },
  baby: { label: "🐣 Baby", className: "bg-blue-100 text-blue-700 border-blue-300" },
  sakit: { label: "Sakit", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  breeding: { label: "Breeding", className: "bg-purple-100 text-purple-700 border-purple-300" },
  karantina: { label: "Karantina", className: "bg-orange-100 text-orange-700 border-orange-300" },
  mati: { label: "Mati", className: "bg-gray-800 text-white border-gray-700" },
  terjual: { label: "Terjual", className: "bg-gray-300 text-foreground border-border" },
  diarsipkan: { label: "Diarsipkan", className: "bg-muted text-muted-foreground border-border" },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.aktif;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}