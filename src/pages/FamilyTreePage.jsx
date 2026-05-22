import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shell, Search, GitBranch, ChevronDown, ChevronRight, Baby, AlertCircle } from "lucide-react";

const SOURCE_LABEL = {
  hasil_sendiri: { text: "🐣 CBB", title: "Captive Bred & Born", color: "bg-green-100 text-green-800 border-green-300" },
  import: { text: "📦 CB", title: "Captive Born (Import)", color: "bg-blue-100 text-blue-800 border-blue-300" },
  beli_lokal: { text: "🌍 WC", title: "Wild Caught / Lokal", color: "bg-amber-100 text-amber-800 border-amber-300" },
  tidak_diketahui: { text: "❓ Unknown", title: "Tidak Diketahui", color: "bg-gray-100 text-gray-700 border-gray-300" },
};

// Fungsi untuk cek apakah tortoise punya silsilah lengkap
function hasCompletePedigree(tortoise, tortoiseMap) {
  if (tortoise.source !== "hasil_sendiri") return false;
  if (!tortoise.parent_male || !tortoise.parent_female) return false;
  // Cek apakah parent ada di database (bukan hanya nama bebas)
  const father = tortoiseMap[tortoise.parent_male];
  const mother = tortoiseMap[tortoise.parent_female];
  return !!(father && mother);
}

// Fungsi untuk mendapatkan badge silsilah
function getPedigreeBadge(tortoise, tortoiseMap) {
  if (tortoise.source === "hasil_sendiri") {
    if (hasCompletePedigree(tortoise, tortoiseMap)) {
      return { text: "🐣 CBB", color: "bg-green-600 text-white border-green-700", title: "Captive Bred & Born - Silsilah Lengkap" };
    } else {
      return { text: "🌱 CB", color: "bg-yellow-500 text-white border-yellow-600", title: "Captive Born - Parent Tidak Lengkap" };
    }
  } else if (tortoise.source === "beli_lokal") {
    return { text: "🌍 WC", color: "bg-orange-500 text-white border-orange-600", title: "Wild Caught" };
  } else if (tortoise.source === "import") {
    return { text: "📦 Import", color: "bg-blue-500 text-white border-blue-600", title: "Import" };
  } else {
    return { text: "❓ Unknown", color: "bg-gray-400 text-white border-gray-500", title: "Asal Tidak Diketahui" };
  }
}

function SourceBadge({ source }) {
  const s = SOURCE_LABEL[source] || SOURCE_LABEL.tidak_diketahui;
  return (
    <span title={s.title} className={`text-[10px] px-1.5 py-0.5 rounded-md border font-bold ${s.color}`}>{s.text}</span>
  );
}

function PedigreeBadge({ tortoise, tortoiseMap }) {
  const badge = getPedigreeBadge(tortoise, tortoiseMap);
  return (
    <span title={badge.title} className={`text-[10px] px-2 py-1 rounded-full border font-bold ${badge.color}`}>
      {badge.text}
    </span>
  );
}

const UNKNOWN_NODE = {
  id: "__unknown__",
  name: "Tidak Diketahui",
  gender: "belum_diketahui",
  source: "tidak_diketahui",
};

const GENDER_COLOR = {
  jantan: "bg-blue-100 text-blue-700",
  betina: "bg-pink-100 text-pink-700",
  belum_diketahui: "bg-gray-100 text-gray-700",
};
const GENDER_LABEL = { jantan: "♂", betina: "♀", belum_diketahui: "?" };

const morphColors = {
  normal: "bg-muted text-muted-foreground",
  albino: "bg-pink-100 text-pink-700",
  ivory: "bg-yellow-100 text-yellow-700",
  caramel_albino: "bg-amber-100 text-amber-700",
  hypo: "bg-lime-100 text-lime-700",
  golden_greek: "bg-yellow-200 text-yellow-800",
  piebald: "bg-purple-100 text-purple-700",
  genetic_stripe: "bg-teal-100 text-teal-700",
  high_yellow: "bg-orange-100 text-orange-700",
  dark: "bg-slate-200 text-slate-700",
  paradox: "bg-indigo-100 text-indigo-700",
  anerythristic: "bg-gray-200 text-gray-700",
  axanthic: "bg-blue-100 text-blue-700",
  melanistic: "bg-gray-900 text-gray-100",
  mix: "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700",
  unknown: "bg-muted text-muted-foreground",
};

function TortoiseNode({ tortoise, tortoiseMap, depth = 0, maxDepth = 3, onSelect }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isUnknown = tortoise.id === "__unknown__";

  // Untuk hasil_sendiri: tunjukkan parent node (jika ada parent_id tapi tidak ada di map, tampilkan "Tidak Diketahui")
  const father = tortoise.parent_male
    ? (tortoiseMap[tortoise.parent_male] || { ...UNKNOWN_NODE, id: `__unk_male_${depth}` })
    : null;
  const mother = tortoise.parent_female
    ? (tortoiseMap[tortoise.parent_female] || { ...UNKNOWN_NODE, id: `__unk_female_${depth}` })
    : null;
  const hasParents = (father || mother) && !isUnknown;

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-dashed border-border pl-4" : ""}>
      <div className="flex items-start gap-2 py-1.5">
        {hasParents && depth < maxDepth ? (
          <button className="mt-2 text-muted-foreground hover:text-foreground" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-4 mt-2 inline-block" />
        )}
        <div
          className={`flex items-center gap-2 p-2 rounded-lg border transition-shadow ${
            isUnknown
              ? "bg-gray-50 border-gray-200 opacity-70"
              : "bg-card hover:shadow-sm cursor-pointer"
          }`}
          onClick={() => !isUnknown && onSelect && onSelect(tortoise.id)}
        >
          {!isUnknown && tortoise.photo_url ? (
            <img src={tortoise.photo_url} alt={tortoise.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border" />
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isUnknown ? "bg-gray-100" : "bg-primary/10"}`}>
              <Shell className={`w-5 h-5 ${isUnknown ? "text-gray-400" : "text-primary"}`} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm">{tortoise.name}</span>
              <span className={`text-[10px] px-1.5 py-0 rounded-md ${GENDER_COLOR[tortoise.gender] || GENDER_COLOR.belum_diketahui}`}>
                {GENDER_LABEL[tortoise.gender] || "?"}
              </span>
              {!isUnknown && <SourceBadge source={tortoise.source} />}
              {!isUnknown && tortoise.morph && tortoise.morph !== "normal" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{tortoise.morph}</Badge>
              )}
            </div>
            {tortoise.code && <p className="text-xs text-muted-foreground">{tortoise.code}</p>}
          </div>
        </div>
      </div>

      {expanded && hasParents && depth < maxDepth && (
        <div>
          {father && (
            <div>
              <span className="ml-10 text-[10px] text-blue-500 font-medium uppercase tracking-wide">Ayah</span>
              <TortoiseNode tortoise={father} tortoiseMap={tortoiseMap} depth={depth + 1} maxDepth={maxDepth} onSelect={onSelect} />
            </div>
          )}
          {mother && (
            <div>
              <span className="ml-10 text-[10px] text-pink-500 font-medium uppercase tracking-wide">Ibu</span>
              <TortoiseNode tortoise={mother} tortoiseMap={tortoiseMap} depth={depth + 1} maxDepth={maxDepth} onSelect={onSelect} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FamilyTreePage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const { data: tortoises = [], isLoading } = useQuery({
    queryKey: ["tortoises-family"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 500),
  });

  const tortoiseMap = useMemo(() => {
    const map = {};
    tortoises.forEach((t) => { map[t.id] = t; });
    return map;
  }, [tortoises]);

  const parentIds = useMemo(() => {
    const ids = new Set();
    tortoises.forEach((t) => {
      if (t.parent_male) ids.add(t.parent_male);
      if (t.parent_female) ids.add(t.parent_female);
    });
    return ids;
  }, [tortoises]);

  // Tampilkan semua kura-kura di panel kiri, tapi tandai yang punya silsilah
  const allTortoises = tortoises;

  const filteredList = useMemo(() => {
    const q = search.toLowerCase();
    return allTortoises
      .filter((t) => t.name?.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q))
      .slice(0, 80);
  }, [allTortoises, search]);

  const selectedTortoise = selected ? tortoiseMap[selected] : null;
  const hasPedigree = selectedTortoise ? hasCompletePedigree(selectedTortoise, tortoiseMap) : false;

  const children = useMemo(() =>
    selected ? tortoises.filter((t) => t.parent_male === selected || t.parent_female === selected) : []
  , [selected, tortoises]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-primary" /> Silsilah Kura-Kura
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          🐣 <strong>CBB</strong> (Captive Bred & Born) = hasil_sendiri + parent lengkap → silsilah 3 generasi<br/>
          🌱 <strong>CB</strong> (Captive Born) = hasil_sendiri tapi parent tidak lengkap<br/>
          🌍 <strong>WC</strong> (Wild Caught) = beli_lokal | 📦 <strong>Import</strong> | ❓ <strong>Unknown</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daftar kiri */}
        <Card className="p-4 space-y-3 lg:col-span-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari nama / kode..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {filteredList.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center gap-2.5 ${selected === t.id ? "bg-primary/10 border-primary/30" : "hover:bg-muted/50"}`}
                >
                  {t.photo_url ? (
                    <img src={t.photo_url} alt={t.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-primary/20" />
                  ) : (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      t.morph && morphColors[t.morph] ? morphColors[t.morph] : "bg-muted"
                    }`}>
                      <Shell className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 rounded-md ${GENDER_COLOR[t.gender] || GENDER_COLOR.belum_diketahui}`}>
                        {GENDER_LABEL[t.gender]}
                      </span>
                      <PedigreeBadge tortoise={t} tortoiseMap={tortoiseMap} />
                      {parentIds.has(t.id) && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-md">Induk</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {filteredList.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Tidak ditemukan</p>
              )}
            </div>
          )}
        </Card>

        {/* Pohon silsilah */}
        <div className="lg:col-span-2">
          {selectedTortoise ? (
            !hasPedigree ? (
              <Card className="p-8 flex flex-col items-center justify-center text-center gap-4">
                <AlertCircle className="w-12 h-12 text-amber-400" />
                <div>
                  <h3 className="font-semibold text-base mb-2">ℹ️ Silsilah Belum Tersedia</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>{selectedTortoise.name}</strong> belum memiliki silsilah lengkap.
                  </p>
                  {selectedTortoise.source === "hasil_sendiri" && (
                    <p className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 p-2 rounded">
                      🌱 Kura-kura ini hasil penangkaran sendiri, tapi data induk belum lengkap. 
                      Silakan update data parent_male dan parent_female di profil kura-kura.
                    </p>
                  )}
                  {selectedTortoise.source === "beli_lokal" && (
                    <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 p-2 rounded">
                      🌍 Silsilah tidak tersedia. Kura-kura ini bukan hasil penangkaran sendiri (Beli Lokal).
                    </p>
                  )}
                  {selectedTortoise.source === "import" && (
                    <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 p-2 rounded">
                      📦 Silsilah tidak tersedia. Kura-kura ini hasil import.
                    </p>
                  )}
                  {selectedTortoise.source === "tidak_diketahui" && (
                    <p className="text-xs text-muted-foreground bg-gray-50 border border-gray-200 p-2 rounded">
                      ❓ Silsilah tidak tersedia. Asal usul tidak diketahui.
                    </p>
                  )}
                  <div className="mt-3 flex justify-center gap-2">
                    <PedigreeBadge tortoise={selectedTortoise} tortoiseMap={tortoiseMap} />
                  </div>
                </div>
              </Card>
            ) : (
            <Card className="p-5 overflow-auto max-h-[80vh]">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Silsilah: {selectedTortoise.name}</h2>
                <PedigreeBadge tortoise={selectedTortoise} tortoiseMap={tortoiseMap} />
              </div>
              <TortoiseNode
                tortoise={selectedTortoise}
                tortoiseMap={tortoiseMap}
                depth={0}
                maxDepth={3}
                onSelect={setSelected}
              />

              {children.length > 0 && (
                <div className="mt-6 pt-5 border-t">
                  <p className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2">
                    <Baby className="w-4 h-4" /> Keturunan ({children.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setSelected(child.id)}
                        className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all"
                      >
                        {child.photo_url ? (
                          <img src={child.photo_url} className="w-8 h-8 rounded-full object-cover" alt={child.name} />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Shell className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <span className="text-sm font-medium">{child.name}</span>
                        <span className={`text-[10px] px-1.5 rounded-md ${GENDER_COLOR[child.gender] || GENDER_COLOR.belum_diketahui}`}>
                          {GENDER_LABEL[child.gender]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
            )
          ) : (
            <Card className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <GitBranch className="w-12 h-12 opacity-20" />
              <p className="text-sm">Pilih kura-kura dari daftar untuk melihat silsilahnya</p>
              <p className="text-xs opacity-60">🐣 CBB = hasil_sendiri + parent lengkap (kedua induk diketahui)</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}