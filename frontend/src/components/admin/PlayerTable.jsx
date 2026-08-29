import React, { useState } from "react";

// PlayerTable dumb component
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
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Category
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Base Price
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Current Bid
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Leading Team
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
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
                className={
                  "hover:bg-gray-50 " +
                  (isLive ? "bg-yellow-50 ring-1 ring-yellow-300" : "")
                }
              >
                <td className="px-4 py-2 text-sm font-medium text-gray-800">
                  {p.name}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {p.category || "-"}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {p.basePrice != null ? `${p.basePrice} Pts` : "—"}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800 font-semibold">
                  {currentBid}
                </td>
                <td className="px-4 py-2 text-sm text-gray-700">
                  {leadingTeamName}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                      Live
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs">Unsold</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  {!isLive && (
                    <button
                      onClick={() => onStartAuction && onStartAuction(p._id)}
                      disabled={disabled || isLive}
                      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${
                        disabled
                          ? "bg-indigo-200 border-indigo-300 text-indigo-700 cursor-not-allowed"
                          : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500"
                      }`}
                      type="button"
                    >
                      {disabled ? "Starting..." : "Start"}
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
                      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 transition-colors ${
                        disabled
                          ? "bg-green-200 text-green-800 cursor-not-allowed"
                          : isConfirming
                          ? "bg-green-700 text-white border-green-700 hover:bg-green-600"
                          : "bg-green-600 text-white hover:bg-green-500"
                      }`}
                      type="button"
                    >
                      {disabled
                        ? "Saving..."
                        : isConfirming
                        ? "Confirm"
                        : "Sell"}
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
                      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition-colors ${
                        disabled
                          ? "bg-red-200 text-red-800 cursor-not-allowed"
                          : isConfirmingUnsold
                          ? "bg-red-700 text-white border-red-700 hover:bg-red-600"
                          : "bg-red-600 text-white hover:bg-red-500"
                      }`}
                      type="button"
                    >
                      {disabled
                        ? "Updating..."
                        : isConfirmingUnsold
                        ? "Confirm"
                        : "Unsold"}
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
