import React from "react";

// YearSelector dumb component
export default function YearSelector({
  yearOptions = [],
  selectedYear,
  onSelectYear,
}) {
  return (
    <div className="w-full flex flex-wrap gap-2 mb-8">
      <div className="inline-flex bg-white/70 backdrop-blur-xl border border-white/50 shadow-md rounded-full p-1 gap-2">
        {yearOptions.map((opt) => {
          const active = selectedYear === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSelectYear && onSelectYear(opt.value)}
              className={`relative px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 focus:outline-none ${
                active
                  ? "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/30 focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
                  : "bg-red-500 text-white font-bold hover:bg-red-400 hover:shadow-lg shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
              }`}
              type="button"
            >
              <span
                className={`flex items-center gap-2 ${
                  active ? "" : "hover:scale-105"
                } transition-transform`}
              >
                {opt.label}
              </span>
              {active && (
                <span className="absolute inset-0 rounded-full ring-2 ring-yellow-300/70 animate-pulseSlow pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
