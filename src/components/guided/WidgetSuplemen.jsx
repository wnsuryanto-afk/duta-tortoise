/**
 * WidgetSuplemen — pemberian suplemen harian di layar Guided.
 *
 * Dipisahkan dari GuidedHariIni.jsx: widget ini punya state dan query
 * sendiri dan tidak berbagi apa pun dengan widget lain selain propsnya.
 */
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function WidgetSuplemen({ items, user, today, qc, flashPoin }) {
  const [done, setDone] = useState(new Set());
  const [saved, setSaved] = useState(new Set());
  const [skipped, setSkipped] = useState(new Set());
  const [processingId, setProcessingId] = useState(null);

  // Restore state dari log yang sudah tersimpan hari ini (anti duplikat & tampil benar)
  const { data: suplemenLogs = [] } = useQuery({
    queryKey: ["suplemen-logs-today", user?.email, today],
    queryFn: () => base44.entities.MaintenanceLog.filter({ done_by_email: user.email, period_key: today, enclosure_id: "suplemen" }),
    enabled: !!user?.email,
    staleTime: 60 * 1000,
  });

  // Stok gudang untuk cek ketersediaan suplemen/obat/vitamin
  const { data: warehouseItems = [] } = useQuery({
    queryKey: ["warehouse-items-suplemen-check"],
    queryFn: () => base44.entities.WarehouseItem.filter({ is_active: true }, "name", 200),
    staleTime: 60 * 1000,
  });
  const stockMap = useMemo(() => {
    const m = {};
    warehouseItems.forEach(w => { if (w.sku) m[w.sku.trim().toLowerCase()] = w.current_stock || 0; });
    return m;
  }, [warehouseItems]);

  const getStockInfo = (item) => {
    const sku = (item.related_sku || "").trim().toLowerCase();
    if (!sku) return { available: true, stock: null };
    const stock = stockMap[sku];
    return { available: stock !== undefined && stock > 0, stock: stock ?? null };
  };

  useEffect(() => {
    if (suplemenLogs.length > 0) {
      const doneIds = new Set();
      const skipIds = new Set();
      suplemenLogs.forEach(l => {
        if (!l.item_id) return;
        if ((l.notes || "").includes("Dilewati - stok kosong")) skipIds.add(l.item_id);
        else doneIds.add(l.item_id);
      });
      setDone(doneIds);
      setSaved(doneIds);
      setSkipped(skipIds);
    }
  }, [suplemenLogs.length]);

  const handleSkip = async (item) => {
    if (saved.has(item.id) || skipped.has(item.id) || processingId) return;
    setProcessingId(item.id);
    try {
      await base44.entities.MaintenanceLog.create({
        check_key: `${user.email}__harian__suplemen_${item.id}__${today}`,
        enclosure_id: "suplemen",
        enclosure_name: "Suplemen",
        freq: "harian",
        item_id: `suplemen_${item.id}`,
        item_label: item.title,
        period_key: today,
        is_done: true,
        done_at: format(new Date(), "HH:mm"),
        done_by: user.full_name || user.email,
        done_by_email: user.email,
        poin_earned: 0,
        notes: "⏭️ Dilewati - stok kosong",
      });
      setSkipped(p => { const n = new Set(p); n.add(item.id); return n; });
      qc.invalidateQueries({ queryKey: ["suplemen-logs-today"] });
    } catch {
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggle = async (item) => {
    if (saved.has(item.id) || processingId) return; // sudah tersimpan / sedang proses (anti double-tap)
    const nowVal = format(new Date(), "HH:mm");
    setDone(p => { const n = new Set(p); n.add(item.id); return n; });
    setProcessingId(item.id);
    try {
      await base44.entities.MaintenanceLog.create({
        check_key: `${user.email}__harian__suplemen_${item.id}__${today}`,
        enclosure_id: "suplemen",
        enclosure_name: "Suplemen",
        freq: "harian",
        item_id: `suplemen_${item.id}`,
        item_label: item.title,
        period_key: today,
        is_done: true,
        done_at: nowVal,
        done_by: user.full_name || user.email,
        done_by_email: user.email,
        poin_earned: 5,
      });
      setSaved(p => { const n = new Set(p); n.add(item.id); return n; });
      qc.invalidateQueries({ queryKey: ["maintenance-today"] });
      qc.invalidateQueries({ queryKey: ["suplemen-logs-today"] });
      flashPoin(item.title, 5);
    } catch {
      setSaved(p => { const n = new Set(p); n.add(item.id); return n; });
    } finally {
      setProcessingId(null);
    }
  };

  const allDone = items.length > 0 && items.every(i => done.has(i.id));

  return (
    <div className={`rounded-2xl border-2 shadow-sm transition-all ${allDone ? "border-green-300 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💊</span>
            <span className="font-semibold text-gray-800">Suplemen & Vitamin Hari Ini</span>
          </div>
          <span className="text-xs text-gray-500">{done.size}/{items.length}</span>
        </div>
        {allDone ? (
          <p className="text-sm font-semibold text-green-700">✓ Semua suplemen hari ini selesai</p>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const isDone = done.has(item.id);
              const isSkipped = skipped.has(item.id);
              const stockInfo = getStockInfo(item);
              const stockLow = !stockInfo.available;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    isDone ? "bg-green-50 border-green-400" : isSkipped ? "bg-gray-50 border-gray-300" : "bg-white border-gray-200 hover:border-yellow-400"
                  }`}
                >
                  <span className="text-xl flex-shrink-0">💊</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-gray-800 ${isSkipped ? "line-through text-gray-400" : ""}`}>{item.title}</p>
                    {stockLow && !isDone && !isSkipped && (
                      <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> ⚠️ Stok belum tersedia
                      </p>
                    )}
                    {isSkipped && (
                      <p className="text-[11px] text-gray-500 mt-0.5">⏭️ Dilewati - stok kosong</p>
                    )}
                  </div>
                  {isDone && <span className="text-xs text-green-600 font-bold flex-shrink-0">+5</span>}
                  {!isDone && !isSkipped && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {stockLow && (
                        <button
                          onClick={() => handleSkip(item)}
                          disabled={processingId === item.id}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                        >
                          Dilewati
                        </button>
                      )}
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={processingId === item.id}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          stockLow ? "border-gray-300" : "border-gray-300 hover:border-yellow-400"
                        } disabled:opacity-50`}
                        title={stockLow ? "Tetap centang dengan keterangan" : "Tandai selesai"}
                      />
                    </div>
                  )}
                  {(isDone || isSkipped) && (
                    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 bg-green-500 border-green-500">
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      {isSkipped && <span className="text-[10px] text-white">⏭</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
