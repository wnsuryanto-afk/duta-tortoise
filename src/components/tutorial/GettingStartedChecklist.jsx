import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const CHECKLIST_ITEMS = [
  {
    key: "profile",
    label: "Lengkapi profil akun kamu",
    link: null,
    check: (data) => data.profile?.is_complete === true,
  },
  {
    key: "enclosure",
    label: "Tambahkan kandang pertama",
    link: "/tortoise",
    check: (data) => (data.enclosures?.length || 0) > 0,
  },
  {
    key: "tortoise",
    label: "Daftarkan kura-kura pertama",
    link: "/tortoise",
    check: (data) => (data.tortoises?.length || 0) > 0,
  },
  {
    key: "salary",
    label: "Atur konfigurasi gaji",
    link: "/salary",
    check: (data) => (data.salaryConfigs?.length || 0) > 0,
  },
  {
    key: "feedstock",
    label: "Tambahkan stok pakan pertama",
    link: "/feed-stock",
    check: (data) => (data.feedStocks?.length || 0) > 0,
  },
  {
    key: "treatment",
    label: "Buat jadwal treatment pertama",
    link: "/treatment",
    check: (data) => (data.treatments?.length || 0) > 0,
  },
  {
    key: "hr",
    label: "Undang / tambahkan karyawan pertama",
    link: "/users",
    check: (data) => (data.users?.length || 0) > 1,
  },
];

export default function GettingStartedChecklist() {
  const { user } = useCurrentUser();

  const { data: profiles = [] } = useQuery({
    queryKey: ["user-profile", user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });
  const { data: tortoises = [] } = useQuery({
    queryKey: ["tortoises-gs"],
    queryFn: () => base44.entities.Tortoise.list("-created_date", 5),
  });
  const { data: enclosures = [] } = useQuery({
    queryKey: ["enclosures-gs"],
    queryFn: () => base44.entities.Enclosure.list("-created_date", 5),
  });
  const { data: feedStocks = [] } = useQuery({
    queryKey: ["feedstocks-gs"],
    queryFn: () => base44.entities.FeedStock.list("-created_date", 5),
  });
  const { data: treatments = [] } = useQuery({
    queryKey: ["treatments-gs"],
    queryFn: () => base44.entities.TreatmentSchedule.list("-created_date", 5),
  });
  const { data: salaryConfigs = [] } = useQuery({
    queryKey: ["salary-configs-gs"],
    queryFn: () => base44.entities.SalaryConfig.list("-created_date", 5),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users-gs"],
    queryFn: () => base44.entities.User.list(),
  });

  const profile = profiles[0];
  // Only show if tour completed or skipped
  const tourDone = profile?.tour_completed || profile?.tour_skipped;
  
  const data = { profile, tortoises, enclosures, feedStocks, treatments, salaryConfigs, users };
  const completed = CHECKLIST_ITEMS.filter((item) => item.check(data)).length;
  const total = CHECKLIST_ITEMS.length;
  const allDone = completed === total;

  if (!tourDone || allDone) return null;

  const pct = Math.round((completed / total) * 100);

  return (
    <motion.div
      className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="bg-primary/10 px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading font-bold text-primary text-base">🚀 Langkah Awal</h3>
          <span className="text-xs font-semibold text-primary/70 bg-white/60 px-2.5 py-0.5 rounded-full">
            {completed} dari {total} selesai
          </span>
        </div>
        <div className="w-full bg-primary/20 rounded-full h-2">
          <motion.div
            className="bg-primary h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-primary/60 mt-1.5">{pct}% selesai</p>
      </div>

      {/* Checklist */}
      <div className="px-5 py-3 space-y-0.5">
        {CHECKLIST_ITEMS.map((item) => {
          const done = item.check(data);
          const content = (
            <div
              className={`flex items-center gap-3 py-2.5 px-2 rounded-xl transition-colors ${
                done ? "opacity-60" : "hover:bg-primary/10 cursor-pointer"
              }`}
            >
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-primary/30 flex-shrink-0" />
              )}
              <span
                className={`text-sm flex-1 ${
                  done ? "line-through text-muted-foreground" : "text-foreground font-medium"
                }`}
              >
                {item.label}
              </span>
              {!done && item.link && (
                <ChevronRight className="w-4 h-4 text-primary/40" />
              )}
            </div>
          );

          return done || !item.link ? (
            <div key={item.key}>{content}</div>
          ) : (
            <Link key={item.key} to={item.link}>
              {content}
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}