import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, ClipboardList, Filter } from "lucide-react";
import { getMissingFields } from "@/lib/incompleteChecks";
import { Link } from "react-router-dom";

function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 100;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{done} dari {total} data sudah lengkap</span>
        <span className={`font-semibold ${pct >= 80 ? "text-green-700" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DataTable({ items, entityType, editPath, nameField = "name", filterIncomplete, getEditUrl }) {
  const rows = items.map(item => ({
    ...item,
    missing: getMissingFields(entityType, item),
  }));

  const sorted = [...rows].sort((a, b) => b.missing.length - a.missing.length);
  const displayed = filterIncomplete ? sorted.filter(r => r.missing.length > 0) : sorted;
  const completeCount = rows.filter(r => r.missing.length === 0).length;

  return (
    <div className="space-y-3">
      <ProgressBar done={completeCount} total={rows.length} />
      {displayed.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-60" />
          <p className="font-medium">Semua data sudah lengkap! ✓</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(item => {
            const editUrl = getEditUrl ? getEditUrl(item) : editPath;
            return (
              <Link key={item.id} to={editUrl}>
                <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all hover:shadow-md cursor-pointer ${item.missing.length > 0 ? "bg-amber-50 border-amber-200 hover:border-amber-300" : "bg-green-50 border-green-200"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.missing.length > 0
                        ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        : <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      }
                      <span className="flex-1 min-w-0 font-medium truncate">{item[nameField] || item.title || item.buyer_name || item.tortoise_name || item.employee_name || "-"}</span>
                      {item.missing.length > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-300 border text-[10px] px-1.5">
                          {item.missing.length} field kosong
                        </Badge>
                      )}
                    </div>
                    {item.missing.length > 0 && (
                      <p className="text-xs text-amber-700 mt-1 ml-5">
                        {item.missing.join(" · ")}
                      </p>
                    )}
                  </div>
                  {item.missing.length > 0 && (
                    <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white shrink-0">
                      Lengkapi →
                    </Button>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function IncompleteDataPage() {
  const [filterIncomplete, setFilterIncomplete] = useState(true);

  const { data: tortoises = [] } = useQuery({ queryKey: ["tortoises"], queryFn: () => base44.entities.Tortoise.list("-created_date", 300) });
  const { data: breedings = [] } = useQuery({ queryKey: ["breedings-planner"], queryFn: () => base44.entities.Breeding.list("-created_date", 200) });
  const { data: sales = [] } = useQuery({ queryKey: ["sales"], queryFn: () => base44.entities.Sale.list("-sale_date", 200) });
  const { data: profiles = [] } = useQuery({ queryKey: ["user-profiles-all"], queryFn: () => base44.entities.UserProfile.list() });
  const { data: warehouseItems = [] } = useQuery({ queryKey: ["warehouse-items"], queryFn: () => base44.entities.WarehouseItem.list() });
  const { data: feedStocks = [] } = useQuery({ queryKey: ["feed-stocks"], queryFn: () => base44.entities.FeedStock.list() });
  const { data: buyers = [] } = useQuery({ queryKey: ["buyer-profiles"], queryFn: () => base44.entities.BuyerProfile.list() });
  const { data: enclosures = [] } = useQuery({ queryKey: ["enclosures"], queryFn: () => base44.entities.Enclosure.list() });
  const { data: kasbons = [] } = useQuery({ queryKey: ["kasbons"], queryFn: () => base44.entities.Kasbon.list() });

  const summary = useMemo(() => {
    const count = (items, type) => items.filter(i => getMissingFields(type, i).length > 0).length;
    return {
      kura: count(tortoises.filter(t => t.status === "aktif" || t.status === "baby"), "tortoise"),
      breeding: count(breedings, "breeding"),
      sale: count(sales, "sale"),
      karyawan: count(profiles, "userProfile"),
      gudang: count(warehouseItems, "warehouseItem") + count(feedStocks, "feedStock"),
      lainnya: count(buyers, "buyerProfile") + count(enclosures, "enclosure") + count(kasbons, "kasbon"),
    };
  }, [tortoises, breedings, sales, profiles, warehouseItems, feedStocks, buyers, enclosures, kasbons]);

  const totalIncomplete = Object.values(summary).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl">
            <ClipboardList className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">📋 Data Perlu Dilengkapi</h1>
            <p className="text-sm text-muted-foreground">
              {totalIncomplete > 0 ? `${totalIncomplete} data membutuhkan perhatian` : "Semua data sudah lengkap!"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setFilterIncomplete(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterIncomplete ? "bg-amber-500 text-white border-amber-500" : "bg-background border-border hover:bg-muted"}`}
        >
          <Filter className="w-3.5 h-3.5" />
          {filterIncomplete ? "Hanya belum lengkap" : "Tampilkan semua"}
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "🐢 Kura-kura", count: summary.kura },
          { label: "🥚 Breeding", count: summary.breeding },
          { label: "💰 Penjualan", count: summary.sale },
          { label: "👥 Karyawan", count: summary.karyawan },
          { label: "🏭 Gudang", count: summary.gudang },
          { label: "📦 Lainnya", count: summary.lainnya },
        ].map(s => (
          <span key={s.label} className={`px-3 py-1 rounded-full text-xs font-medium border ${s.count > 0 ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-green-100 text-green-700 border-green-300"}`}>
            {s.label}: {s.count > 0 ? `${s.count} belum lengkap` : "✓ Lengkap"}
          </span>
        ))}
      </div>

      <Tabs defaultValue="kura">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="kura" className="gap-1">
            Kura-kura
            {summary.kura > 0 && <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">{summary.kura}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="breeding" className="gap-1">
            Breeding
            {summary.breeding > 0 && <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">{summary.breeding}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sale" className="gap-1">
            Penjualan
            {summary.sale > 0 && <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">{summary.sale}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="karyawan" className="gap-1">
            Karyawan
            {summary.karyawan > 0 && <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">{summary.karyawan}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="gudang" className="gap-1">
            Gudang
            {summary.gudang > 0 && <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">{summary.gudang}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="lainnya" className="gap-1">
            Lainnya
            {summary.lainnya > 0 && <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">{summary.lainnya}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kura" className="mt-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">🐢 Kura-kura Aktif</CardTitle></CardHeader>
            <CardContent>
              <DataTable 
                items={tortoises.filter(t => t.status === "aktif" || t.status === "baby")} 
                entityType="tortoise" 
                editPath="/tortoise" 
                nameField="name" 
                filterIncomplete={filterIncomplete}
                getEditUrl={(item) => `/tortoise?edit=${item.id}`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breeding" className="mt-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">🥚 Breeding</CardTitle></CardHeader>
            <CardContent>
              <DataTable 
                items={breedings} 
                entityType="breeding" 
                editPath="/breeding" 
                nameField="female_name" 
                filterIncomplete={filterIncomplete}
                getEditUrl={(item) => `/breeding?edit=${item.id}`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sale" className="mt-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">💰 Penjualan</CardTitle></CardHeader>
            <CardContent>
              <DataTable 
                items={sales} 
                entityType="sale" 
                editPath="/sales" 
                nameField="tortoise_name" 
                filterIncomplete={filterIncomplete}
                getEditUrl={(item) => `/sales?edit=${item.id}`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="karyawan" className="mt-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">👥 Profil Karyawan</CardTitle></CardHeader>
            <CardContent>
              <DataTable 
                items={profiles} 
                entityType="userProfile" 
                editPath="/hr" 
                nameField="full_name" 
                filterIncomplete={filterIncomplete}
                getEditUrl={(item) => `/hr?edit=${item.id}`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gudang" className="mt-4 space-y-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">🏭 Barang Gudang</CardTitle></CardHeader>
            <CardContent>
              <DataTable 
                items={warehouseItems} 
                entityType="warehouseItem" 
                editPath="/warehouse" 
                nameField="name" 
                filterIncomplete={filterIncomplete}
                getEditUrl={(item) => `/warehouse?edit=${item.id}`}
              />
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">🌿 Stok Pakan</CardTitle></CardHeader>
            <CardContent>
              <DataTable 
                items={feedStocks} 
                entityType="feedStock" 
                editPath="/feed-stock" 
                nameField="name" 
                filterIncomplete={filterIncomplete}
                getEditUrl={(item) => `/feed-stock?edit=${item.id}`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lainnya" className="mt-4 space-y-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">👤 Profil Pembeli (CRM)</CardTitle></CardHeader>
            <CardContent>
              <DataTable 
                items={buyers} 
                entityType="buyerProfile" 
                editPath="/crm" 
                nameField="name" 
                filterIncomplete={filterIncomplete}
                getEditUrl={(item) => `/crm?edit=${item.id}`}
              />
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">🏠 Kandang</CardTitle></CardHeader>
            <CardContent>
              <DataTable 
                items={enclosures} 
                entityType="enclosure" 
                editPath="/enclosure" 
                nameField="name" 
                filterIncomplete={filterIncomplete}
                getEditUrl={(item) => `/enclosure?edit=${item.id}`}
              />
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">💵 Kasbon</CardTitle></CardHeader>
            <CardContent>
              <DataTable 
                items={kasbons} 
                entityType="kasbon" 
                editPath="/payroll-gaji" 
                nameField="employee_name" 
                filterIncomplete={filterIncomplete}
                getEditUrl={(item) => `/payroll-gaji?edit=${item.id}`}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}