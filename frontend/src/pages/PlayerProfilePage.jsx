import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { formatAcademicYear } from "../utils/formatters";

const PlayerProfilePage = () => {
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    const fetchPlayer = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/players/${playerId}`
        );
        if (!res.ok) throw new Error("Failed to load player");
        const data = await res.json();
        const raw =
          data?.data?.doc || data?.data?.player || data?.player || data;
        if (!ignore) setPlayer(raw);
      } catch (e) {
        if (!ignore) setError(e.message || "Error loading player");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    if (playerId) fetchPlayer();
    return () => {
      ignore = true;
    };
  }, [playerId]);

  const sortedBids = useMemo(() => {
    if (!player?.bidHistory) return [];
    return [...player.bidHistory]
      .map((b) => ({
        ...b,
        teamId: b.team?._id || b.team?.id || b.team,
        teamName: b.team?.name || b.teamName || "Unknown Team",
        timestamp: b.timestamp || b.createdAt,
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [player]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-gray-400 text-sm animate-pulse">
          Loading player...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4 gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <Link
          to="/"
          className="text-xs font-semibold text-yellow-300 hover:text-yellow-200 underline"
        >
          Back to Auction
        </Link>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4 gap-4">
        <p className="text-gray-400 text-sm">Player not found.</p>
        <Link
          to="/"
          className="text-xs font-semibold text-yellow-300 hover:text-yellow-200 underline"
        >
          Back to Auction
        </Link>
      </div>
    );
  }

  const { name, image, category, year, status, finalBidPrice, isCaptain } =
    player;
  // Resolve leading / winner team name with fallbacks to last bid entry
  let leadingTeamName = player.team?.name || player.teamName || "";
  if (!leadingTeamName && sortedBids.length > 0) {
    leadingTeamName = sortedBids[0].teamName || leadingTeamName;
  }
  // If populated team objects exist in bidHistory (after backend populate) but we still lack teamName strings, patch them
  if (player.bidHistory && player.bidHistory.length) {
    let patched = false;
    player.bidHistory.forEach((b) => {
      if (!b.teamName && b.team && typeof b.team === "object" && b.team.name) {
        b.teamName = b.team.name; // mutate local state object (safe for render)
        patched = true;
      }
    });
    if (patched && import.meta.env?.DEV) {
      console.log(
        "[PlayerProfile] Patched bidHistory with missing teamName values"
      );
    }
  }
  const wasSold = status === "sold" && typeof finalBidPrice === "number";
  const isRetained = !!isCaptain; // treat every captain as retained regardless of status field

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-900 bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 px-3 py-1.5 rounded-lg shadow shadow-yellow-500/30 border border-yellow-400/60 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition-colors"
          >
            <span className="text-lg leading-none">←</span>
            <span>Back</span>
          </Link>
          {wasSold && !isRetained && (
            <div className="text-sm font-semibold text-green-400 bg-green-900/30 rounded-full px-4 py-1 border border-green-500/30 flex items-baseline gap-1">
              <span>Sold for</span>
              <span className="font-bold text-yellow-300 text-base">
                {finalBidPrice}
              </span>
              <span className="text-[10px] font-bold tracking-wide opacity-80">
                Pts
              </span>
            </div>
          )}
          {isRetained && (
            <div className="text-sm font-semibold text-yellow-300 bg-yellow-900/20 rounded-full px-4 py-1 border border-yellow-500/30 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span>Retained Captain</span>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-700 flex flex-col md:flex-row">
          {image && (
            <div className="md:w-1/4 w-full bg-gray-700 aspect-[3/4] md:aspect-auto overflow-hidden max-h-80 md:max-h-none md:self-start">
              <img
                src={image}
                alt={name}
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex-1 p-6 space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-white mb-2">
                  {name}
                </h1>
                <div className="flex items-center gap-3 text-sm font-medium tracking-wide text-yellow-400">
                  <span className="uppercase">{category}</span>
                  {year && <span className="text-gray-500">•</span>}
                  {year && (
                    <span className="text-yellow-300 normal-case">
                      {formatAcademicYear(year)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {!isRetained && (
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${
                      status === "in_auction"
                        ? "border-amber-400/40 text-amber-300 bg-amber-400/10"
                        : status === "sold"
                        ? "border-green-400/40 text-green-300 bg-green-400/10"
                        : "border-gray-400/30 text-gray-300 bg-gray-400/10"
                    }`}
                  >
                    {status?.replace(/_/g, " ")}
                  </span>
                )}
                {wasSold && (
                  <div className="text-sm font-semibold text-yellow-300">
                    Winner: {leadingTeamName || "Unknown Team"}
                  </div>
                )}
                {/* Removed duplicate retained text line; badge above is sufficient */}
              </div>
            </div>

            <div className="bg-gray-900/60 rounded-xl p-5 border border-gray-700 backdrop-blur-sm">
              <h3 className="text-sm uppercase tracking-wider text-gray-400 font-semibold mb-3">
                Bid History
              </h3>
              {sortedBids.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No bids placed.</p>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scroll">
                  {sortedBids.map((bid, index) => {
                    const isLatest = index === 0;
                    return (
                      <li
                        key={bid._id || bid.timestamp}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors border ${
                          isLatest
                            ? "bg-yellow-500/15 border-yellow-400/40 shadow-inner"
                            : "bg-gray-900/40 border-gray-700 hover:bg-gray-900/70"
                        }`}
                      >
                        <span className="text-gray-200 flex items-center gap-2">
                          {isLatest && (
                            <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                          )}
                          {bid.teamName}
                        </span>
                        <span className="text-yellow-300 font-semibold flex items-baseline gap-1">
                          <span>{bid.bidAmount}</span>
                          <span className="text-[10px] font-bold tracking-wide opacity-80">
                            Pts
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfilePage;
