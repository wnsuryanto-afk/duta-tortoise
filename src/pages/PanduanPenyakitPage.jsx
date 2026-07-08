import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, BookOpen, AlertCircle } from "lucide-react";

export const CATEGORY_CONFIG = {
  infeksi_bakteri: { label: "Infeksi Bakteri", color: "bg-red-100 text-red-700 border-red-200" },
  infeksi_jamur:  { label: "Infeksi Jamur",   color: "bg-purple-100 text-purple-700 border-purple-200" },
  parasit:        { label: "Parasit",          color: "bg-orange-100 text-orange-700 border-orange-200" },
  nutrisi:        { label: "Nutrisi",          color: "bg-green-100 text-green-700 border-green-200" },
  reproduksi:     { label: "Reproduksi",       color: "bg-pink-100 text-pink-700 border-pink-200" },
  trauma:         { label: "Trauma",           color: "bg-amber-100 text-amber-700 border-amber-200" },
  organ:          { label: "Organ",            color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  pernapasan:     { label: "Pernapasan",       color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  pencernaan:     { label: "Pencernaan",       color: "bg-lime-100 text-lime-700 border-lime-200" },
  mata:           { label: "Mata",             color: "bg-blue-100 text-blue-700 border-blue-200" },
  kulit:          { label: "Kulit",            color: "bg-teal-100 text-teal-700 border-teal-200" },
  lainnya:        { label: "Lainnya",          color: "bg-gray-100 text-gray-700 border-gray-200" },
};

export const SEVERITY_CONFIG = {
  ringan:  { label: "Ringan",  color: "bg-green-100 text-green-700 border-green-300" },
  sedang:  { label: "Sedang",  color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  berat:   { label: "Berat",   color: "bg-orange-100 text-orange-700 border-orange-300" },
  kritis:  { label: "Kritis",  color: "bg-red-100 text-red-700 border-red-300" },
};

export default function PanduanPenyakitPage() {
  const navigate = useNavigate();
  const { role } = useCurrentUser();
  const canEdit = role === "owner";

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("semua");

  const { data: protocols = [], isLoading } = useQuery({
    queryKey: ["diagnosis-protocols-catalog"],
    queryFn: () => base44.entities.DiagnosisProtocol.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return protocols.filter(p => {
      const matchSearch = !q
        || p.diagnosis_name?.toLowerCase().includes(q)
        || p.diagnosis_name_en?.toLowerCase().includes(q)
        || (p.gejala_utama || []).some(g => g?.toLowerCase().includes(q));
      const matchCat = catFilter === "semua" || p.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [protocols, search, catFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Panduan Penyakit
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Katalog {protocols.length} penyakit kura-kura & panduan penanganan
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => navigate("/panduan-penyakit/new")} className="gap-2 bg-primary">
            <Plus className="w-4 h-4" /> Tambah Penyakit
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama penyakit atau gejala... (cth: shell rot)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kategori</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Tidak ada penyakit ditemukan</p>
          {search && <p className="text-sm mt-1">Coba kata kunci lain atau reset filter</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(p => {
            const cat = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.lainnya;
            const sev = SEVERITY_CONFIG[p.severity_default] || SEVERITY_CONFIG.ringan;
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/panduan-penyakit/${p.id}`)}
                className="text-left bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/40 transition-all overflow-hidden group"
              >
                <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center overflow-hidden">
                  {(() => {
                    const coverUrl = (p.images?.length > 0 && p.images[0]?.url) || p.image_url;
                    return coverUrl ? (
                      <img src={coverUrl} alt={p.diagnosis_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                    );
                  })()}
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="font-semibold text-sm leading-tight line-clamp-2">{p.diagnosis_name}</p>
                  {p.diagnosis_name_en && (
                    <p className="text-xs text-muted-foreground italic line-clamp-1">{p.diagnosis_name_en}</p>
                  )}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cat.color}`}>
                      {cat.label}
                    </span>
                    {p.severity_default && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${sev.color}`}>
                        {sev.label}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}