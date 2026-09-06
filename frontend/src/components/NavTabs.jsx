import React from "react";

export default function NavTabs({ activeTab = "live", onChange }) {
  const tabs = [
    { id: "live", label: "Live Auction Stage", icon: "🏏" },
    { id: "summary", label: "Auction Summary & Rosters", icon: "📊" },
  ];

  return (
    <div className="w-full flex justify-center pt-6 pb-4 px-4 relative z-20">
      <div
        className="inline-flex bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-1.5 rounded-2xl shadow-2xl gap-1.5"
        role="tablist"
        aria-label="Auction views"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange?.(tab.id)}
              className={`relative px-5 sm:px-7 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 focus:outline-none select-none ${
                isActive
                  ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25 font-black scale-[1.02]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <span className="text-base sm:text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-zinc-950/40 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
