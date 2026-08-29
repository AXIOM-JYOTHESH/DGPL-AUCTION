import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { formatAcademicYear } from "../utils/formatters";

const TeamDetailView = ({ team, teamPlayers = [] }) => {
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
    <div>
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-transparent bg-clip-text mb-6 tracking-wide">
        {team.name}
      </h2>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4">
          <h5 className="text-xs tracking-wider uppercase text-gray-400 mb-1">
            Players Bought
          </h5>
          <p className="text-2xl font-bold text-white">{teamPlayers.length}</p>
        </div>
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4">
          <h5 className="text-xs tracking-wider uppercase text-gray-400 mb-1">
            Remaining Budget
          </h5>
          <p className="text-2xl font-bold text-yellow-400">
            {formatPts(team.budget)}
          </p>
        </div>
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4">
          <h5 className="text-xs tracking-wider uppercase text-gray-400 mb-1">
            Highest Bid
          </h5>
          <p className="text-2xl font-bold text-white">
            {formatPts(highestBid)}
          </p>
        </div>
      </div>
      <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-5 mb-10">
        <h5 className="text-xs tracking-wider uppercase text-gray-400 mb-3">
          Category Breakdown
        </h5>
        {Object.keys(categoryBreakdown).length === 0 && (
          <p className="text-sm text-gray-500">No players found.</p>
        )}
        <ul className="flex flex-wrap gap-4 text-sm">
          {Object.entries(categoryBreakdown).map(([cat, count]) => (
            <li
              key={cat}
              className="px-3 py-1 rounded-full bg-gray-800 border border-gray-600 text-gray-200 flex items-center gap-2"
            >
              <span className="text-yellow-400 font-semibold">{count}</span>
              <span className="uppercase tracking-wide text-xs text-gray-400">
                {cat}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <h3 className="text-lg font-semibold text-white mb-4 tracking-wide">
        Players ({teamPlayers.length})
      </h3>
      {/* Single column on mobile for full-width rows */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teamPlayers.map((player) => {
          const isCaptain = player.isCaptain;
          return (
            <div
              key={player._id}
              className={`relative w-full flex items-center gap-5 bg-gradient-to-r from-gray-800/85 to-gray-900/85 border rounded-2xl p-4 transition-all duration-300 ${
                isCaptain
                  ? "border-yellow-500/70 hover:border-yellow-400 hover:shadow-yellow-500/10"
                  : "border-gray-700 hover:border-emerald-500/60 hover:shadow-emerald-500/10"
              }`}
            >
              {isCaptain && (
                <span className="absolute -top-3 -left-3 bg-yellow-500 text-gray-900 text-xs font-extrabold px-2 py-1 rounded-full shadow shadow-yellow-500/30">
                  C
                </span>
              )}
              <Link
                to={`/player/${player._id}`}
                className="w-16 h-24 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 ring-1 ring-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <img
                  src={player.image}
                  alt={player.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <h4 className="text-base sm:text-lg font-semibold text-white truncate tracking-wide">
                  <Link
                    to={`/player/${player._id}`}
                    className="hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-sm"
                  >
                    {player.name}
                  </Link>
                </h4>
                <div className="text-xs sm:text-sm text-gray-300 mt-1 flex flex-wrap gap-2 leading-relaxed">
                  <span className="text-yellow-400 font-semibold tracking-wide">
                    {player.category}
                  </span>
                  {player.year && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-200 font-medium">
                        {formatAcademicYear(player.year)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                {isCaptain ? (
                  <>
                    <span className="text-xs sm:text-sm font-semibold text-yellow-400 tracking-wide">
                      Captain
                    </span>
                    <span className="mt-0.5 text-[10px] sm:text-[11px] uppercase text-yellow-500/70 font-semibold tracking-wider">
                      Retained
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-lg sm:text-xl font-extrabold text-emerald-400 tracking-wide">
                      {formatPts(player.finalBidPrice)}
                    </span>
                    <span className="mt-0.5 text-[10px] sm:text-[11px] uppercase text-emerald-500/70 font-semibold tracking-wider">
                      Bid
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

export default TeamDetailView;
