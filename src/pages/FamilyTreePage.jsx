import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shell, Search, GitBranch, ChevronDown, ChevronRight, Baby } from "lucide-react";

const GENDER_COLOR = {
  jantan: "bg-blue-100 text-blue-700",
  betina: "bg-pink-100 text-pink-700",
  belum_diketahui: "bg-gray-100 text-gray-700",
};
const GENDER_LABEL = { jantan: "♂", betina: "♀", belum_diketahui: "?" };

function TortoiseNode({ tortoise, tortoiseMap, depth = 0, maxDepth = 4, onSelect }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const father = tortoise.parent_male ? tortoiseMap[tortoise.parent_male] : null;
  const mother = tortoise.parent_female ? tortoiseMap[tortoise.parent_female] : null;
  const hasParents = father || mother;

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
        <div className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:shadow-sm transition-shadow">
          {tortoise.photo_url ? (
            <img src={tortoise.photo_url} alt={tortoise.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shell className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm">{tortoise.name}</span>
              <span className={`text-[10px] px-1.5 py-0 rounded-md ${GENDER_COLOR[tortoise.gender] || GENDER_COLOR.belum_diketahui}`}>
                {GENDER_LABEL[tortoise.gender] || "?"}
              </span>
              {tortoise.morph && tortoise.morph !== "normal" && (
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

  const filteredList = useMemo(() => {
    const q = search.toLowerCase();
    return tortoises
      .filter((t) => t.name?.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q))
      .slice(0, 60);
  }, [tortoises, search]);

  const selectedTortoise = selected ? tortoiseMap[selected] : null;

  const children = useMemo(() =>
    selected ? tortoises.filter((t) => t.parent_male === selected || t.parent_female === selected) : []
  , [selected, tortoises]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-primary" /> Silsilah Kura-Kura
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Pohon keturunan berdasarkan data induk jantan &amp; betina</p>
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
                    <img src={t.photo_url} alt={t.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Shell className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 rounded-md ${GENDER_COLOR[t.gender] || GENDER_COLOR.belum_diketahui}`}>
                        {GENDER_LABEL[t.gender]}
                      </span>
                      {parentIds.has(t.id) && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-md">Induk</span>
                      )}
                      {(t.parent_male || t.parent_female) && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-md">Ada Ortu</span>
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
            <Card className="p-5 overflow-auto max-h-[80vh]">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Silsilah: {selectedTortoise.name}</h2>
              </div>
              <TortoiseNode
                tortoise={selectedTortoise}
                tortoiseMap={tortoiseMap}
                depth={0}
                maxDepth={5}
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
          ) : (
            <Card className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <GitBranch className="w-12 h-12 opacity-20" />
              <p className="text-sm">Pilih kura-kura dari daftar untuk melihat silsilahnya</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}