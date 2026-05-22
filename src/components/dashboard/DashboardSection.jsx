import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function DashboardSection({ title, icon: Icon, children, defaultOpen = true, canCollapse = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="space-y-3">
      {canCollapse ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-lg font-heading font-semibold text-foreground hover:text-primary transition-colors w-full"
        >
          {Icon && <Icon className="w-5 h-5" />}
          <span>{title}</span>
          {isOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
        </button>
      ) : (
        <div className="flex items-center gap-2 text-lg font-heading font-semibold text-foreground">
          {Icon && <Icon className="w-5 h-5" />}
          <span>{title}</span>
        </div>
      )}
      
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </section>
  );
}