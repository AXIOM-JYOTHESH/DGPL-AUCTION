import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContextCore";
import { formatAcademicYear } from "../utils/formatters";
import { handleImageError } from "../utils/imageHelper";

const RecentSoldView = ({
  soldPlayers = [],
  teamMap,
  privacyMode = false,
  auctionCompleted = false,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const userTeamId = user?.team?._id || user?.team;

  const formatPts = (val) => (val || val === 0 ? `${val} Pts` : "-");

  return (
    <div className="space-y-4">
      {soldPlayers.length === 0 && (
        <div className="bg-[#0c101d] border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400">
          No players have been sold yet.
        </div>
      )}

      {/* Grid of Sold Players */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {soldPlayers.map((player) => {
          const isCaptain = player.isCaptain;
          const pId = player._id || player.id;

          // Derive team name
          const pTeamId = player.team?._id || player.team?.id || player.team;
          let teamName =
            (pTeamId && teamMap.get(pTeamId)?.name) ||
            player.teamName ||
            "";
          if (!teamName && player.bidHistory && player.bidHistory.length) {
            const last = player.bidHistory[player.bidHistory.length - 1];
            teamName = last.teamName || last.team?.name || teamName;
          }

          const isOwnTeam = Boolean(userTeamId && pTeamId && String(pTeamId) === String(userTeamId));
          const isConfidential = privacyMode && !auctionCompleted && !isAdmin && !isOwnTeam;

          return (
            <div
              key={pId}
              className={`relative w-full flex items-center gap-4 bg-[#0c101d] border rounded-2xl p-4 transition-all duration-300 shadow-lg ${
                isCaptain
                  ? "border-yellow-500/50 hover:border-yellow-400"
                  : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {isCaptain && (
                <span className="absolute -top-2.5 -left-2.5 bg-yellow-400 text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                  CAPTAIN
                </span>
              )}

              <Link
                to={`/player/${pId}`}
                className="w-16 h-22 sm:w-18 sm:h-24 rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 ring-1 ring-zinc-700/80 focus:outline-none focus:ring-2 focus:ring-amber-400"
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

              <div className="flex-1 min-w-0">
                <h4 className="text-base sm:text-lg font-bold text-white truncate tracking-tight">
                  <Link
                    to={`/player/${pId}`}
                    className="hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-sm"
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
                  {teamName && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="text-amber-300/90 font-medium">
                        {teamName}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="text-right flex flex-col items-end flex-shrink-0">
                {isCaptain ? (
                  <>
                    <span className="text-xs font-bold text-yellow-400 tracking-wide">
                      Captain
                    </span>
                    <span className="mt-0.5 text-[10px] uppercase text-yellow-500/70 font-semibold tracking-wider">
                      Retained
                    </span>
                  </>
                ) : isConfidential ? (
                  <>
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      🔒 Confidential
                    </span>
                    <span className="mt-0.5 text-[10px] uppercase text-zinc-500 font-semibold tracking-wider">
                      Acquired
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-base sm:text-lg font-black font-mono text-emerald-400 tracking-tight">
                      {formatPts(player.finalBidPrice)}
                    </span>
                    <span className="mt-0.5 text-[10px] uppercase text-emerald-500/70 font-semibold tracking-wider">
                      Bid Paid
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentSoldView;
