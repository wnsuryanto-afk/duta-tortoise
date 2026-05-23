import { useTheme } from "@/lib/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light", label: "Terang", icon: Sun },
    { value: "dark", label: "Gelap", icon: Moon },
    { value: "system", label: "Otomatis", icon: Monitor },
  ];

  if (compact) {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    const current = options.find(o => o.value === theme);
    const Icon = current?.icon || Sun;
    return (
      <button
        onClick={() => setTheme(next)}
        className="w-full flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-muted transition-colors text-foreground/80 hover:text-foreground"
        title={`Mode: ${current?.label} — klik untuk ganti`}
      >
        <Icon className="w-4 h-4 text-primary/70" />
        {current?.label} Mode
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            theme === value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}