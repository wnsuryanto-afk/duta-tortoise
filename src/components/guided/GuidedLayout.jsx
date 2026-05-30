import { useState } from "react";
import { Home, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";
import GuidedHariIni from "./GuidedHariIni";
import GuidedPoinSaya from "./GuidedPoinSaya";
import GuidedProfil from "./GuidedProfil";

const TABS = [
  { id: "hari-ini", label: "Hari Ini", icon: Home },
  { id: "poin",     label: "Poin Saya", icon: Star },
  { id: "profil",   label: "Profil",   icon: User },
];

export default function GuidedLayout({ user, onSwitchToNormal }) {
  const [activeTab, setActiveTab] = useState("hari-ini");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto relative">
      {/* Content area */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === "hari-ini" && <GuidedHariIni user={user} />}
        {activeTab === "poin"     && <GuidedPoinSaya user={user} />}
        {activeTab === "profil"   && <GuidedProfil user={user} onSwitchToNormal={onSwitchToNormal} />}
      </div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 z-50 shadow-[0_-2px_16px_rgba(0,0,0,0.08)]">
        <div className="flex">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 transition-colors",
                  isActive ? "text-green-700" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "fill-green-100 stroke-green-700")} />
                <span className={cn("text-[11px] font-semibold", isActive ? "text-green-700" : "text-gray-400")}>
                  {tab.label}
                </span>
                {isActive && <div className="w-1 h-1 rounded-full bg-green-600 absolute bottom-1" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}