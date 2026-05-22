import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Phone, MessageCircle, Edit, Trash2, Bell, CheckCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const STATUS_COLORS = {
  menunggu: "bg-blue-100 text-blue-700",
  ditawarkan: "bg-amber-100 text-amber-700",
  deal: "bg-green-100 text-green-700",
  batal: "bg-red-100 text-red-700",
};

const STATUS_LABELS = { menunggu: "Menunggu", ditawarkan: "Ditawarkan", deal: "Deal", batal: "Batal" };

function WaitingForm({ data, onClose, onSaved }) {
  const isEdit = !!data;
  const [form, setForm] = useState(data || {
    buyer_name: "", buyer_phone: "", buyer_whatsapp: "",
    request_date: new Date().toISOString().split("T")[0],
    desired_morph: "", desired_gender: "semua", max_budget: "",
    quantity: 1, status: "menunggu", notes: "", followed_up_date: ""
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const mutation = useMutation({
    mutationFn: () => isEdit
      ? base44.entities.WaitingList.update(data.id, form)
      : base44.entities.WaitingList.create(form),
    onSuccess: onSaved,
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit" : "Tambah"} Calon Pembeli</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Nama *", key: "buyer_name", colSpan: 2 },
            { label: "No. Telepon *", key: "buyer_phone", type: "tel" },
            { label: "WhatsApp", key: "buyer_whatsapp", type: "tel" },
            { label: "Tanggal Indent *", key: "request_date", type: "date" },
            { label: "Tanggal Follow Up", key: "followed_up_date", type: "date" },
            { label: "Morph Diinginkan", key: "desired_morph" },
            { label: "Budget Maks (Rp)", key: "max_budget", type: "number" },
            { label: "Jumlah", key: "quantity", type: "number" },
          ].map(f => (
            <div key={f.key} className={`space-y-1 ${f.colSpan === 2 ? "col-span-2" : ""}`}>
              <Label>{f.label}</Label>
              <Input type={f.type || "text"} value={form[f.key]} onChange={e=>set(f.key, f.type==="number"?(parseFloat(e.target.value)||""):e.target.value)} />
            </div>
          ))}
          <div className="space-y-1">
            <Label>Gender</Label>
            <Select value={form.desired_gender} onValueChange={v=>set("desired_gender",v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua</SelectItem>
                <SelectItem value="jantan">Jantan</SelectItem>
                <SelectItem value="betina">Betina</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v=>set("status",v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={()=>mutation.mutate()} disabled={!form.buyer_name||!form.buyer_phone||mutation.isPending}>
            {mutation.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WaitingListPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data: list = [] } = useQuery({
    queryKey: ["waiting-list"],
    queryFn: () => base44.entities.WaitingList.list("-request_date"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WaitingList.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["waiting-list"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WaitingList.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["waiting-list"] }); setDeleteTarget(null); },
  });

  const filtered = list.filter(item => {
    const matchStatus = filterStatus === "all" || item.status === filterStatus;
    const matchSearch = !search || item.buyer_name.toLowerCase().includes(search.toLowerCase()) || (item.buyer_phone||"").includes(search);
    return matchStatus && matchSearch;
  });

  const counts = { menunggu: 0, ditawarkan: 0, deal: 0, batal: 0 };
  list.forEach(i => { if (counts[i.status] !== undefined) counts[i.status]++; });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Waiting List</h1>
          <p className="text-sm text-muted-foreground">{list.filter(i=>i.status==="menunggu").length} calon pembeli menunggu</p>
        </div>
        <Button onClick={()=>{setEditing(null);setShowForm(true);}} className="bg-primary gap-2">
          <Plus className="w-4 h-4" /> Tambah
        </Button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Card key={key} className={`cursor-pointer transition-all ${filterStatus===key?"ring-2 ring-primary":""}`}
            onClick={()=>setFilterStatus(filterStatus===key?"all":key)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{counts[key]}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama / no. HP..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Tidak ada data</CardContent></Card>
        )}
        {filtered.map(item => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{item.buyer_name}</p>
                    <Badge className={`${STATUS_COLORS[item.status]} border-0 text-xs`}>{STATUS_LABELS[item.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{item.buyer_phone}</span>
                    {item.buyer_whatsapp && <a href={`https://wa.me/${item.buyer_whatsapp.replace(/\D/g,"")}`} target="_blank" className="flex items-center gap-1 text-green-600" onClick={e=>e.stopPropagation()}><MessageCircle className="w-3.5 h-3.5" />WA</a>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    {item.desired_morph && <span className="bg-muted px-2 py-0.5 rounded-full">{item.desired_morph}</span>}
                    {item.desired_gender && <span className="bg-muted px-2 py-0.5 rounded-full">{item.desired_gender}</span>}
                    {item.max_budget && <span className="bg-muted px-2 py-0.5 rounded-full">Budget: Rp {item.max_budget.toLocaleString("id-ID")}</span>}
                    {item.quantity > 1 && <span className="bg-muted px-2 py-0.5 rounded-full">x{item.quantity}</span>}
                  </div>
                  {item.request_date && <p className="text-xs text-muted-foreground mt-1">Indent: {format(new Date(item.request_date),"d MMM yyyy",{locale:id})}</p>}
                  {item.followed_up_date && <p className="text-xs text-muted-foreground">Follow up: {format(new Date(item.followed_up_date),"d MMM yyyy",{locale:id})}</p>}
                  {item.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{item.notes}"</p>}
                </div>
                <div className="flex flex-col gap-1">
                  {item.status === "menunggu" && (
                    <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 text-xs"
                      onClick={()=>updateMutation.mutate({id:item.id,data:{...item,status:"ditawarkan",followed_up_date:new Date().toISOString().split("T")[0]}})}>
                      <Bell className="w-3 h-3 mr-1" />Tawarkan
                    </Button>
                  )}
                  {item.status === "ditawarkan" && (
                    <Button size="sm" variant="outline" className="text-green-600 border-green-300 text-xs"
                      onClick={()=>updateMutation.mutate({id:item.id,data:{...item,status:"deal"}})}>
                      <CheckCircle className="w-3 h-3 mr-1" />Deal
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={()=>{setEditing(item);setShowForm(true);}}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={()=>setDeleteTarget(item)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && <WaitingForm data={editing} onClose={()=>setShowForm(false)} onSaved={()=>{setShowForm(false);qc.invalidateQueries({queryKey:["waiting-list"]});}} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={()=>setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus dari Waiting List?</AlertDialogTitle>
            <AlertDialogDescription>Data <b>{deleteTarget?.buyer_name}</b> akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={()=>deleteMutation.mutate(deleteTarget.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}