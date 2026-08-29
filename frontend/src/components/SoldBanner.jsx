import React from "react";

export default function SoldBanner({ name, teamName, amount }) {
  return (
    <div className="bg-green-700/90 text-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-green-500 animate-fade-in">
      <h2 className="text-2xl font-black mb-3 tracking-wide">Player Sold</h2>
      <p className="text-lg font-semibold mb-1">
        <span className="text-green-300">{name}</span>
      </p>
      <p className="text-sm text-green-100 mb-4">
        Sold to{" "}
        <span className="font-semibold text-white">{teamName || "—"}</span>
      </p>
      <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400 drop-shadow">
        {amount != null ? `${amount} Pts` : "--"}
      </div>
      <p className="mt-4 text-xs uppercase tracking-wider text-green-200 opacity-80">
        Next player will appear shortly...
      </p>
    </div>
  );
}
