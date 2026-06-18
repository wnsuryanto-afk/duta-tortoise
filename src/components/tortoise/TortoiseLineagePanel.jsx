import { useMemo } from "react";
import { Shell, Baby } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const GENDER_BG = {
  jantan: "bg-blue-100 border-blue-300 text-blue-800",
  betina: "bg-pink-100 border-pink-300 text-pink-800",
  belum_diketahui: "bg-gray-100 border-gray-300 text-gray-700",
};
const GENDER_LABEL = { jantan: "♂", betina: "♀", belum_diketahui: "?" };

function TortoiseBox({ t, isMain = false }) {
  const isUnknown = !t;
  const genderKey = t?.gender || "belum_diketahui";
  const label = GENDER_LABEL[genderKey] || "?";
  const color = GENDER_BG[genderKey] || GENDER_BG.belum_diketahui;

  if (isUnknown) {
    return (
      <div className="flex flex-col items-center gap-1 w-28">
        <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
          <Shell className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-[10px] text-gray-400 text-center">Tidak didata</p>
      </div>
    );
  }

  const photo = t.photo_url || (Array.isArray(t.photos) && t.photos[0]?.url);
  const inner = (
    <div className={`flex flex-col items-center gap-1 w-28 ${isMain ? "" : "cursor-pointer hover:opacity-80 transition-opacity"}`}>
      {photo ? (
        <img src={photo} alt={t.name} className={`rounded-full object-cover border-2 ${color} ${isMain ? "w-16 h-16" : "w-12 h-12"}`} />
      ) : (
        <div className={`flex items-center justify-center rounded-full border-2 ${color} ${isMain ? "w-16 h-16" : "w-12 h-12"}`}>
          <span className="text-lg font-bold">{label}</span>
        </div>
      )}
      <p className={`font-semibold text-center leading-tight ${isMain ? "text-sm" : "text-xs"}`}>{t.name}</p>
      {t.code && <p className="text-[10px] text-muted-foreground">{t.code}</p>}
    </div>
  );

  if (isMain) return inner;
  return <Link to={`/tortoise?highlight=${t.id}`}>{inner}</Link>;
}

function ConnectorLine({ horizontal = false }) {
  if (horizontal) {
    return <div className="h-0.5 w-8 bg-border flex-shrink-0" />;
  }
  return <div className="w-0.5 h-6 bg-border mx-auto" />;
}

export default function TortoiseLineagePanel({ tortoise, allTortoises }) {
  // Code-based lookup (parent_male/parent_female menyimpan KODE, bukan nama)
  const tortoiseByCode = useMemo(() => {
    const map = {};
    allTortoises.forEach(t => { if (t.code) map[t.code] = t; });
    return map;
  }, [allTortoises]);

  // ID-based fallback
  const tortoiseById = useMemo(() => {
    const map = {};
    allTortoises.forEach(t => { map[t.id] = t; });
    return map;
  }, [allTortoises]);

  function findParent(ref) {
    if (!ref) return null;
    if (tortoiseByCode[ref]) return tortoiseByCode[ref];
    if (tortoiseById[ref]) return tortoiseById[ref];
    return null;
  }

  const father = findParent(tortoise.parent_male);
  const mother = findParent(tortoise.parent_female);

  // Grandparents
  const pGF = findParent(father?.parent_male);
  const pGM = findParent(father?.parent_female);
  const mGF = findParent(mother?.parent_male);
  const mGM = findParent(mother?.parent_female);

  const hasParents = !!(tortoise.parent_male || tortoise.parent_female);
  const hasGrandparents = father?.parent_male || father?.parent_female || mother?.parent_male || mother?.parent_female;

  // Keturunan: cari tortoise yang parent_male/parent_female = CODE dari kura ini
  const children = useMemo(() => {
    const code = tortoise.code;
    if (!code) return [];
    return allTortoises.filter(t =>
      t.parent_male === code || t.parent_female === code
    );
  }, [allTortoises, tortoise.code]);

  if (!hasParents && children.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shell className="w-10 h-10 mx-auto mb-2 opacity-20" />
        <p className="text-sm">Belum ada data silsilah untuk kura ini.</p>
        <p className="text-xs mt-1">Isi field parent_male / parent_female di profil kura untuk menampilkan silsilah.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* POHON LELUHUR */}
      {hasParents && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pohon Silsilah</p>
          <div className="overflow-x-auto">
            <div className="flex flex-col items-center gap-0 min-w-[400px]">
              {/* Generasi 2: Kakek-Nenek */}
              {hasGrandparents && (
                <>
                  <div className="flex items-end gap-4 justify-center w-full">
                    {/* Sisi Ayah */}
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className="flex items-end gap-3 justify-center">
                        {(father?.parent_male || father?.parent_female) ? (
                          <>
                            <div className="flex flex-col items-center">
                              <p className="text-[9px] text-blue-400 font-semibold uppercase mb-1">Kakek ♂</p>
                              <TortoiseBox t={pGF} />
                            </div>
                            {(father?.parent_male || father?.parent_female) && <ConnectorLine horizontal />}
                            <div className="flex flex-col items-center">
                              <p className="text-[9px] text-pink-400 font-semibold uppercase mb-1">Nenek ♀</p>
                              <TortoiseBox t={pGM} />
                            </div>
                          </>
                        ) : <div className="w-28" />}
                      </div>
                    </div>
                    <div className="w-12 flex-shrink-0" />
                    {/* Sisi Ibu */}
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className="flex items-end gap-3 justify-center">
                        {(mother?.parent_male || mother?.parent_female) ? (
                          <>
                            <div className="flex flex-col items-center">
                              <p className="text-[9px] text-blue-400 font-semibold uppercase mb-1">Kakek ♂</p>
                              <TortoiseBox t={mGF} />
                            </div>
                            <ConnectorLine horizontal />
                            <div className="flex flex-col items-center">
                              <p className="text-[9px] text-pink-400 font-semibold uppercase mb-1">Nenek ♀</p>
                              <TortoiseBox t={mGM} />
                            </div>
                          </>
                        ) : <div className="w-28" />}
                      </div>
                    </div>
                  </div>
                  <ConnectorLine />
                </>
              )}

              {/* Generasi 1: Ayah & Ibu */}
              <div className="flex items-end gap-4 justify-center w-full">
                <div className="flex flex-col items-center flex-1">
                  {tortoise.parent_male && (
                    <>
                      <p className="text-[9px] text-blue-500 font-semibold uppercase mb-1">Ayah ♂</p>
                      <TortoiseBox t={father} />
                    </>
                  )}
                </div>
                <ConnectorLine horizontal />
                <div className="flex flex-col items-center flex-1">
                  {tortoise.parent_female && (
                    <>
                      <p className="text-[9px] text-pink-500 font-semibold uppercase mb-1">Ibu ♀</p>
                      <TortoiseBox t={mother} />
                    </>
                  )}
                </div>
              </div>

              {/* Konektor ke kura ini */}
              <ConnectorLine />

              {/* Kura ini */}
              <div className="flex flex-col items-center">
                <p className="text-[9px] text-primary font-semibold uppercase mb-1">Kura Ini</p>
                <TortoiseBox t={tortoise} isMain />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KETURUNAN */}
      {children.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Baby className="w-3.5 h-3.5" /> Keturunan ({children.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {children.map(child => (
              <Link
                key={child.id}
                to={`/tortoise?highlight=${child.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all"
              >
                {child.photo_url ? (
                  <img src={child.photo_url} className="w-8 h-8 rounded-full object-cover" alt={child.name} />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${GENDER_BG[child.gender] || GENDER_BG.belum_diketahui}`}>
                    <span className="text-xs font-bold">{GENDER_LABEL[child.gender] || "?"}</span>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold">{child.name}</p>
                  <p className="text-[10px] text-muted-foreground">{child.code || child.birth_date || "-"}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${GENDER_BG[child.gender] || GENDER_BG.belum_diketahui}`}>
                  {GENDER_LABEL[child.gender] || "?"}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}