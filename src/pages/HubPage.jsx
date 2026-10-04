/**
 * HubPage — satu halaman untuk semua area (Kura, Operasional, Stok, Uang, Orang).
 *
 * Menggantikan submenu bertingkat di sidebar: alih-alih daftar teks kecil,
 * pengguna melihat kartu besar dengan keterangan singkat. Lebih mudah dibaca
 * di HP, dan tidak menuntut orang menghafal isi menu.
 *
 * Isi kartu diambil dari src/lib/navigation.js dan disaring per hak akses.
 */
import { Link, useParams, Navigate } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useViewAs } from "@/lib/ViewAsContext";
import PageHeader from "@/components/common/PageHeader";

export default function HubPage() {
  const { areaId } = useParams();
  const { role: realRole } = useCurrentUser();
  const { viewAsRole, isViewingAs } = useViewAs();
  const role = isViewingAs && viewAsRole ? viewAsRole : realRole;

  const section = NAV_SECTIONS.find((s) => s.id === areaId);
  if (!section) return <Navigate to="/" replace />;

  const items = section.items.filter((i) => canAccess(role, i.section));
  const Icon = section.icon;

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title={section.label} subtitle={section.blurb} icon={Icon} />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Tidak ada halaman di area ini yang dapat kamu akses.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="group flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <ItemIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">{item.label}</p>
                  {item.desc && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            );
          })}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
        <Search className="w-3.5 h-3.5" />
        Tekan Ctrl+K untuk melompat langsung ke halaman mana pun tanpa lewat menu.
      </p>
    </div>
  );
}
