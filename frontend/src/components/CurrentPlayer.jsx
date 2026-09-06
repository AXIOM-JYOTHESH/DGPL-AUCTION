import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/authContextCore";
import { useSocket } from "../context/useSocket";
import { formatAcademicYear } from "../utils/formatters";
import CurrentPlayerSkeleton from "./CurrentPlayerSkeleton";
import AuctionTimer from "./AuctionTimer";
import AdminTimerControls from "./admin/AdminTimerControls";

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

const INCREMENT_OPTIONS = [0.25, 0.5, 1.0, 1.5, 2.0];

const CurrentPlayer = ({ player: livePlayer, teams = [] }) => {
  const { isAuthenticated, user, token } = useAuth();
  const isAdmin = isAuthenticated && user?.role === "admin";
  const { socket } = useSocket() || {};
  const [loading, setLoading] = useState(!livePlayer);
  const [selectedIncrement, setSelectedIncrement] = useState(0.25);

  const player = livePlayer;

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

  if (loading) return <CurrentPlayerSkeleton />;
  if (!player)
    return (
      <div className="bg-[#0c101d] text-zinc-400 rounded-3xl border border-zinc-800 p-8 text-center max-w-md w-full shadow-2xl space-y-3">
        <div className="w-12 h-12 rounded-full bg-zinc-800 text-2xl flex items-center justify-center mx-auto">
          ⏳
        </div>
        <h3 className="text-lg font-bold text-white">No Player on Stage</h3>
        <p className="text-xs text-zinc-500">
          The auction administrator will introduce the next player shortly.
        </p>
      </div>
    );

  const { name, image, category, year } = player;
  const currentBidRaw = player.finalBidPrice ?? player.basePrice ?? null;
  const currentBid = currentBidRaw != null ? Number(currentBidRaw) : null;
  const leadingTeamName = player.teamName || "";

  const hasBids = sortedBids.length > 0;
  let nextBidNumeric = null;
  if (!hasBids) {
    const base = Number(player.basePrice) || 0;
    if (selectedIncrement > 0.25) {
      nextBidNumeric = Number((base + (selectedIncrement - 0.25)).toFixed(2));
    } else {
      nextBidNumeric = base;
    }
  } else {
    const basisAmount = Number(sortedBids[0]?.bidAmount ?? currentBid ?? 0);
    nextBidNumeric = Number((basisAmount + selectedIncrement).toFixed(2));
  }
  const nextBidAmount =
    nextBidNumeric != null
      ? nextBidNumeric.toFixed(2).replace(/\.00$/, "")
      : null;

  const isTeamOwner =
    isAuthenticated &&
    (user?.role === "team-owner" || user?.role === "captain");

  const handleBid = () => {
    if (!socket || !player?._id) return;
    try {
      socket.emit("captain:place_bid", {
        playerId: player._id,
        increment: selectedIncrement,
      });
    } catch (e) {
      console.error("Bid emit failed", e);
    }
  };

  const handleAdminSell = async (playerId) => {
    if (!token) return;
    let winningTeamId = null;
    let finalBidPrice = null;
    if (player.bidHistory && player.bidHistory.length) {
      const last = player.bidHistory[player.bidHistory.length - 1];
      winningTeamId = (last.team && last.team._id) || last.team || player.team;
      finalBidPrice = last.bidAmount;
    } else {
      winningTeamId = player.team?._id || player.team;
      finalBidPrice = player.finalBidPrice || player.basePrice || 0;
    }
    if (!winningTeamId) {
      alert("Cannot sell: No bids placed yet.");
      return;
    }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/auction/sell`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            playerId,
            teamId: winningTeamId,
            finalBid: finalBidPrice,
          }),
        }
      );
      if (!res.ok) {
        const txt = await res.text();
        alert(`Sell failed: ${txt}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminUnsold = async (playerId) => {
    if (!token) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/auction/unsold`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ playerId }),
        }
      );
      if (!res.ok) {
        const txt = await res.text();
        alert(`Unsold failed: ${txt}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const latestBid = sortedBids[0];
  const userTeamId = user?.team?._id || user?.team;
  const leadingBidTeamId =
    latestBid?.team?._id ||
    latestBid?.team ||
    player?.team?._id ||
    player?.team;
  const isLeadingTeam = Boolean(
    userTeamId && leadingBidTeamId && userTeamId === leadingBidTeamId
  );

  const fullUserTeam = teams.find(
    (t) => (t._id || t.id) === (userTeamId || "")
  );
  const userTeamBudget = fullUserTeam?.budget ?? user?.team?.budget ?? null;
  const isOutOfBudget =
    isTeamOwner &&
    nextBidNumeric != null &&
    typeof userTeamBudget === "number" &&
    userTeamBudget < nextBidNumeric;

  return (
    <div className="bg-[#0c101d] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-zinc-800/90 overflow-hidden max-w-md w-full relative transition-all">
      {socket && <BidErrorListener socket={socket} />}

      {/* Player Photo with Overlay Badges */}
      <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-950 relative">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-700 font-bold">
            DGPL
          </div>
        )}

        {/* Ambient Dark Gradient Bottom Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c101d] via-transparent to-black/40 pointer-events-none" />

        {/* Top Floating Category & Year Chips */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
          <span className="bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-amber-300 border border-amber-500/40 shadow-lg">
            {category}
          </span>
          {year && (
            <span className="bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-zinc-300 border border-zinc-700 shadow-lg">
              {formatAcademicYear(year)}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4 relative -mt-4 z-10">
        {/* Player Name */}
        <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight font-brand tracking-tight drop-shadow-md">
          {name}
        </h2>

        {/* Timing Ribbon & Progressive Stage Display */}
        <AuctionTimer className="mb-2" />

        {/* Primary Bid Card (Psychological Visual Focal Point) */}
        <div className="bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-zinc-800 shadow-inner space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Current Bid Price
            </span>
            <span className="text-xs font-semibold text-zinc-400">
              Base: <strong className="text-zinc-200">{player.basePrice || 0} Pts</strong>
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                {currentBid != null ? currentBid : "--"}
              </span>
              <span className="text-lg font-bold text-amber-400/80">Pts</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">
                Leading Team
              </span>
              <span className="text-sm sm:text-base font-black text-amber-300 block truncate max-w-[160px]">
                {leadingTeamName || "No Bids Yet"}
              </span>
            </div>
          </div>

          {/* Captain's Live Purse Balance (If Captain is Logged In) */}
          {isTeamOwner && (
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Your Team Purse:</span>
              <span
                className={`font-black ${
                  isOutOfBudget ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {typeof userTeamBudget === "number"
                  ? `${userTeamBudget.toFixed(2).replace(/\.00$/, "")} Pts`
                  : "—"}
              </span>
            </div>
          )}
        </div>

        {/* Bid History Feed */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            <span>Bid Activity</span>
            <span>{sortedBids.length} Bids</span>
          </div>

          {sortedBids.length === 0 ? (
            <p className="text-zinc-500 text-xs py-2 text-center bg-zinc-900/40 rounded-xl border border-zinc-800/60">
              Waiting for initial bid of {player.basePrice || 0} Pts...
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scroll">
              {sortedBids.map((bid, index) => {
                const isLatest = index === 0;
                return (
                  <li
                    key={bid._id || bid.timestamp}
                    className={`flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
                      isLatest
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-sm"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isLatest && (
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                      )}
                      <span className="text-zinc-200">
                        {bid.teamName || "Unknown Team"}
                      </span>
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {bid.bidAmount} Pts
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Captain Bid Button Action */}
        {isTeamOwner && (
          <div className="pt-2 space-y-3">
            {/* Custom Bid Increment Selector */}
            <div className="bg-zinc-900/80 rounded-2xl p-3 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                <span>Select Bid Raise</span>
                <span className="text-amber-400 font-mono">+{selectedIncrement.toFixed(2)} Pts</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {INCREMENT_OPTIONS.map((inc) => {
                  const isSelected = selectedIncrement === inc;
                  return (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => setSelectedIncrement(inc)}
                      className={`py-2 px-1 rounded-xl text-xs font-black font-mono transition-all duration-200 border text-center ${
                        isSelected
                          ? "bg-gradient-to-r from-amber-400 to-yellow-400 text-zinc-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)] scale-105"
                          : "bg-zinc-950/70 text-zinc-300 border-zinc-800 hover:border-amber-500/40 hover:text-white"
                      }`}
                    >
                      +{inc >= 1 ? inc.toFixed(1) : inc}
                    </button>
                  );
                })}
              </div>

              {/* Live Remaining Purse Preview */}
              {typeof userTeamBudget === "number" && (
                <div className="flex items-center justify-between text-[11px] pt-1.5 px-1 border-t border-zinc-800/60">
                  <span className="text-zinc-400">Remaining after bid:</span>
                  <span
                    className={`font-mono font-bold ${
                      isOutOfBudget ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {isOutOfBudget
                      ? "Exceeds Budget"
                      : `${Math.max(0, userTeamBudget - (nextBidNumeric || 0)).toFixed(2)} Pts`}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={!isLeadingTeam && !isOutOfBudget ? handleBid : undefined}
              disabled={isLeadingTeam || isOutOfBudget}
              type="button"
              className={`w-full py-4 px-6 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-xl border active:scale-[0.98] ${
                isLeadingTeam
                  ? "bg-zinc-800 text-amber-300/80 border-amber-500/30 cursor-not-allowed shadow-none"
                  : isOutOfBudget
                  ? "bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 border-amber-300 shadow-amber-500/30 hover:brightness-110"
              }`}
            >
              <span>
                {isLeadingTeam
                  ? "👑 You Hold Highest Bid"
                  : isOutOfBudget
                  ? "Insufficient Purse Balance"
                  : `BID ${nextBidAmount} Pts (+${selectedIncrement >= 1 ? selectedIncrement.toFixed(1) : selectedIncrement})`}
              </span>
            </button>
          </div>
        )}

        {/* Admin Single Progressive Gavel Dock */}
        {isAdmin && (
          <AdminTimerControls
            player={player}
            onSell={handleAdminSell}
            onUnsold={handleAdminUnsold}
            className="mt-3"
          />
        )}
      </div>
    </div>
  );
};

export default CurrentPlayer;
