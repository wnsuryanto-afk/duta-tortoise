import { CATEGORIES, getTheme } from "@/lib/temuanCategorize";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

/**
 * TemuanRingkasanMingguan — ringkasan 7 hari: count per kategori + 3 pola teratas.
 */
export default function TemuanRingkasanMingguan({ allFindings }) {
  const byCat = {};
  const themeCount = {};

  allFindings.forEach(f => {
    byCat[f.category] = (byCat[f.category] || 0) + 1;
    const theme = getTheme(f.finding_text);
    if (theme) themeCount[theme] = (themeCount[theme] || 0) + 1;
  });

  const sortedCats = Object.entries(byCat).sort((a, b) => {
    const ap = CATEGORIES[a[0]]?.priority || 99;
    const bp = CATEGORIES[b[0]]?.priority || 99;
    return ap - bp;
  });

  const topThemes = Object.entries(themeCount)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">📊 Ringkasan 7 Hari Terakhir</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {sortedCats.map(([cat, count]) => {
            const c = CATEGORIES[cat];
            return (
              <div key={cat} className={`rounded-lg border p-2 text-center ${c?.color || ""}`}>
                <p className="text-lg">{c?.icon}</p>
                <p className="text-lg font-bold text-foreground leading-none">{count}</p>
                <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                  {c?.label.replace(/^[^\s]+\s/, "")}
                </p>
              </div>
            );
          })}
          {sortedCats.length === 0 && (
            <p className="text-xs text-muted-foreground col-span-5">Tidak ada temuan dalam 7 hari terakhir</p>
          )}
        </div>

        {topThemes.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Pola yang sering muncul:</p>
            <div className="space-y-1">
              {topThemes.map(([theme, count], i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="text-foreground flex-1">"{theme}"</span>
                  <span className="text-muted-foreground font-semibold">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}