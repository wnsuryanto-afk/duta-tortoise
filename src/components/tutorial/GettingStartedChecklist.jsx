import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ChevronRight, UserPlus, Home, Shell, Wallet, Wheat, Stethoscope, Users, ClipboardList } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CHECKLIST_ITEMS = [
  { 
    id: "profile", 
    label: "Lengkapi profil akun kamu", 
    icon: UserPlus, 
    color: "text-blue-600", 
    bg: "bg-blue-100",
    link: "/edit-profil",
    check: (data) => data.profile && data.profile.length > 0 && data.profile[0].is_complete,
  },
  { 
    id: "enclosure", 
    label: "Tambahkan kandang pertama", 
    icon: Home, 
    color: "text-green-600", 
    bg: "bg-green-100",
    link: "/enclosure",
    action: "add",
    check: (data) => data.enclosures && data.enclosures.length > 0,
  },
  { 
    id: "tortoise", 
    label: "Daftarkan kura-kura pertama", 
    icon: Shell, 
    color: "text-primary", 
    bg: "bg-primary/10",
    link: "/tortoise",
    action: "add",
    check: (data) => data.tortoises && data.tortoises.length > 0,
  },
  { 
    id: "salary_config", 
    label: "Atur konfigurasi gaji", 
    icon: Wallet, 
    color: "text-amber-600", 
    bg: "bg-amber-100",
    link: "/salary",
    check: (data) => data.salaryConfigs && data.salaryConfigs.length > 0,
  },
  { 
    id: "feed_stock", 
    label: "Tambahkan stok pakan pertama", 
    icon: Wheat, 
    color: "text-yellow-600", 
    bg: "bg-yellow-100",
    link: "/feed-stock",
    action: "add",
    check: (data) => data.feedStocks && data.feedStocks.length > 0,
  },
  { 
    id: "treatment", 
    label: "Buat jadwal treatment pertama", 
    icon: Stethoscope, 
    color: "text-red-600", 
    bg: "bg-red-100",
    link: "/treatment",
    action: "add",
    check: (data) => data.treatments && data.treatments.length > 0,
  },
  { 
    id: "employee", 
    label: "Tambahkan karyawan pertama", 
    icon: Users, 
    color: "text-purple-600", 
    bg: "bg-purple-100",
    link: "/hr",
    action: "add",
    check: (data) => data.profiles && data.profiles.length > 1, // lebih dari 1 karena sudah ada profil user sendiri
  },
  { 
    id: "sop", 
    label: "Buat SOP pertama", 
    icon: ClipboardList, 
    color: "text-orange-600", 
    bg: "bg-orange-100",
    link: "/sop",
    action: "add",
    check: (data) => data.sops && data.sops.length > 0,
  },
];

export default function GettingStartedChecklist() {
  const navigate = useNavigate();

  const { data: tortoises = [] } = useQuery({ queryKey: ["tortoises-checklist"], queryFn: () => base44.entities.Tortoise.list("-created_date", 300) });
  const { data: enclosures = [] } = useQuery({ queryKey: ["enclosures-checklist"], queryFn: () => base44.entities.Enclosure.list() });
  const { data: profiles = [] } = useQuery({ queryKey: ["user-profiles-checklist"], queryFn: () => base44.entities.UserProfile.list() });
  const { data: salaryConfigs = [] } = useQuery({ queryKey: ["salary-configs-checklist"], queryFn: () => base44.entities.SalaryConfig.list() });
  const { data: feedStocks = [] } = useQuery({ queryKey: ["feed-stocks-checklist"], queryFn: () => base44.entities.FeedStock.list() });
  const { data: treatments = [] } = useQuery({ queryKey: ["treatments-checklist"], queryFn: () => base44.entities.TreatmentSchedule.list() });
  const { data: sops = [] } = useQuery({ queryKey: ["sops-checklist"], queryFn: () => base44.entities.SOPDocument.list() });

  const checklistData = useMemo(() => ({
    tortoises, enclosures, profiles, salaryConfigs, feedStocks, treatments, sops,
    profile: profiles.filter(p => p.user_email === profiles[0]?.user_email), // profil user saat ini
  }), [tortoises, enclosures, profiles, salaryConfigs, feedStocks, treatments, sops]);

  const completedCount = CHECKLIST_ITEMS.filter(item => item.check(checklistData)).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const progress = Math.round((completedCount / totalCount) * 100);

  const handleItemClick = (item) => {
    if (item.action === "add") {
      // Untuk item yang perlu buka form tambah, navigasi ke halaman dan set state untuk buka form
      navigate(item.link);
      // Note: Form opening would need to be handled by the target page via URL params or state
    } else {
      navigate(item.link);
    }
  };

  if (completedCount === totalCount) {
    return null; // Sembunyikan jika semua sudah selesai
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Langkah Awal
          </CardTitle>
          <Badge className={`${progress === 100 ? "bg-green-500" : "bg-blue-500"} text-white text-xs`}>
            {completedCount}/{totalCount} Selesai
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const isCompleted = item.check(checklistData);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.id}
                to={item.link}
                className="block"
              >
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    isCompleted 
                      ? "bg-green-50 border-green-200" 
                      : "bg-white border-blue-200 hover:border-blue-300 hover:shadow-sm"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCompleted ? "text-green-800 line-through" : "text-slate-800"}`}>
                      {item.label}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Lihat →</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Circle className="w-4 h-4" />
                        <span className="text-xs font-medium">Mulai →</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Progres onboarding</span>
            <span className="font-semibold text-blue-700">{progress}%</span>
          </div>
          <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}