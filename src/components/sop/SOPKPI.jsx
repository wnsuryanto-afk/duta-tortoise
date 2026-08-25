import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, Trophy, TrendingUp, Gift, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function SOPKPI() {
  const { user, role } = useCurrentUser();
  const queryClient = useQueryClient();
  const isAdmin = role === "owner" || role === "admin";
  const currentPeriod = format(new Date(), "yyyy-MM");

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["bonus-rewards"],
    queryFn: () => base44.entities.BonusReward.list("-period", 200),
  });

  const myRewards = isAdmin ? rewards : rewards.filter((r) => r.employee_email === user?.email);

  const handleUpdateBonus = async (reward, bonusAmount) => {
    await base44.entities.BonusReward.update(reward.id, {
      bonus_amount: parseFloat(bonusAmount) || 0,
    });
    queryClient.invalidateQueries({ queryKey: ["bonus-rewards"] });
  };

  const handleMarkPaid = async (reward) => {
    await base44.entities.BonusReward.update(reward.id, { status: "paid" });
    queryClient.invalidateQueries({ queryKey: ["bonus-rewards"] });
  };

  const myCurrentPeriod = myRewards.find((r) => r.period === currentPeriod);
  const myTotalPoints = myCurrentPeriod?.total_points || 0;

  // Group by employee for admin
  const grouped = isAdmin
    ? rewards.reduce((acc, r) => {
        if (!acc[r.employee_email]) acc[r.employee_email] = { name: r.employee_name, email: r.employee_email, records: [] };
        acc[r.employee_email].records.push(r);
        return acc;
      }, {})
    : null;

  return (
    <div className="space-y-6">
      {/* My Points Card */}
      {!isAdmin && (
        <Card className="p-5 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 font-medium">Poin Bulan Ini</p>
              <p className="text-4xl font-heading font-bold text-amber-800">{myTotalPoints}</p>
              <p className="text-xs text-amber-600 mt-1">{format(new Date(), "MMMM yyyy")}</p>
            </div>
            <Star className="w-16 h-16 text-amber-300 fill-current opacity-50" />
          </div>
          {myCurrentPeriod?.bonus_amount > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-200 flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-700" />
              <span className="text-sm font-semibold text-amber-800">
                Bonus: Rp {myCurrentPeriod.bonus_amount.toLocaleString("id-ID")}
              </span>
              <Badge className={`ml-auto text-xs ${statusColors[myCurrentPeriod.status]}`}>
                {myCurrentPeriod.status === "pending" ? "Belum Dibayar" : myCurrentPeriod.status === "paid" ? "Sudah Dibayar" : "Dibatalkan"}
              </Badge>
            </div>
          )}
        </Card>
      )}

      {/* History */}
      {!isAdmin && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Riwayat Poin & Bonus
          </h3>
          {myRewards.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada riwayat poin</p>
          ) : (
            myRewards.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{r.period}</p>
                    <div className="flex items-center gap-1 text-amber-600 mt-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-sm font-semibold">{r.total_points} poin</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {r.bonus_amount > 0 && (
                      <p className="text-sm font-bold text-primary">
                        Rp {r.bonus_amount.toLocaleString("id-ID")}
                      </p>
                    )}
                    <Badge className={`text-[11px] mt-1 ${statusColors[r.status] || ""}`}>
                      {r.status === "pending" ? "Menunggu" : r.status === "paid" ? "Dibayar" : "Batal"}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Admin: Per Employee KPI */}
      {isAdmin && (
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            KPI & Bonus Karyawan
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data KPI</p>
          ) : (
            Object.values(grouped).map((emp) => {
              const currentRecord = emp.records.find((r) => r.period === currentPeriod);
              const totalAllTime = emp.records.reduce((s, r) => s + (r.total_points || 0), 0);
              return (
                <Card key={emp.email} className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="font-semibold">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-600 justify-end">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-bold">{currentRecord?.total_points || 0} poin</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">bulan ini</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {emp.records.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 text-sm py-2 border-t first:border-0">
                        <span className="text-muted-foreground w-20 shrink-0">{r.period}</span>
                        <div className="flex items-center gap-1 text-amber-600 w-24 shrink-0">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-xs font-semibold">{r.total_points} pts</span>
                        </div>
                        <Input
                          type="number"
                          placeholder="Bonus (Rp)"
                          className="h-7 text-xs flex-1"
                          defaultValue={r.bonus_amount || ""}
                          onBlur={(e) => handleUpdateBonus(r, e.target.value)}
                        />
                        <Badge className={`text-[11px] shrink-0 ${statusColors[r.status] || ""}`}>
                          {r.status === "pending" ? "Belum" : r.status === "paid" ? "Dibayar" : "Batal"}
                        </Badge>
                        {r.status === "pending" && r.bonus_amount > 0 && (
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2 shrink-0" onClick={() => handleMarkPaid(r)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Bayar
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}