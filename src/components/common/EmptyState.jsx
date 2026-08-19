import { Shell, Egg, Wallet, Users, Pill, Package, FileText, CheckSquare, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const emptyStateConfig = {
  tortoise: {
    icon: Shell,
    title: "Belum ada kura-kura terdaftar",
    description: "Mulai dengan menambahkan kura-kura pertamamu untuk mengelola inventaris peternakan.",
    buttonText: "+ Tambah Kura-kura",
    color: "text-green-600",
  },
  breeding: {
    icon: Egg,
    title: "Belum ada catatan breeding",
    description: "Catat breeding pertama untuk memulai tracking reproduksi kura-kura.",
    buttonText: "+ Catat Breeding",
    color: "text-blue-600",
  },
  sale: {
    icon: Wallet,
    title: "Belum ada transaksi penjualan",
    description: "Catat penjualan pertama untuk mulai tracking omzet dan profit.",
    buttonText: "+ Catat Penjualan",
    color: "text-amber-600",
  },
  health: {
    icon: Pill,
    title: "Belum ada catatan kesehatan",
    description: "Mulai tracking kesehatan kura-kura dengan catatan pemeriksaan pertama.",
    buttonText: "+ Catat Kesehatan",
    color: "text-red-600",
  },
  enclosure: {
    icon: Package,
    title: "Belum ada kandang",
    description: "Tambahkan kandang pertama untuk mengelola tempat tinggal kura-kura.",
    buttonText: "+ Tambah Kandang",
    color: "text-purple-600",
  },
  warehouse: {
    icon: Package,
    title: "Gudang masih kosong",
    description: "Tambahkan item pertama untuk mengelola stok obat, vitamin, dan peralatan.",
    buttonText: "+ Tambah Item",
    color: "text-orange-600",
  },
  employee: {
    icon: Users,
    title: "Belum ada karyawan",
    description: "Tambahkan karyawan pertama untuk mengelola tim peternakan.",
    buttonText: "+ Tambah Karyawan",
    color: "text-indigo-600",
  },
  sop: {
    icon: FileText,
    title: "Belum ada dokumen SOP",
    description: "Buat SOP pertama untuk standarisasi operasional peternakan.",
    buttonText: "+ Buat SOP",
    color: "text-cyan-600",
  },
  task: {
    icon: CheckSquare,
    title: "Belum ada task template",
    description: "Buat template task pertama untuk otomatisasi tugas harian.",
    buttonText: "+ Buat Template",
    color: "text-pink-600",
  },
  default: {
    icon: HelpCircle,
    title: "Belum ada data",
    description: "Mulai dengan menambahkan data pertama Anda.",
    buttonText: "+ Tambah Data",
    color: "text-gray-600",
  },
};

export default function EmptyState({ type = "default", onAction, customTitle, customDescription, customButtonText }) {
  const config = emptyStateConfig[type] || emptyStateConfig.default;
  const Icon = config.icon;

  return (
    <div className="text-center py-16 px-4 border-2 border-dashed rounded-xl bg-muted/30">
      <Icon className={`w-16 h-16 mx-auto mb-4 opacity-30 ${config.color}`} />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {customTitle || config.title}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {customDescription || config.description}
      </p>
      {onAction && (
        <Button onClick={onAction} className="gap-2">
          {customButtonText || config.buttonText}
        </Button>
      )}
    </div>
  );
}