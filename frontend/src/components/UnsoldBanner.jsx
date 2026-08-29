import React from "react";

export default function UnsoldBanner({ name }) {
  return (
    <div className="bg-red-700/90 text-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-red-500 animate-fade-in">
      <h2 className="text-2xl font-black mb-3 tracking-wide">Player Unsold</h2>
      <p className="text-lg font-semibold mb-2">
        <span className="text-red-200">{name}</span>
      </p>
      <p className="mt-2 text-xs uppercase tracking-wider text-red-100 opacity-90">
        Next player will appear shortly...
      </p>
    </div>
  );
}
