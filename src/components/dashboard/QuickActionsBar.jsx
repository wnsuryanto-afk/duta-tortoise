import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Egg, Baby, Scale, ClipboardList } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function QuickActionsBar() {
  const navigate = useNavigate();
  const { role } = useCurrentUser();

  // Filter tombol berdasarkan role
  const actions = [
    {
      label: "Catat Penjualan",
      icon: Plus,
      onClick: () => navigate("/sales"),
      roles: ["owner", "admin", "manajer"],
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      label: "Catat Bertelur",
      icon: Egg,
      onClick: () => navigate("/breeding"),
      roles: ["keeper", "owner", "admin", "manajer"],
      color: "bg-amber-600 hover:bg-amber-700",
    },
    {
      label: "Catat Menetas",
      icon: Baby,
      onClick: () => navigate("/breeding"),
      roles: ["keeper", "owner", "admin", "manajer"],
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      label: "Timbang Kura-kura",
      icon: Scale,
      onClick: () => navigate("/tortoise"),
      roles: ["keeper", "owner", "admin", "manajer"],
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      label: "Tugas Saya",
      icon: ClipboardList,
      onClick: () => navigate("/hr"),
      roles: ["keeper", "owner", "admin", "manajer"],
      color: "bg-orange-600 hover:bg-orange-700",
    },
  ].filter(action => action.roles.includes(role));

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 py-3">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              onClick={action.onClick}
              className={`${action.color} text-white flex-shrink-0 gap-2 px-4 py-3 h-auto`}
            >
              <Icon className="w-5 h-5" />
              <span className="hidden sm:inline whitespace-nowrap">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}