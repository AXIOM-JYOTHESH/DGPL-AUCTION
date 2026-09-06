import React from "react";

export default function UnsoldBanner({ name }) {
  return (
    <div className="bg-[#0c101d] text-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-8 w-full max-w-md border border-zinc-800 text-center animate-fadeIn space-y-4">
      <div className="w-12 h-12 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700 text-xl flex items-center justify-center mx-auto">
        ✖️
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">
          Auction Result
        </span>
        <h2 className="text-2xl font-black tracking-tight text-white font-brand">
          PLAYER UNSOLD
        </h2>
      </div>

      <div className="py-2.5 px-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
        <p className="text-lg font-bold text-zinc-300">{name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">Player returned to unsold pool</p>
      </div>

      <p className="text-[11px] text-zinc-500 uppercase tracking-wider pt-2 border-t border-zinc-800">
        Next player will be introduced shortly...
      </p>
    </div>
  );
}
