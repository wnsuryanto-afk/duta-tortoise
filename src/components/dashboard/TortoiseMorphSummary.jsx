import { Card } from "@/components/ui/card";
import { Shell } from "lucide-react";

const morphLabels = {
  normal:     "Normal",
  over_scute: "Over Scute",
  less_scute: "Less Scute",
  het_albino: "Het Albino",
  ivory:      "Ivory",
  albino:     "Albino",
};

const morphColors = {
  normal:     "bg-muted text-muted-foreground",
  over_scute: "bg-blue-100 text-blue-700",
  less_scute: "bg-purple-100 text-purple-700",
  het_albino: "bg-orange-100 text-orange-700",
  ivory:      "bg-yellow-100 text-yellow-700",
  albino:     "bg-pink-100 text-pink-700",
};

export default function TortoiseMorphSummary({ tortoises = [] }) {
  // Hitung per morph
  const morphCount = {};
  tortoises.forEach((t) => {
    const m = t.morph || "normal";
    if (!morphCount[m]) morphCount[m] = { total: 0, jantan: 0, betina: 0 };
    morphCount[m].total++;
    if (t.gender === "jantan") morphCount[m].jantan++;
    else if (t.gender === "betina") morphCount[m].betina++;
  });

  const total = tortoises.length;
  const entries = Object.entries(morphLabels)
    .filter(([k]) => morphCount[k])
    .map(([k]) => ({ key: k, ...morphCount[k] }));

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shell className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-base">Jenis Kura-kura</h2>
        <span className="ml-auto text-sm font-bold text-primary">{total} ekor total</span>
      </div>
      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.key} className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center flex-shrink-0 ${morphColors[e.key]}`}>
              {morphLabels[e.key]}
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full"
                style={{ width: total > 0 ? `${(e.total / total) * 100}%` : "0%" }}
              />
            </div>
            <span className="text-xs font-semibold w-8 text-right">{e.total}</span>
            <span className="text-[11px] text-muted-foreground w-20 text-right">
              ♂{e.jantan} · ♀{e.betina}
            </span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
        )}
      </div>
    </Card>
  );
}