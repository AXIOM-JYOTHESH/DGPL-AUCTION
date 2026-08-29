import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/authContextCore";
import { useSocket } from "../context/useSocket";
import { formatAcademicYear } from "../utils/formatters";
import CurrentPlayerSkeleton from "./CurrentPlayerSkeleton";

// Local helper component to log server bid errors
const BidErrorListener = ({ socket }) => {
  React.useEffect(() => {
    const handler = (payload) => {
      console.warn("[Bid][Client] server:bid_error", payload);
    };
    socket.on("server:bid_error", handler);
    return () => socket.off("server:bid_error", handler);
  }, [socket]);
  return null;
};

/**
 * CurrentPlayer component
 * Displays details of the player currently in auction.
 * Fetches next unsold player dynamically from backend.
 */
const CurrentPlayer = ({ player: livePlayer, teams = [] }) => {
  useEffect(() => {
    if (livePlayer) {
      console.log(
        "[CurrentPlayer] Received livePlayer prop id:",
        livePlayer._id,
        "name:",
        livePlayer.name
      );
    } else {
      console.log("[CurrentPlayer] No livePlayer prop provided");
    }
  }, [livePlayer]);
  const { isAuthenticated, user } = useAuth();
  const { socket } = useSocket() || {};
  // Fallback fetching disabled for debugging real-time path
  const [fetchedPlayer] = useState(null);
  const [loading, setLoading] = useState(!livePlayer);
  const [error] = useState(null);

  // If a live player (in_auction) is supplied via props, prefer it.
  const player = livePlayer || fetchedPlayer;

  // Fallback fetch ONLY when no live player is supplied (legacy behavior)
  // TEMP: Disable fallback loading to isolate real-time update issue
  useEffect(() => {
    if (livePlayer) setLoading(false);
    else setLoading(false);
  }, [livePlayer]);

  const sortedBids = useMemo(() => {
    if (!player?.bidHistory) return [];
    return [...player.bidHistory].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [player]);

  if (loading) return <CurrentPlayerSkeleton />; // still show skeleton during initial mount
  if (error)
    return (
      <div className="bg-gray-800 text-gray-300 rounded-xl shadow-lg p-6">
        <p className="text-center text-red-400">{error}</p>
      </div>
    );
  if (!player)
    return (
      <div className="bg-gray-800 text-gray-300 rounded-xl shadow-lg p-6">
        <p className="text-center">Waiting for the next player...</p>
      </div>
    );

  const { name, image, category, year } = player;
  const currentBidRaw = player.finalBidPrice ?? player.basePrice ?? null;
  const currentBid = currentBidRaw != null ? Number(currentBidRaw) : null;
  const leadingTeamName = player.teamName || "";
  // Helper: compute next bid using backend tiered rules
  const computeNextBidAmount = (amount) => {
    if (amount == null) return null;
    const n = Number(amount);
    if (Number.isNaN(n)) return null;
    let inc;
    if (n < 5) inc = 0.25;
    else if (n < 10) inc = 0.5;
    else inc = 1;
    return Number((n + inc).toFixed(2));
  };
  const hasBids = sortedBids.length > 0;
  let nextBidNumeric = null;
  if (!hasBids) {
    // First bid equals the base price
    nextBidNumeric =
      typeof player.basePrice === "number"
        ? Number(player.basePrice)
        : player.basePrice != null
        ? Number(player.basePrice)
        : null;
  } else {
    const basisAmount = Number(sortedBids[0]?.bidAmount ?? currentBid);
    nextBidNumeric =
      basisAmount != null && !Number.isNaN(basisAmount)
        ? computeNextBidAmount(basisAmount)
        : null;
  }
  const nextBidAmount =
    nextBidNumeric != null
      ? nextBidNumeric.toFixed(2).replace(/\.00$/, "")
      : null;

  // Accept legacy or alternate role naming: 'team-owner' or 'captain'
  const isTeamOwner =
    isAuthenticated &&
    (user?.role === "team-owner" || user?.role === "captain");

  const handleBid = () => {
    if (!socket || !player?._id) {
      console.log("[Bid][Client] Cannot emit: socket or player missing", {
        hasSocket: !!socket,
        playerId: player?._id,
      });
      return;
    }
    console.log(
      "[Bid][Client] Emitting captain:place_bid for player",
      player._id
    );
    try {
      socket.emit("captain:place_bid", { playerId: player._id });
    } catch (e) {
      // swallow emit errors (could add toast later)
      console.error("Bid emit failed", e);
    }
  };

  // Determine if this user is the current leading bidder (so they cannot bid again immediately)
  const latestBid = sortedBids[0];
  const userTeamId = user?.team?._id || user?.team; // support either populated object or raw id
  const leadingBidTeamId =
    latestBid?.team?._id ||
    latestBid?.team ||
    player?.team?._id ||
    player?.team;
  const isLeadingTeam = Boolean(
    userTeamId && leadingBidTeamId && userTeamId === leadingBidTeamId
  );

  // Resolve full team object from passed teams prop for accurate live budget
  const fullUserTeam = teams.find(
    (t) => (t._id || t.id) === (userTeamId || "")
  );
  const userTeamBudget = fullUserTeam?.budget ?? user?.team?.budget ?? null;
  const isOutOfBudget =
    isTeamOwner &&
    nextBidNumeric != null &&
    typeof userTeamBudget === "number" &&
    userTeamBudget < nextBidNumeric;
  if (isOutOfBudget && import.meta.env?.DEV) {
    console.log(
      "[CurrentPlayer] Out of budget: teamBudget=%s nextBid=%s",
      userTeamBudget,
      nextBidNumeric
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden max-w-md w-full border border-gray-700">
      {/* Bid error listener registration */}
      {socket && <BidErrorListener socket={socket} />}
      {/* Player Image */}
      {image && (
        <div className="aspect-[3/4] w-full overflow-hidden bg-gray-700">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-6 space-y-5">
        {/* Meta */}
        <div className="text-sm font-medium tracking-wide text-yellow-400 flex items-center gap-2">
          <span className="uppercase">{category}</span>
          {year && <span className="text-gray-500">•</span>}
          {year && (
            <span className="text-yellow-300 normal-case">
              {formatAcademicYear(year)}
            </span>
          )}
        </div>

        {/* Name */}
        <h2 className="text-3xl font-extrabold text-white leading-tight drop-shadow-sm">
          {name}
        </h2>

        {/* Current Bid Section */}
        <div className="bg-gray-900/60 rounded-xl p-5 border border-gray-700 backdrop-blur-sm">
          <h3 className="text-sm uppercase tracking-wider text-gray-400 font-semibold mb-2">
            Current Bid
          </h3>
          <div className="flex items-end gap-4 flex-wrap">
            <span className="flex items-baseline gap-1 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 drop-shadow">
              <span className="text-4xl font-black leading-none">
                {currentBid != null ? currentBid : "--"}
              </span>
              {currentBid != null && (
                <span className="text-xl font-extrabold tracking-wide opacity-90">
                  Pts
                </span>
              )}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-400 uppercase">
                Leading Team
              </span>
              <span className="text-base font-semibold text-yellow-300">
                {leadingTeamName || "—"}
              </span>
            </div>
            {isTeamOwner && (
              <div className="flex flex-col ml-auto text-right">
                <span className="text-xs font-semibold text-gray-400 uppercase">
                  Your Budget
                </span>
                <span
                  className={`text-sm font-semibold ${
                    isOutOfBudget ? "text-red-400" : "text-green-300"
                  }`}
                >
                  {typeof userTeamBudget === "number"
                    ? `${userTeamBudget.toFixed(2).replace(/\.00$/, "")} Pts`
                    : "—"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bid History */}
        <div>
          <h3 className="text-sm uppercase tracking-wider text-gray-400 font-semibold mb-3">
            Bid History
          </h3>
          {sortedBids.length === 0 && (
            <p className="text-gray-500 text-sm italic">No bids yet.</p>
          )}
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scroll">
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
                    {bid.teamName || "Unknown Team"}
                  </span>
                  <span className="text-yellow-300 font-semibold flex items-baseline gap-1">
                    <span>{bid.bidAmount}</span>
                    <span className="text-xs font-bold tracking-wide opacity-80">
                      Pts
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {isTeamOwner && (
          <div className="pt-4">
            <div className="relative">
              {isOutOfBudget && (
                <div className="absolute -top-6 left-0 w-full text-center text-xs font-semibold text-red-500">
                  Out of budget
                </div>
              )}
              <button
                onClick={
                  !isLeadingTeam && !isOutOfBudget ? handleBid : undefined
                }
                disabled={isLeadingTeam || isOutOfBudget}
                className={`relative w-full py-4 rounded-2xl font-extrabold text-gray-900 text-xl flex items-center justify-center gap-5 overflow-hidden border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.97]
                ${
                  isLeadingTeam
                    ? "bg-gradient-to-r from-yellow-200 via-amber-200 to-yellow-300 border-amber-300/70 cursor-not-allowed shadow-inner shadow-amber-400/20 focus:ring-amber-300/50 text-gray-800"
                    : isOutOfBudget
                    ? "bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400 border-gray-300 cursor-not-allowed text-gray-700"
                    : "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 border-amber-300/60 shadow-lg shadow-amber-500/40 hover:shadow-amber-500/60 hover:brightness-110 focus:ring-amber-400/70"
                }`}
                type="button"
              >
                <span
                  className={`tracking-wide leading-none font-black text-[1.7rem] drop-shadow-sm ${
                    isLeadingTeam ? "text-black" : ""
                  }`}
                >
                  {isLeadingTeam
                    ? "Leading"
                    : isOutOfBudget
                    ? "Insufficient Funds"
                    : "Bid"}
                </span>
                {!isLeadingTeam && nextBidAmount && (
                  <span
                    className={`relative flex items-center gap-2 px-5 py-2 rounded-xl border shadow-md shadow-amber-700/20 before:absolute before:inset-0 before:rounded-xl before:p-px before:content-[''] before:-z-0 overflow-hidden ${
                      isOutOfBudget
                        ? "bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 border-gray-300 before:bg-gradient-to-r before:from-gray-200/60 before:to-gray-300/60 text-gray-700"
                        : "bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-300 border-amber-400/60 before:bg-gradient-to-r before:from-amber-300/60 before:to-yellow-400/60 text-black/85"
                    }`}
                  >
                    <span className="relative z-10 flex items-end gap-1 leading-none">
                      <span className="text-[1.15rem] font-black tracking-tight">
                        {nextBidAmount}
                      </span>
                      <span className="text-base font-extrabold opacity-75 translate-y-[1px]">
                        Pts
                      </span>
                    </span>
                  </span>
                )}
                {/* subtle animated sheen */}
                {!isLeadingTeam && !isOutOfBudget && (
                  <span className="pointer-events-none absolute -left-10 top-0 h-full w-1/3 bg-gradient-to-r from-white/20 via-white/40 to-transparent skew-x-[-25deg] animate-[shine_3s_linear_infinite] mix-blend-overlay" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentPlayer;
