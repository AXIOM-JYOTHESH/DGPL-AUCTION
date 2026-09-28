import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContextCore";
import { formatAcademicYear } from "../utils/formatters";
import { handleImageError } from "../utils/imageHelper";

const AvailablePlayersView = ({ availablePlayers = [] }) => {
  const { user } = useAuth();
  const storageKey = user?._id ? `dgpl_pinned_${user._id}` : "dgpl_pinned_players";

  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Re-sync if user changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setPinnedIds(JSON.parse(saved));
      else setPinnedIds([]);
    } catch {
      setPinnedIds([]);
    }
  }, [storageKey]);

  const togglePin = (playerId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [playerId, ...prev];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {
        console.warn("Failed to persist pinned players", err);
      }
      return next;
    });
  };

  const formatPts = (val) => (val || val === 0 ? `${val} Pts` : "-");

  // Pinned players first, then year desc, then name
  const sorted = availablePlayers.slice().sort((a, b) => {
    const aId = a._id || a.id;
    const bId = b._id || b.id;
    const aPinned = pinnedIds.includes(aId) ? 1 : 0;
    const bPinned = pinnedIds.includes(bId) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return (b.year || 0) - (a.year || 0) || a.name.localeCompare(b.name);
  });

  const pinnedCount = availablePlayers.filter((p) =>
    pinnedIds.includes(p._id || p.id)
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Watchlist info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0c101d] border border-amber-500/20 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl">
            📌
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide flex items-center gap-2">
              <span>Player Auction Pool</span>
              {pinnedCount > 0 && (
                <span className="bg-gradient-to-r from-amber-400 to-yellow-400 text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                  {pinnedCount} Targeted
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400">
              Pin players to float them to the top of your private bidding board.
            </p>
          </div>
        </div>

        {pinnedCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setPinnedIds([]);
              localStorage.removeItem(storageKey);
            }}
            className="text-xs text-zinc-400 hover:text-red-400 font-semibold transition"
          >
            Clear All Pinned ({pinnedCount})
          </button>
        )}
      </div>

      {sorted.length === 0 && (
        <div className="bg-[#0c101d] border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400">
          No available players in pool.
        </div>
      )}

      {/* Grid of Players */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((player) => {
          const pId = player._id || player.id;
          const isPinned = pinnedIds.includes(pId);
          const isCaptain = !!player.isCaptain;

          return (
            <div
              key={pId || player.name}
              className={`relative w-full flex items-center gap-4 bg-[#0c101d] border rounded-2xl p-4 transition-all duration-300 shadow-lg ${
                isPinned
                  ? "border-amber-400/80 bg-gradient-to-r from-amber-500/10 via-[#0c101d] to-[#0c101d] shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/40"
                  : isCaptain
                  ? "border-yellow-500/40 hover:border-yellow-400"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {/* Captain Badge */}
              {isCaptain && (
                <span className="absolute -top-2.5 -left-2.5 bg-yellow-400 text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                  CAPTAIN
                </span>
              )}

              {/* Pin Action Button on Top-Right */}
              <button
                type="button"
                title={isPinned ? "Unpin player" : "Pin player to top of your pool"}
                onClick={(e) => togglePin(pId, e)}
                className={`absolute top-3 right-3 p-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1 ${
                  isPinned
                    ? "bg-amber-400 text-zinc-950 shadow-md ring-1 ring-amber-300"
                    : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700"
                }`}
              >
                <span>📌</span>
                <span className="text-[10px] uppercase tracking-wider">
                  {isPinned ? "Targeted" : "Pin"}
                </span>
              </button>

              {/* Player Image */}
              <Link
                to={`/player/${pId}`}
                className="w-16 h-22 sm:w-18 sm:h-24 rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 ring-1 ring-zinc-700/80 focus:outline-none focus:ring-2 focus:ring-amber-400 relative"
              >
                <img
                  src={player.image}
                  alt={player.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                  onError={(e) => handleImageError(e, player.image)}
                />
              </Link>

              {/* Player Info */}
              <div className="flex-1 min-w-0 pr-16">
                <h4 className="text-base sm:text-lg font-bold text-white truncate tracking-tight">
                  <Link
                    to={`/player/${pId}`}
                    className="hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-sm"
                    title={player.name}
                  >
                    {player.name}
                  </Link>
                </h4>

                <div className="text-xs text-zinc-400 mt-1 flex flex-wrap gap-2 items-center">
                  <span className="text-amber-400 font-semibold">
                    {player.category}
                  </span>
                  {player.year && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-300">
                        {formatAcademicYear(player.year)}
                      </span>
                    </>
                  )}
                </div>

                {/* Base price tag */}
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-xs text-zinc-400 uppercase font-semibold">
                    Base:
                  </span>
                  <span className="text-sm sm:text-base font-black font-mono text-amber-300">
                    {formatPts(player.basePrice)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AvailablePlayersView;
