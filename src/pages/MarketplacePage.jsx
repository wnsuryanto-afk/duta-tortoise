import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, CheckCircle2, XCircle, RefreshCw, Info, Package, ShoppingCart, Loader2 } from "lucide-react";
import AccessDenied from "@/components/common/AccessDenied";

const STATUS_COLOR = {
  baru: "bg-blue-100 text-blue-700",
  diproses: "bg-yellow-100 text-yellow-700",
  dikirim: "bg-purple-100 text-purple-700",
  selesai: "bg-green-100 text-green-700",
  dibatalkan: "bg-red-100 text-red-700",
};

function PlatformTab({ platform }) {
  const queryClient = useQueryClient();
  const { data: configs = [] } = useQuery({
    queryKey: ["marketplace-config", platform],
    queryFn: () => base44.entities.MarketplaceConfig.filter({ platform }),
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["marketplace-orders", platform],
    queryFn: () => base44.entities.MarketplaceOrder.filter({ platform }),
  });

  const config = configs[0] || null;
  const [form, setForm] = useState({ shop_name: config?.shop_name || "", shop_id: config?.shop_id || "", api_key: "", api_secret: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = { platform, shop_name: form.shop_name, shop_id: form.shop_id, is_connected: true };
    if (form.api_key) data.api_key = form.api_key;
    if (form.api_secret) data.api_secret = form.api_secret;
    if (config?.id) await base44.entities.MarketplaceConfig.update(config.id, data);
    else await base44.entities.MarketplaceConfig.create(data);
    queryClient.invalidateQueries({ queryKey: ["marketplace-config"] });
    setSaving(false);
  };

  const handleDisconnect = async () => {
    if (!config?.id) return;
    await base44.entities.MarketplaceConfig.update(config.id, { is_connected: false });
    queryClient.invalidateQueries({ queryKey: ["marketplace-config"] });
  };

  const isConnected = config?.is_connected;
  const platformName = platform === "tokopedia" ? "Tokopedia" : "Shopee";
  const platformColor = platform === "tokopedia" ? "text-green-700 bg-green-50" : "text-orange-700 bg-orange-50";

  return (
    <div className="space-y-6 mt-4">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Status Koneksi {platformName}</span>
            <Badge className={isConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
              {isConnected ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Terhubung</> : <><XCircle className="w-3.5 h-3.5 mr-1" />Belum Terhubung</>}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nama Toko</Label>
              <Input value={form.shop_name} onChange={e => set("shop_name", e.target.value)} placeholder={`Nama toko ${platformName}`} />
            </div>
            <div className="space-y-1.5">
              <Label>Shop ID</Label>
              <Input value={form.shop_id} onChange={e => set("shop_id", e.target.value)} placeholder="ID toko" />
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input type="password" value={form.api_key} onChange={e => set("api_key", e.target.value)} placeholder={config ? "••••••• (tersimpan)" : "Masukkan API Key"} />
            </div>
            <div className="space-y-1.5">
              <Label>API Secret</Label>
              <Input type="password" value={form.api_secret} onChange={e => set("api_secret", e.target.value)} placeholder={config ? "••••••• (tersimpan)" : "Masukkan API Secret"} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan & Hubungkan
            </Button>
            {isConnected && (
              <Button variant="outline" onClick={handleDisconnect}>Putuskan</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Panduan */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <div className="flex gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Cara Mendapatkan API Key {platformName}</p>
            {platform === "tokopedia" ? (
              <ol className="text-xs space-y-1 list-decimal pl-4">
                <li>Daftar di <strong>Tokopedia Seller API</strong> (seller.tokopedia.com)</li>
                <li>Masuk ke menu Developer → Buat Aplikasi Baru</li>
                <li>Salin Client ID (sebagai API Key) dan Client Secret</li>
                <li>Aktifkan permission: product.read, order.read, order.update</li>
              </ol>
            ) : (
              <ol className="text-xs space-y-1 list-decimal pl-4">
                <li>Daftar di <strong>Shopee Open Platform</strong> (open.shopee.com)</li>
                <li>Buat App baru → pilih kategori "Partner"</li>
                <li>Salin Partner ID (sebagai Shop ID) dan Partner Key (API Key)</li>
                <li>Tambahkan URL redirect & aktifkan scope: order, product</li>
              </ol>
            )}
          </div>
        </div>
      </div>

      {/* Orders */}
      {isConnected && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" /> Pesanan Terbaru
            </h3>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Tarik Pesanan
            </Button>
          </div>
          {orders.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-xl text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
              Belum ada pesanan dari {platformName}. Klik "Tarik Pesanan" untuk memperbarui.
            </div>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 20).map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-xl bg-card">
                  <div>
                    <p className="text-sm font-medium">{order.product_name}</p>
                    <p className="text-xs text-muted-foreground">{order.buyer_name} · {order.order_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">Rp {(order.total_price || 0).toLocaleString("id-ID")}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  const { role } = useCurrentUser();
  if (!["owner", "admin"].includes(role)) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <ShoppingBag className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold">Marketplace</h1>
          <p className="text-sm text-muted-foreground">Kelola toko Tokopedia & Shopee dari satu tempat</p>
        </div>
      </div>

      <Tabs defaultValue="tokopedia">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="tokopedia" className="flex-1 sm:flex-none">🟢 Tokopedia</TabsTrigger>
          <TabsTrigger value="shopee" className="flex-1 sm:flex-none">🟠 Shopee</TabsTrigger>
        </TabsList>
        <TabsContent value="tokopedia"><PlatformTab platform="tokopedia" /></TabsContent>
        <TabsContent value="shopee"><PlatformTab platform="shopee" /></TabsContent>
      </Tabs>
    </div>
  );
}