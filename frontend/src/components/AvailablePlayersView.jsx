import React from "react";
import { Link } from "react-router-dom";
import { formatAcademicYear } from "../utils/formatters";

const AvailablePlayersView = ({ availablePlayers = [] }) => {
  const formatPts = (val) => (val || val === 0 ? `${val} Pts` : "-");
  const sorted = availablePlayers
    .slice()
    .sort(
      (a, b) => (b.year || 0) - (a.year || 0) || a.name.localeCompare(b.name)
    );
  return (
    <div>
      {sorted.length === 0 && (
        <p className="text-sm text-gray-400 mb-2">No available players.</p>
      )}
      {/* Use explicit single column on mobile so cards stretch full width instead of shrinking to content */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((player) => {
          const isCaptain = !!player.isCaptain;
          return (
            <div
              key={player._id || player.name}
              className={`relative w-full flex items-center gap-4 sm:gap-5 bg-gradient-to-r from-gray-800/85 to-gray-900/85 border rounded-2xl p-4 transition-all duration-300 ${
                isCaptain
                  ? "border-yellow-500/70 hover:border-yellow-400 hover:shadow-yellow-500/10"
                  : "border-gray-700 hover:border-indigo-400/60 hover:shadow-indigo-500/10"
              }`}
            >
              {isCaptain && (
                <span className="absolute -top-3 -left-3 bg-yellow-500 text-gray-900 text-xs font-extrabold px-2 py-1 rounded-full shadow shadow-yellow-500/30">
                  C
                </span>
              )}
              <Link
                to={`/player/${player._id}`}
                className="w-14 h-20 sm:w-16 sm:h-24 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 ring-1 ring-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <img
                  src={player.image}
                  alt={player.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm sm:text-base md:text-lg font-semibold text-white truncate tracking-wide">
                  <Link
                    to={`/player/${player._id}`}
                    className="hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-sm"
                    title={player.name}
                  >
                    {player.name}
                  </Link>
                </h4>
                <div className="text-[11px] sm:text-xs md:text-sm text-gray-300 mt-1 flex flex-wrap gap-2 leading-relaxed">
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
                  {isCaptain && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="text-yellow-400 font-semibold tracking-wide">
                        Captain
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right flex flex-col items-end flex-shrink-0">
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
                    <span className="text-base sm:text-lg md:text-xl font-extrabold text-indigo-400 tracking-wide whitespace-nowrap">
                      {formatPts(player.basePrice)}
                    </span>
                    <span className="mt-0.5 text-[9px] sm:text-[10px] md:text-[11px] uppercase text-indigo-400/70 font-semibold tracking-wider">
                      Base
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

export default AvailablePlayersView;
