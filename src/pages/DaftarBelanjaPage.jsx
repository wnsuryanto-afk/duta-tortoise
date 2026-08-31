/**
 * DaftarBelanjaPage — halaman Owner/Admin/Manajer.
 * Kumpulan semua barang "belum tersedia" dari tugas insidentil yang menunggu.
 * Admin tandai "Sudah dibeli/tersedia" → auto-update status tugas + notifikasi karyawan.
 * Pengingat: catat pembelian keuangannya di Kas Kecil / Biaya Operasional.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { canAccess } from "@/lib/permissions";
import AccessDenied from "@/components/common/AccessDenied";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Check, Package, ArrowRight, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function DaftarBelanjaPage() {
  const { role } = useCurrentUser();
  const qc = useQueryClient();
  const [marking, setMarking] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["incidental-tasks-shopping"],
    queryFn: () => base44.entities.IncidentalTask.filter({ status: "pending" }, "-due_date", 300),
  });

  if (!canAccess(role, "daftar-belanja")) return <AccessDenied />;

  // Flatten semua barang belum tersedia dari tugas-tugas pending
  const shoppingItems = [];
  tasks.forEach((t) => {
    (t.required_items || []).forEach((item, idx) => {
      if (!item.is_available) {
        shoppingItems.push({ ...item, task: t, itemIndex: idx, key: `${t.id}_${idx}` });
      }
    });
  });

  const handleMark = async (task, itemIndex) => {
    const key = `${task.id}_${itemIndex}`;
    setMarking(key);
    try {
      const res = await base44.functions.invoke("markTaskItemAvailable", {
        task_id: task.id,
        item_index: itemIndex,
      });
      toast.success(
        res.data?.notified
          ? "Barang ditandai tersedia & karyawan diberi tahu"
          : "Barang ditandai tersedia"
      );
      qc.invalidateQueries({ queryKey: ["incidental-tasks-shopping"] });
      qc.invalidateQueries({ queryKey: ["incidental-tasks-all"] });
      qc.invalidateQueries({ queryKey: ["incidental-tasks-mine"] });
    } catch (e) {
      toast.error("Gagal: " + (e.message || e));
    }
    setMarking(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
          <ShoppingCart className="w-7 h-7 text-blue-500" /> Daftar Belanja
        </h1>
        <p className="text-muted-foreground mt-1">
          Barang yang dibutuhkan tugas insidentil tapi belum tersedia. Tandai sudah dibeli agar tugas
          siap dikerjakan.
        </p>
      </div>

      {/* Reminder Kas Kecil */}
      <Card className="p-3.5 border-blue-200 bg-blue-50/50 flex items-center gap-3">
        <Wallet className="w-5 h-5 text-blue-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-800">Catat pembelian keuangannya</p>
          <p className="text-xs text-blue-600">
            Pembelian barang tetap dicatat lewat Kas Kecil atau Biaya Operasional seperti biasa.
          </p>
        </div>
        <Link to="/petty-cash">
          <Button variant="outline" size="sm" className="gap-1 text-blue-600 border-blue-300">
            Kas Kecil <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{shoppingItems.length}</p>
          <p className="text-xs text-muted-foreground">Barang Belum Tersedia</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">
            {new Set(shoppingItems.map((i) => i.task.id)).size}
          </p>
          <p className="text-xs text-muted-foreground">Tugas Menunggu</p>
        </Card>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
      ) : shoppingItems.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="font-semibold">Tidak ada barang perlu dibeli</p>
          <p className="text-sm mt-1">Semua tugas insidentil sudah siap dikerjakan.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {shoppingItems.map((item) => (
            <Card key={item.key} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base">🛒</span>
                    <p className="font-semibold text-sm">{item.nama_barang || "(nama belum diisi)"}</p>
                    <Badge variant="outline" className="text-[11px] text-blue-600">
                      {item.quantity} {item.unit || ""}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                    <span>
                      Untuk: <strong className="text-foreground">{item.task.title}</strong>
                    </span>
                    {item.task.assigned_to_name && (
                      <span>· Ditugaskan: {item.task.assigned_to_name}</span>
                    )}
                    <span>
                      · Sejak:{" "}
                      {item.task.created_date
                        ? format(new Date(item.task.created_date), "d MMM yyyy", { locale: id })
                        : "-"}
                    </span>
                  </div>
                  {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMark(item.task, item.itemIndex)}
                  disabled={marking === item.key}
                  className="text-green-600 border-green-200 hover:bg-green-50 gap-1.5 flex-shrink-0"
                >
                  {marking === item.key ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Sudah Tersedia
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}