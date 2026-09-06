import React from "react";

export default function SoldBanner({ name, teamName, amount }) {
  return (
    <div className="bg-[#0c101d] text-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-8 w-full max-w-md border border-emerald-500/50 text-center animate-fadeIn space-y-4">
      <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-2xl flex items-center justify-center mx-auto animate-bounce">
        🏆
      </div>
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
          Official Gavel Result
        </span>
        <h2 className="text-3xl font-black tracking-tight text-white font-brand">
          PLAYER SOLD
        </h2>
      </div>

      <div className="py-3 px-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
        <p className="text-xl font-bold text-amber-300">{name}</p>
        <p className="text-xs text-zinc-400">
          Awarded to <strong className="text-white">{teamName || "—"}</strong>
        </p>
      </div>

      <div className="pt-1">
        <span className="text-xs text-zinc-500 uppercase tracking-wider block">
          Winning Bid
        </span>
        <span className="text-4xl font-black font-mono bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
          {amount != null ? `${amount} Pts` : "--"}
        </span>
      </div>

      <p className="text-[11px] text-zinc-500 uppercase tracking-wider pt-2 border-t border-zinc-800">
        Next player will be introduced by the admin shortly...
      </p>
    </div>
  );
}
