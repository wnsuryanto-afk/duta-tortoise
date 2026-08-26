import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Plus, Search, Pencil, Trash2, ChevronRight, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCurrentUser } from "@/lib/useCurrentUser";
import SOPDocumentForm from "@/components/sop/SOPDocumentForm";

const CATEGORIES = [
  { value: "perawatan_harian", label: "Perawatan Harian", color: "bg-green-100 text-green-800", icon: "🌿" },
  { value: "penanganan_sakit", label: "Penanganan Sakit", color: "bg-red-100 text-red-800", icon: "🏥" },
  { value: "breeding", label: "Breeding", color: "bg-pink-100 text-pink-800", icon: "🥚" },
  { value: "karantina", label: "Karantina", color: "bg-orange-100 text-orange-800", icon: "🔒" },
  { value: "penjualan", label: "Penjualan", color: "bg-blue-100 text-blue-800", icon: "💰" },
  { value: "administrasi", label: "Administrasi", color: "bg-purple-100 text-purple-800", icon: "📋" },
  { value: "lainnya", label: "Lainnya", color: "bg-gray-100 text-gray-800", icon: "📄" },
];

const getCat = v => CATEGORIES.find(c => c.value === v) || CATEGORIES[6];

export default function SOPLibraryPage() {
  const { role, user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("semua");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editDoc, setEditDoc] = useState(null);

  const canEdit = ["owner", "admin"].includes(role);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["sop-documents"],
    queryFn: () => base44.entities.SOPDocument.list("-last_updated"),
  });

  const filtered = docs.filter(d => d.is_active !== false).filter(d => {
    const matchSearch = !search || d.title?.toLowerCase().includes(search.toLowerCase()) || d.content?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "semua" || d.category === filterCat;
    return matchSearch && matchCat;
  });

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    docs: filtered.filter(d => d.category === cat.value),
  })).filter(cat => cat.docs.length > 0);

  const handleDelete = async (doc) => {
    if (!confirm(`Hapus SOP "${doc.title}"?`)) return;
    await base44.entities.SOPDocument.delete(doc.id);
    queryClient.invalidateQueries({ queryKey: ["sop-documents"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl"><BookOpen className="w-6 h-6 text-green-700" /></div>
          <div>
            <h1 className="text-2xl font-bold">Perpustakaan SOP</h1>
            <p className="text-sm text-muted-foreground">{docs.filter(d => d.is_active !== false).length} dokumen SOP aktif</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditDoc(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Tambah SOP
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari SOP..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kategori</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Tidak ada SOP ditemukan</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(cat => (
            <div key={cat.value}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{cat.icon}</span>
                <h2 className="font-semibold text-base">{cat.label}</h2>
                <span className="text-xs text-muted-foreground">({cat.docs.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.docs.map(doc => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setSelectedDoc(doc)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium text-sm truncate">{doc.title}</span>
                          </div>
                          {doc.version && <span className="text-xs text-muted-foreground">{doc.version}</span>}
                          {doc.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.content.replace(/[#*_]/g, "")}</p>}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 mt-3 pt-2 border-t opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={e => { e.stopPropagation(); setEditDoc(doc); setShowForm(true); }}>
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={e => { e.stopPropagation(); handleDelete(doc); }}>
                            <Trash2 className="w-3 h-3 mr-1" /> Hapus
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Read Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedDoc?.title}</span>
              {selectedDoc?.version && <Badge variant="outline" className="text-xs">{selectedDoc.version}</Badge>}
            </DialogTitle>
            {selectedDoc?.category && (
              <div className="flex items-center gap-2 pt-1">
                <Badge className={`${getCat(selectedDoc.category).color} border-0 text-xs`}>
                  {getCat(selectedDoc.category).icon} {getCat(selectedDoc.category).label}
                </Badge>
                {selectedDoc?.last_updated && <span className="text-xs text-muted-foreground">Diperbarui: {selectedDoc.last_updated}</span>}
              </div>
            )}
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            {selectedDoc?.content ? (
              <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">Tidak ada konten.</p>
            )}
          </div>
          {selectedDoc?.video_url && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Video Panduan:</p>
              <a href={selectedDoc.video_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline">{selectedDoc.video_url}</a>
            </div>
          )}
          {selectedDoc?.photo_urls?.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {selectedDoc.photo_urls.map((url, i) => <img key={i} src={url} alt={`foto-${i}`} className="rounded-lg w-full object-cover h-40" />)}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditDoc(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editDoc ? "Edit SOP" : "Tambah SOP Baru"}</DialogTitle></DialogHeader>
          <SOPDocumentForm
            data={editDoc}
            onSave={() => { queryClient.invalidateQueries({ queryKey: ["sop-documents"] }); setShowForm(false); setEditDoc(null); }}
            onClose={() => { setShowForm(false); setEditDoc(null); }}
            user={user}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}