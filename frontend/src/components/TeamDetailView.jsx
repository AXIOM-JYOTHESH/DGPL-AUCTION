import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/authContextCore";
import { formatAcademicYear } from "../utils/formatters";

const TeamDetailView = ({
  team,
  teamPlayers = [],
  privacyMode = false,
  auctionCompleted = false,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const userTeamId = user?.team?._id || user?.team;
  const isOwnTeam = Boolean(
    userTeamId && (team?._id === userTeamId || team?.id === userTeamId)
  );

  // Mask other teams' purse and player purchase points if privacy mode is active
  const isConfidential = privacyMode && !auctionCompleted && !isAdmin && !isOwnTeam;

  const formatPts = (val) => (val || val === 0 ? `${val} Pts` : "-");

  const categoryBreakdown = useMemo(() => {
    return teamPlayers.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});
  }, [teamPlayers]);

  const highestBid = useMemo(() => {
    return teamPlayers.reduce(
      (max, p) =>
        !p.isCaptain && p.finalBidPrice > max ? p.finalBidPrice : max,
      0
    );
  }, [teamPlayers]);

  if (!team) return null;

  return (
    <div className="space-y-6">
      {/* Team Title & Privacy Status Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
        <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-transparent bg-clip-text font-brand tracking-tight">
          {team.name}
        </h2>
        {isConfidential && (
          <span className="text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
            <span>🔒</span>
            <span>Privacy Mode Active — Finances Masked</span>
          </span>
        )}
        {isOwnTeam && privacyMode && !auctionCompleted && (
          <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
            <span>🛡️</span>
            <span>Your Team — Unmasked View</span>
          </span>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-[#0c101d] border border-zinc-800/90 rounded-2xl p-5 shadow-xl">
          <h5 className="text-[11px] tracking-wider uppercase font-bold text-zinc-400 mb-1.5">
            Players Acquired
          </h5>
          <p className="text-3xl font-black text-white font-mono">
            {teamPlayers.length}
          </p>
        </div>

        <div className="bg-[#0c101d] border border-zinc-800/90 rounded-2xl p-5 shadow-xl">
          <h5 className="text-[11px] tracking-wider uppercase font-bold text-zinc-400 mb-1.5">
            Remaining Purse
          </h5>
          {isConfidential ? (
            <div className="mt-1">
              <span className="text-sm font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 inline-flex items-center gap-1.5">
                <span>🔒</span>
                <span>Confidential</span>
              </span>
            </div>
          ) : (
            <p className="text-3xl font-black text-amber-400 font-mono">
              {formatPts(team.budget)}
            </p>
          )}
        </div>

        <div className="bg-[#0c101d] border border-zinc-800/90 rounded-2xl p-5 shadow-xl">
          <h5 className="text-[11px] tracking-wider uppercase font-bold text-zinc-400 mb-1.5">
            Highest Bid Paid
          </h5>
          {isConfidential ? (
            <div className="mt-1">
              <span className="text-sm font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 inline-flex items-center gap-1.5">
                <span>🔒</span>
                <span>Confidential</span>
              </span>
            </div>
          ) : (
            <p className="text-3xl font-black text-white font-mono">
              {formatPts(highestBid)}
            </p>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-[#0c101d] border border-zinc-800/90 rounded-2xl p-5 shadow-xl">
        <h5 className="text-[11px] tracking-wider uppercase font-bold text-zinc-400 mb-3">
          Squad Category Breakdown
        </h5>
        {Object.keys(categoryBreakdown).length === 0 && (
          <p className="text-xs text-zinc-500">No players acquired yet.</p>
        )}
        <ul className="flex flex-wrap gap-2.5 text-xs">
          {Object.entries(categoryBreakdown).map(([cat, count]) => (
            <li
              key={cat}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-zinc-200 flex items-center gap-2"
            >
              <span className="text-amber-400 font-black font-mono text-sm">{count}</span>
              <span className="uppercase tracking-wide font-semibold text-[11px] text-zinc-400">
                {cat}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Players List */}
      <div>
        <h3 className="text-base sm:text-lg font-extrabold text-white mb-4 tracking-wide flex items-center gap-2">
          <span>Roster Members</span>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
            {teamPlayers.length}
          </span>
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teamPlayers.map((player) => {
            const isCaptain = player.isCaptain;
            return (
              <div
                key={player._id || player.id}
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
                  to={`/player/${player._id || player.id}`}
                  className="w-16 h-22 sm:w-18 sm:h-24 rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 ring-1 ring-zinc-700/80 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <img
                    src={player.image}
                    alt={player.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-bold text-white truncate tracking-tight">
                    <Link
                      to={`/player/${player._id || player.id}`}
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
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
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
    </div>
  );
};

export default TeamDetailView;
