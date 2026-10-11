"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { useTheme, THEMES } from "./ThemeProvider";

// Group themes by their group field
function groupedThemes() {
  const groups: { label: string; items: typeof THEMES[number][] }[] = [];
  const seen = new Set<string>();
  for (const t of THEMES) {
    if (!seen.has(t.group)) {
      seen.add(t.group);
      groups.push({ label: t.group, items: [] });
    }
    groups.find((g) => g.label === t.group)!.items.push(t);
  }
  return groups;
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const current = THEMES.find((t) => t.id === theme);
  const groups = groupedThemes();

  return (
    <div className="relative hover:cursor-pointer">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-surface-elevated border border-border
          hover:scale-110 active:scale-95 transition-all duration-200
          text-on-surface-muted hover:text-on-surface flex items-center gap-1.5"
        aria-label="Theme сонгох"
      >
        <span className="text-sm">{current?.icon}</span>
        <Palette size={14} className="hidden sm:block" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 z-50 w-52
            bg-surface border border-border rounded-2xl shadow-2xl
            max-h-[70vh] overflow-y-auto">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-on-surface-muted/60">
                  {group.label}
                </div>
                {group.items.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all
                      hover:bg-card-hover
                      ${theme === t.id
                        ? "text-accent font-bold bg-accent-glow"
                        : "text-on-surface-muted hover:text-on-surface"
                      }`}
                  >
                    <span className="text-base">{t.icon}</span>
                    <span className="truncate">{t.label}</span>
                    {theme === t.id && (
                      <span className="ml-auto text-accent text-xs">●</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
