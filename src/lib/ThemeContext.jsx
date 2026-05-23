import { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("duta_theme") || "light";
  });

  // Load from profile on mount
  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();
        if (!user?.email) return;
        const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
        if (profiles.length > 0 && profiles[0].theme_preference) {
          const saved = profiles[0].theme_preference;
          if (saved !== localStorage.getItem("duta_theme")) {
            setThemeState(saved);
            localStorage.setItem("duta_theme", saved);
          }
        }
      } catch {
        // silent fail — use localStorage fallback
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTheme = (t) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
    } else if (t === "light") {
      root.classList.remove("dark");
    } else {
      // system
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) root.classList.add("dark");
      else root.classList.remove("dark");
    }
  };

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("duta_theme", theme);

    // Save to UserProfile asynchronously
    const save = async () => {
      try {
        const user = await base44.auth.me();
        if (!user?.email) return;
        const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
        if (profiles.length > 0) {
          await base44.entities.UserProfile.update(profiles[0].id, { theme_preference: theme });
        }
      } catch {
        // silent fail
      }
    };
    save();
  }, [theme]);

  // listen to system changes when theme === "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}