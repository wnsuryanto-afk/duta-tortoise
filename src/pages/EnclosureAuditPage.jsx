import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Plus, AlertTriangle, TrendingUp, Eye } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useCurrentUser } from "@/lib/useCurrentUser";
import EnclosureAuditForm from "@/components/enclosure/EnclosureAuditForm";
import AccessDenied from "@/components/common/AccessDenied";

const GRADE_COLORS = { A: "bg-green-100 text-green-800", B: "bg-blue-100 text-blue-800", C: "bg-yellow-100 text-yellow-800", D: "bg-red-100 text-red-800" };

function calcGrade(score, maxScore) {
  const pct = (score / maxScore) * 100;
  if (pct >= 85) return "A";
  if (pct >= 70) return "B";
  if (pct >= 55) return "C";
  return "D";
}

export default function EnclosureAuditPage() {
  const { role, user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editAudit, setEditAudit] = useState(null);
  const [selectedEnclosure, setSelectedEnclosure] = useState("semua");
  const [viewAudit, setViewAudit] = useState(null);

  const canAudit = ["owner", "admin", "manajer"].includes(role);

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["enclosure-audits"],
    queryFn: () => base44.entities.EnclosureAudit.list("-audit_date"),
  });
  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures-audit"],
    queryFn: () => base44.entities.Enclosure.list(),
  });

  const today = new Date();
  const enclosureNames = [...new Set(audits.map(a => a.enclosure_name))];

  // Alert kandang belum diaudit > 30 hari
  const overdueAlerts = useMemo(() => {
    const lastAudit = {};
    audits.forEach(a => {
      if (!lastAudit[a.enclosure_name] || a.audit_date > lastAudit[a.enclosure_name]) {
        lastAudit[a.enclosure_name] = a.audit_date;
      }
    });
    return enclosures.filter(e => e.is_active !== false).filter(e => {
      const last = lastAudit[e.name];
      if (!last) return true;
      return differenceInDays(today, parseISO(last)) > 30;
    }).map(e => ({ name: e.name, lastAudit: lastAudit[e.name] || null }));
  }, [audits, enclosures]);

  const filtered = selectedEnclosure === "semua" ? audits : audits.filter(a => a.enclosure_name === selectedEnclosure);

  // Chart data per enclosure
  const chartData = useMemo(() => {
    const grouped = {};
    filtered.forEach(a => {
      if (!grouped[a.enclosure_name]) grouped[a.enclosure_name] = [];
      grouped[a.enclosure_name].push({ date: a.audit_date, score: a.total_score || 0, grade: a.grade });
    });
    return grouped;
  }, [filtered]);

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["enclosure-audits"] });
    setShowForm(false);
    setEditAudit(null);
  };

  if (!canAudit) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl"><ClipboardCheck className="w-6 h-6 text-amber-700" /></div>
          <div>
            <h1 className="text-2xl font-bold">Audit Kandang</h1>
            <p className="text-sm text-muted-foreground">{audits.length} rekaman audit</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedEnclosure} onValueChange={setSelectedEnclosure}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Semua Kandang" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Kandang</SelectItem>
              {enclosureNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditAudit(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Audit Baru
          </Button>
        </div>
      </div>

      {/* Overdue Alerts */}
      {overdueAlerts.length > 0 && (
        <div className="space-y-2">
          {overdueAlerts.map(a => (
            <div key={a.name} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span><strong>{a.name}</strong> belum diaudit {a.lastAudit ? `sejak ${differenceInDays(today, parseISO(a.lastAudit))} hari lalu` : "— belum pernah diaudit"}.</span>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Belum ada data audit</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Trend Charts */}
          {Object.entries(chartData).map(([name, data]) => data.length > 1 && (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Tren Skor: {name}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={[...data].sort((a, b) => a.date > b.date ? 1 : -1)}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 35]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={v => [`${v}`, "Skor"]} />
                    <Line type="monotone" dataKey="score" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}

          {/* Audit List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(audit => (
              <Card key={audit.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="font-semibold">{audit.enclosure_name}</div>
                      <div className="text-xs text-muted-foreground">{audit.audit_date} · oleh {audit.auditor_name}</div>
                    </div>
                    {audit.grade && <Badge className={`${GRADE_COLORS[audit.grade] || ""} border-0 font-bold text-sm`}>Grade {audit.grade}</Badge>}
                  </div>
                  {audit.total_score != null && (
                    <div className="text-sm">Skor Total: <span className="font-bold">{audit.total_score}</span><span className="text-muted-foreground">/35</span></div>
                  )}
                  {audit.action_items && <div className="mt-2 text-xs text-muted-foreground line-clamp-2">🔧 {audit.action_items}</div>}
                  <div className="flex gap-1 mt-3 pt-2 border-t">
                    <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => setViewAudit(audit)}>
                      <Eye className="w-3 h-3 mr-1" /> Detail
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditAudit(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Form Audit Kandang</DialogTitle></DialogHeader>
          <EnclosureAuditForm
            data={editAudit}
            enclosures={enclosures}
            onSave={handleSaved}
            onClose={() => { setShowForm(false); setEditAudit(null); }}
            auditorName={user?.full_name || user?.email}
          />
        </DialogContent>
      </Dialog>

      {/* View Detail */}
      {viewAudit && (
        <Dialog open={!!viewAudit} onOpenChange={() => setViewAudit(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Hasil Audit: {viewAudit.enclosure_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <div><span className="text-muted-foreground">Tanggal: </span>{viewAudit.audit_date}</div>
                <div><span className="text-muted-foreground">Auditor: </span>{viewAudit.auditor_name}</div>
                {viewAudit.grade && <Badge className={`${GRADE_COLORS[viewAudit.grade]} border-0`}>Grade {viewAudit.grade}</Badge>}
              </div>
              {viewAudit.checklist?.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/40 rounded-lg text-sm">
                  <span className="font-medium capitalize">{item.aspect}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => <div key={s} className={`w-4 h-4 rounded-sm ${s <= item.score ? "bg-green-500" : "bg-muted"}`} />)}
                    </div>
                    <span className="text-xs text-muted-foreground">{item.score}/5</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-sm p-2 bg-primary/5 rounded-lg">
                <span>Total Skor</span><span>{viewAudit.total_score}/{(viewAudit.checklist?.length || 7) * 5}</span>
              </div>
              {viewAudit.action_items && (
                <div><p className="text-sm font-medium mb-1">Tindakan Perbaikan:</p><p className="text-sm text-muted-foreground">{viewAudit.action_items}</p></div>
              )}
              {viewAudit.follow_up_date && <p className="text-sm"><span className="font-medium">Follow Up: </span>{viewAudit.follow_up_date}</p>}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}