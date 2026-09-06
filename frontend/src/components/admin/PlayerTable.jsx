import React, { useState } from "react";

export default function PlayerTable({
  players = [],
  onStartAuction,
  onSellPlayer,
  onMarkUnsold,
  actionLoadingId,
}) {
  const [confirmId, setConfirmId] = useState(null);
  const [confirmUnsoldId, setConfirmUnsoldId] = useState(null);

  if (!players.length) return null;
  const display = players
    .filter((p) => p.status !== "sold")
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!display.length) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#0c101d] shadow-2xl">
      <table className="min-w-full divide-y divide-zinc-800">
        <thead className="bg-zinc-900/90 text-zinc-400">
          <tr>
            <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
              Player Name
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
              Category
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
              Base Price
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
              Current Bid
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
              Leading Team
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
              Status
            </th>
            <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {display.map((p) => {
            const isLive = p.status === "in_auction";
            const hasBids = p.bidHistory && p.bidHistory.length > 0;
            const disabled = actionLoadingId === p._id;
            const isConfirming = confirmId === p._id;
            const isConfirmingUnsold = confirmUnsoldId === p._id;
            const currentBid =
              isLive && hasBids
                ? `${p.bidHistory[p.bidHistory.length - 1].bidAmount} Pts`
                : isLive
                ? `${p.basePrice} Pts`
                : "—";
            const latestBid = hasBids
              ? p.bidHistory[p.bidHistory.length - 1]
              : null;
            const leadingTeamName = isLive
              ? latestBid?.teamName ||
                (latestBid?.team && latestBid.team.name) ||
                p.teamName ||
                (p.team && p.team.name) ||
                "—"
              : "—";

            return (
              <tr
                key={p._id}
                className={`transition-colors ${
                  isLive
                    ? "bg-amber-500/10 border-l-4 border-l-amber-400"
                    : "hover:bg-zinc-900/50"
                }`}
              >
                <td className="px-5 py-4 text-sm font-bold text-white">
                  {p.name}
                </td>
                <td className="px-5 py-4 text-xs font-medium text-zinc-300">
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700">
                    {p.category || "-"}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-zinc-400 font-mono">
                  {p.basePrice != null ? `${p.basePrice} Pts` : "—"}
                </td>
                <td className="px-5 py-4 text-sm font-black text-amber-300 font-mono">
                  {currentBid}
                </td>
                <td className="px-5 py-4 text-xs font-bold text-zinc-300">
                  {leadingTeamName}
                </td>
                <td className="px-5 py-4 text-xs">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Live
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-medium">Available</span>
                  )}
                </td>
                <td className="px-5 py-4 text-right space-x-2">
                  {!isLive && (
                    <button
                      onClick={() => onStartAuction && onStartAuction(p._id)}
                      disabled={disabled || isLive}
                      className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all focus:outline-none ${
                        disabled
                          ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                          : "bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 hover:brightness-110 shadow-md shadow-amber-500/20 active:scale-95"
                      }`}
                      type="button"
                    >
                      {disabled ? "Starting..." : "Start Auction"}
                    </button>
                  )}
                  {isLive && hasBids && (
                    <button
                      onClick={() => {
                        if (isConfirming) {
                          onSellPlayer && onSellPlayer(p._id);
                          setConfirmId(null);
                        } else {
                          setConfirmId(p._id);
                        }
                      }}
                      disabled={disabled}
                      className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all focus:outline-none ${
                        disabled
                          ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                          : isConfirming
                          ? "bg-emerald-500 text-zinc-950 font-black"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                      }`}
                      type="button"
                    >
                      {disabled
                        ? "Saving..."
                        : isConfirming
                        ? "Confirm Sale"
                        : "Sell Player"}
                    </button>
                  )}
                  {isLive && !hasBids && (
                    <button
                      onClick={() => {
                        if (isConfirmingUnsold) {
                          onMarkUnsold && onMarkUnsold(p._id);
                          setConfirmUnsoldId(null);
                        } else {
                          setConfirmUnsoldId(p._id);
                        }
                      }}
                      disabled={disabled}
                      className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all focus:outline-none ${
                        disabled
                          ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                          : isConfirmingUnsold
                          ? "bg-red-500 text-white font-bold"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                      }`}
                      type="button"
                    >
                      {disabled
                        ? "Updating..."
                        : isConfirmingUnsold
                        ? "Confirm Unsold"
                        : "Mark Unsold"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
