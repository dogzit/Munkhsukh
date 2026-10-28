"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Loader2 } from "lucide-react";
import AppHeader from "@/app/_components/AppHeader";

type Row = {
  name: string;
  fullName: string | null;
  avatar: string | null;
  win: number;
  draw: number;
  loss: number;
  total: number;
};

const MEDAL = ["🥇", "🥈", "🥉"];

export default function XoLeaderboardPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/xo/leaderboard", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      <AppHeader
        title="X O тэргүүлэгчид"
        subtitle="Одоогоос эхэлсэн тулаануудаар"
        onBack={() => router.push("/xo")}
        icon={
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Trophy size={15} className="text-white" />
          </span>
        }
      />

      <div className="px-3 py-4 sm:p-6">
        <div className="max-w-md mx-auto">
          {!rows ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-on-surface-muted" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-sm text-on-surface-muted py-16">
              Одоогоор дууссан тулаан алга
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div
                  key={r.name}
                  className="flex items-center gap-3 bg-surface-elevated border border-border rounded-2xl p-3"
                >
                  <span className="w-7 text-center text-sm font-black text-on-surface-muted shrink-0">
                    {MEDAL[i] ?? i + 1}
                  </span>
                  <span className="relative shrink-0 w-10 h-10">
                    <span className="w-full h-full rounded-full overflow-hidden bg-accent/15 flex items-center justify-center text-accent text-xs font-black">
                      {r.avatar ? (
                        <img src={r.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (r.fullName || r.name)[0]?.toUpperCase()
                      )}
                    </span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{r.fullName || r.name}</p>
                    <p className="text-[10px] text-on-surface-muted">
                      {r.win} ялалт · {r.draw} тэнцэл · {r.loss} хожигдол
                    </p>
                  </div>
                  <span className="text-lg font-black text-emerald-400 tabular-nums shrink-0">{r.win}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
