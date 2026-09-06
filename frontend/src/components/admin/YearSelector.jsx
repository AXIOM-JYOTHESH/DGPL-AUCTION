import React from "react";

export default function YearSelector({
  yearOptions = [],
  selectedYear,
  onSelectYear,
}) {
  return (
    <div className="w-full flex flex-wrap gap-2 mb-8">
      <div className="inline-flex bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-1.5 rounded-2xl shadow-xl gap-1.5">
        {yearOptions.map((opt) => {
          const active = selectedYear === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSelectYear && onSelectYear(opt.value)}
              className={`relative px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 focus:outline-none ${
                active
                  ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25 font-black scale-[1.02]"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
              type="button"
            >
              <span>{opt.label}</span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-zinc-950/40 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
