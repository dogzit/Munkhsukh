"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = [
  // Үндсэн
  { id: "dark", label: "Dark", icon: "🌙", group: "Үндсэн" },
  { id: "light", label: "Light", icon: "☀️", group: "Үндсэн" },
  // Тоглоом
  { id: "minecraft", label: "Minecraft", icon: "⛏️", group: "Тоглоом" },
  { id: "cyberpunk", label: "Cyberpunk", icon: "🤖", group: "Тоглоом" },
  { id: "valorant", label: "Valorant", icon: "🎯", group: "Тоглоом" },
  { id: "roblox", label: "Roblox", icon: "🧱", group: "Тоглоом" },
  { id: "impostor", label: "Among Us", icon: "📮", group: "Тоглоом" },
  // Аниме
  { id: "arcane", label: "Arcane", icon: "⚗️", group: "Аниме" },
  { id: "jujutsu", label: "Jujutsu Kaisen", icon: "👁️", group: "Аниме" },
  { id: "onepiece", label: "One Piece", icon: "🏴‍☠️", group: "Аниме" },
  { id: "demonslayer", label: "Demon Slayer", icon: "🗡️", group: "Аниме" },
  { id: "naruto", label: "Naruto", icon: "🍥", group: "Аниме" },
  { id: "ghibli", label: "Ghibli", icon: "🌿", group: "Аниме" },
  // K-Pop
  { id: "blackpink", label: "Blackpink", icon: "🖤", group: "K-Pop" },
  { id: "borahae", label: "BTS", icon: "💜", group: "K-Pop" },
  { id: "newjeans", label: "NewJeans", icon: "👖", group: "K-Pop" },
  { id: "straykids", label: "Stray Kids", icon: "🐺", group: "K-Pop" },
  { id: "stayc", label: "StayC", icon: "🦋", group: "K-Pop" },
  // Цуврал
  { id: "rickmorty", label: "Rick & Morty", icon: "🧪", group: "Цуврал" },
  // Aesthetic
  { id: "ocean", label: "Ocean", icon: "🌊", group: "Aesthetic" },
  { id: "sunset", label: "Sunset", icon: "🌅", group: "Aesthetic" },
  { id: "synthwave", label: "Synthwave", icon: "🎹", group: "Aesthetic" },
  { id: "lofi", label: "Lofi", icon: "🎧", group: "Aesthetic" },
  { id: "y2k", label: "Y2K", icon: "💿", group: "Aesthetic" },
  { id: "cottagecore", label: "Cottagecore", icon: "🌻", group: "Aesthetic" },
  { id: "midnight", label: "Midnight", icon: "🌑", group: "Aesthetic" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

type ThemeContextType = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeId>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setThemeState(saved);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Remove all theme classes
    const html = document.documentElement;
    THEMES.forEach((t) => html.classList.remove(`theme-${t.id}`));
    // Add current theme class
    html.classList.add(`theme-${theme}`);
    // Save to localStorage
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
