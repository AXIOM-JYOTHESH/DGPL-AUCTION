import React from "react";

const baseBtn =
  "relative px-7 py-3 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:opacity-50";

const NavTabs = ({ activeTab = "live", onChange }) => {
  const isActive = (tab) => activeTab === tab;
  return (
    <div className="w-full flex justify-center pt-6 pb-4 px-4">
      <div
        className="inline-flex bg-white/60 backdrop-blur-xl border border-white/40 shadow-md rounded-full p-1 gap-2"
        role="tablist"
        aria-label="Auction navigation"
      >
        <button
          role="tab"
          aria-selected={isActive("live")}
          aria-pressed={isActive("live")}
          tabIndex={isActive("live") ? 0 : -1}
          onClick={() => onChange && onChange("live")}
          className={`${baseBtn} ${
            isActive("live")
              ? "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/30"
              : "!bg-black !text-white hover:!bg-gray-800"
          }`}
        >
          <span
            className={`flex items-center gap-2 ${
              isActive("live") ? "" : "hover:scale-105"
            } transition-transform`}
          >
            <span className="text-lg">🏏</span>
            <span className="font-medium tracking-wide">Live Auction</span>
          </span>
          {isActive("live") && (
            <span className="absolute inset-0 rounded-full ring-2 ring-yellow-300/70 animate-pulseSlow pointer-events-none" />
          )}
        </button>
        <button
          role="tab"
          aria-selected={isActive("summary")}
          aria-pressed={isActive("summary")}
          tabIndex={isActive("summary") ? 0 : -1}
          onClick={() => onChange && onChange("summary")}
          className={`${baseBtn} ${
            isActive("summary")
              ? "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/30"
              : "!bg-black !text-white hover:!bg-gray-800"
          }`}
        >
          <span
            className={`flex items-center gap-2 ${
              isActive("summary") ? "" : "hover:scale-105"
            } transition-transform`}
          >
            <span className="text-lg">📊</span>
            <span className="font-medium tracking-wide">Auction Summary</span>
          </span>
          {isActive("summary") && (
            <span className="absolute inset-0 rounded-full ring-2 ring-yellow-300/70 animate-pulseSlow pointer-events-none" />
          )}
        </button>
      </div>
    </div>
  );
};

export default NavTabs;
