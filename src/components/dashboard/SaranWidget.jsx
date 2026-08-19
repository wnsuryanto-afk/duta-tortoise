import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export function SaranOwnerWidget() {
  const { data: allSaran = [] } = useQuery({
    queryKey: ["kritik-saran"],
    queryFn: () => base44.entities.KritikSaran.list("-submit_date", 50),
  });
  const pending = allSaran.filter(s => s.status === "pending");
  if (pending.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Saran Pending Review
          </span>
          <Badge className="bg-amber-500 text-white">{pending.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-xs text-muted-foreground mb-3">{pending.length} saran menunggu ditindaklanjuti</p>
        <Link to="/kritik-saran">
          <span className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            Review Sekarang <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}

export function SaranKaryawanWidget({ userEmail }) {
  const { data: allSaran = [] } = useQuery({
    queryKey: ["kritik-saran"],
    queryFn: () => base44.entities.KritikSaran.list("-submit_date", 100),
  });
  const mine = allSaran.filter(s => s.submitted_by_email === userEmail);
  const accepted = mine.filter(s => ["diterima", "sudah_diimplementasi"].includes(s.status)).length;
  const totalPts = mine.reduce((a, s) => a + (s.points_awarded || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          Saran Saya
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-foreground">{mine.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-600">{accepted}</p>
            <p className="text-xs text-muted-foreground">Diterima</p>
          </div>
          <div>
            <p className="text-xl font-bold text-amber-600">{totalPts}</p>
            <p className="text-xs text-muted-foreground">Poin</p>
          </div>
        </div>
        <Link to="/kritik-saran">
          <span className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            Lihat & Kirim Saran <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}