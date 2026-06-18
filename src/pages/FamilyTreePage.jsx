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

// Cari tortoise berdasarkan id ATAU code ATAU name
function findTortoise(ref, idMap, codeMap) {
  if (!ref) return null;
  // Prioritas: id > code > name
  if (idMap[ref]) return idMap[ref];
  if (codeMap[ref]) return codeMap[ref];
  // Coba cari by name (case-insensitive)
  const lower = ref.toLowerCase();
  for (const t of Object.values(idMap)) {
    if (t.name?.toLowerCase() === lower) return t;
  }
  return null;
}

// Dapatkan khusus parent_male (dominan: code-based)
function findParent(ref, idMap, codeMap) {
  if (!ref) return null;
  // code-based lookup dulu
  if (codeMap[ref]) return codeMap[ref];
  if (idMap[ref]) return idMap[ref];
  return null;
}

function SourceBadge({ source }) {
  const s = SOURCE_LABEL[source] || SOURCE_LABEL.tidak_diketahui;
  return (
    <span title={s.title} className={`text-[10px] px-1.5 py-0.5 rounded-md border font-bold ${s.color}`}>{s.text}</span>
  );
}

function PedigreeBadge({ tortoise, idMap, codeMap }) {
  const hasBothParents = tortoise.parent_male && tortoise.parent_female;
  const father = hasBothParents ? findParent(tortoise.parent_male, idMap, codeMap) : null;
  const mother = hasBothParents ? findParent(tortoise.parent_female, idMap, codeMap) : null;
  const isComplete = hasBothParents && !!(father || mother);
  if (isComplete) {
    return (
      <span title="Silsilah Lengkap" className="text-[10px] px-2 py-1 rounded-full border font-bold bg-green-600 text-white border-green-700">
        🐣 CBB
      </span>
    );
  } else if (hasBothParents) {
    return (
      <span title="Parent Tidak Lengkap (data induk belum ada di database)" className="text-[10px] px-2 py-1 rounded-full border font-bold bg-yellow-500 text-white border-yellow-600">
        🌱 CB
      </span>
    );
  }
  return (
    <span title="Belum punya data induk" className="text-[10px] px-2 py-1 rounded-full border font-bold bg-gray-400 text-white border-gray-500">
      ❓ Unknown
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

function TortoiseNode({ tortoise, tortoiseMap, codeMap, depth = 0, maxDepth = 3, onSelect }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isUnknown = tortoise.id === "__unknown__";

  // Cari parent berdasarkan code (prioritas code, fallback id)
  const father = tortoise.parent_male
    ? (findParent(tortoise.parent_male, tortoiseMap, codeMap) || { ...UNKNOWN_NODE, id: `__unk_male_${depth}_${tortoise.id}`, name: tortoise.parent_male })
    : null;
  const mother = tortoise.parent_female
    ? (findParent(tortoise.parent_female, tortoiseMap, codeMap) || { ...UNKNOWN_NODE, id: `__unk_female_${depth}_${tortoise.id}`, name: tortoise.parent_female })
    : null;
  const hasParents = (father || mother) && !isUnknown;
  const isFocus = depth === 0;

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
          className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
            isUnknown
              ? "bg-gray-50 border-gray-200 opacity-60"
              : isFocus
                ? "bg-card hover:shadow-sm cursor-pointer border-primary/50 ring-2 ring-primary/20 shadow-md"
                : "bg-card hover:shadow-sm cursor-pointer"
          }`}
          onClick={() => !isUnknown && onSelect && onSelect(tortoise.id)}
        >
          {!isUnknown && (tortoise.photos?.[0]?.url || tortoise.photo_url) ? (
            <img src={tortoise.photos?.[0]?.url || tortoise.photo_url} alt={tortoise.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border" />
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
              <span className="ml-10 text-[10px] text-blue-500 font-medium uppercase tracking-wide">⏶ Ayah</span>
              <TortoiseNode tortoise={father} tortoiseMap={tortoiseMap} codeMap={codeMap} depth={depth + 1} maxDepth={maxDepth} onSelect={onSelect} />
            </div>
          )}
          {mother && (
            <div>
              <span className="ml-10 text-[10px] text-pink-500 font-medium uppercase tracking-wide">⏶ Ibu</span>
              <TortoiseNode tortoise={mother} tortoiseMap={tortoiseMap} codeMap={codeMap} depth={depth + 1} maxDepth={maxDepth} onSelect={onSelect} />
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

  // Map by ID
  const tortoiseMap = useMemo(() => {
    const map = {};
    tortoises.forEach((t) => { map[t.id] = t; });
    return map;
  }, [tortoises]);

  // Map by CODE (untuk pencocokan parent yang disimpan sebagai code)
  const codeMap = useMemo(() => {
    const map = {};
    tortoises.forEach((t) => { if (t.code) map[t.code] = t; });
    return map;
  }, [tortoises]);

  // Set kode tortoise yang menjadi indukan (punya keturunan)
  const parentCodes = useMemo(() => {
    const codes = new Set();
    tortoises.forEach((t) => {
      if (t.parent_male) codes.add(t.parent_male);
      if (t.parent_female) codes.add(t.parent_female);
    });
    return codes;
  }, [tortoises]);

  // Daftar kiri: semua tortoise yang punya data parent (ada parent_male ATAU parent_female ATAU merupakan indukan)
  const filteredList = useMemo(() => {
    const q = search.toLowerCase();
    return tortoises
      .filter((t) => {
        const hasParentData = (t.parent_male && t.parent_male.trim() !== "") || (t.parent_female && t.parent_female.trim() !== "");
        const isBreeder = parentCodes.has(t.code);
        const matchesSearch = !q || t.name?.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q);
        return matchesSearch && (hasParentData || isBreeder || t.source === "hasil_sendiri");
      })
      .slice(0, 100);
  }, [tortoises, search, parentCodes]);

  const selectedTortoise = selected ? tortoiseMap[selected] : null;

  // Keturunan: cari tortoise yang parent_male/parent_female = CODE dari kura terpilih
  const children = useMemo(() => {
    if (!selected || !selectedTortoise?.code) return [];
    return tortoises.filter(
      (t) => t.parent_male === selectedTortoise.code || t.parent_female === selectedTortoise.code
    );
  }, [selected, selectedTortoise, tortoises]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-primary" /> Silsilah Kura-Kura
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Menampilkan kura hasil penangkaran Duta Tortoise dengan data silsilah lengkap
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
                  {(t.photos?.[0]?.url || t.photo_url) ? (
                    <img src={t.photos?.[0]?.url || t.photo_url} alt={t.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-primary/20" />
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold bg-amber-100 text-amber-800 border-amber-300">🐣 CBB</span>
                    {parentCodes.has(t.code) && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-md">Induk</span>
                    )}
                    </div>
                  </div>
                </button>
              ))}
              {filteredList.length === 0 && (
                <div className="text-center py-8 px-3">
                  {search ? (
                    <p className="text-sm text-muted-foreground">Tidak ditemukan</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada kura dengan data silsilah. Data induk diisi otomatis saat telur menetas.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Pohon silsilah */}
        <div className="lg:col-span-2">
          {selectedTortoise ? (
            <Card className="p-5 overflow-auto max-h-[80vh]">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Silsilah: {selectedTortoise.name}</h2>
                <PedigreeBadge tortoise={selectedTortoise} idMap={tortoiseMap} codeMap={codeMap} />
              </div>

              {(!selectedTortoise.parent_male && !selectedTortoise.parent_female) && selectedTortoise.source !== "hasil_sendiri" ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <AlertCircle className="w-10 h-10 text-amber-400" />
                  <p className="text-sm text-muted-foreground">
                    <strong>{selectedTortoise.name}</strong> tidak memiliki data induk. Silsilah hanya tersedia untuk kura dengan data <em>parent_male</em> atau <em>parent_female</em>.
                  </p>
                </div>
              ) : (
                <TortoiseNode
                  tortoise={selectedTortoise}
                  tortoiseMap={tortoiseMap}
                  codeMap={codeMap}
                  depth={0}
                  maxDepth={3}
                  onSelect={setSelected}
                />
              )}

              <div className="mt-6 pt-5 border-t">
                {children.length > 0 ? (
                  <>
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
                          {(child.photos?.[0]?.url || child.photo_url) ? (
                            <img src={child.photos?.[0]?.url || child.photo_url} className="w-8 h-8 rounded-full object-cover" alt={child.name} />
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
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Baby className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Belum ada keturunan</p>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <GitBranch className="w-12 h-12 opacity-20" />
              <p className="text-sm">Pilih kura-kura dari daftar untuk melihat silsilahnya</p>
              <p className="text-xs opacity-60">Klik kura untuk melihat pohon silsilah dan keturunannya</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}