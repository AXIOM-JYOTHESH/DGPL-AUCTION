import React, { useState, useEffect } from "react";
import { useSocket } from "../../context/useSocket";
import { playSoldCelebration, playChime } from "../../utils/audioEffects";

const DURATION_PRESETS = [15, 30, 60, 90];

export default function AdminTimerControls({
  player = null,
  onSell = null,
  onUnsold = null,
  className = "",
}) {
  const { socket } = useSocket() || {};
  const [timerState, setTimerState] = useState({
    mode: "timer",
    duration: 30,
    timeLeft: 30,
    isRunning: false,
    startedAt: null,
    expiresAt: null,
    callState: null,
    autoResetOnBid: true,
  });

  const [showClockSettings, setShowClockSettings] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (newState) => {
      setTimerState(newState);
    };
    socket.on("auction:timer_update", handleUpdate);
    return () => socket.off("auction:timer_update", handleUpdate);
  }, [socket]);

  const sendAction = (action, extra = {}) => {
    if (!socket) return;
    socket.emit("admin:timer_action", { action, ...extra });
  };

  const hasBids = Boolean(player?.bidHistory && player.bidHistory.length > 0);
  const leadingTeamName = player?.teamName || player?.team?.name || "Leading Team";
  const currentPrice = player?.finalBidPrice ?? player?.basePrice ?? 0;

  // Progressive Single-Button Logic:
  // Step 0: Idle -> Click triggers "Going Once"
  // Step 1: Going Once -> Click triggers "Going Twice"
  // Step 2: Going Twice -> Click triggers "SOLD!" (final sale transaction)
  const currentCall = timerState.callState; // null | 'once' | 'twice' | 'final'

  const handleProgressiveCall = () => {
    if (!hasBids) {
      // If no bids placed, single button marks unsold
      onUnsold?.(player?._id || player?.id);
      return;
    }

    if (!currentCall) {
      // 1st click: Going Once
      sendAction("set_call", { callState: "once" });
      playChime();
    } else if (currentCall === "once") {
      // 2nd click: Going Twice
      sendAction("set_call", { callState: "twice" });
      playChime();
    } else if (currentCall === "twice" || currentCall === "final") {
      // 3rd click: Sold!
      sendAction("set_call", { callState: "final" });
      playSoldCelebration();
      onSell?.(player?._id || player?.id);
    }
  };

  const handleCancelCall = () => {
    sendAction("set_call", { callState: null });
  };

  return (
    <div
      className={`bg-[#0b0f19] border border-amber-500/30 rounded-2xl p-4 shadow-2xl space-y-3.5 backdrop-blur-xl ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Admin Gavel Control
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowClockSettings((prev) => !prev)}
          className="text-[11px] font-semibold text-zinc-400 hover:text-amber-300 transition flex items-center gap-1 focus:outline-none"
        >
          <span>⏱️ {showClockSettings ? "Hide Clock Tools" : "Clock Tools"}</span>
          <span>{showClockSettings ? "▲" : "▼"}</span>
        </button>
      </div>

      {/* Primary Action Zone: Single Progressive Gavel Button */}
      <div>
        {hasBids ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleProgressiveCall}
              className={`w-full py-4 px-5 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-xl border active:scale-[0.98] ${
                !currentCall
                  ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-zinc-950 border-amber-300 shadow-amber-500/25 hover:brightness-105"
                  : currentCall === "once"
                  ? "bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 text-zinc-950 border-orange-300 shadow-orange-500/30 hover:brightness-105"
                  : "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-zinc-950 border-emerald-300 shadow-emerald-500/30 animate-pulse hover:brightness-110"
              }`}
            >
              <span>
                {!currentCall && "1️⃣ Call 1: Going Once"}
                {currentCall === "once" && "2️⃣ Call 2: Going Twice"}
                {(currentCall === "twice" || currentCall === "final") &&
                  `🏆 Final Call: SOLD to ${leadingTeamName}!`}
              </span>
              <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-black/20 tracking-wider">
                {!currentCall ? "Click 1" : currentCall === "once" ? "Click 2" : "Click 3"}
              </span>
            </button>

            {/* Sub-bar showing current stage & cancel option */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-zinc-400">
                Leading: <strong className="text-amber-300">{leadingTeamName}</strong> at{" "}
                <strong className="text-amber-300">{currentPrice} Pts</strong>
              </span>
              {currentCall && (
                <button
                  type="button"
                  onClick={handleCancelCall}
                  className="text-zinc-400 hover:text-red-400 font-semibold underline text-[11px]"
                >
                  Cancel Call Stage
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleProgressiveCall}
              className="w-full py-3.5 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white font-bold text-sm border border-zinc-700 active:scale-95 transition"
            >
              Mark Player Unsold (No Bids Placed)
            </button>
            <p className="text-[11px] text-zinc-500 text-center">
              Once a captain places a bid, the 3-step gavel button activates.
            </p>
          </div>
        )}
      </div>

      {/* Collapsible Clock Tools (When Needed by Admin) */}
      {showClockSettings && (
        <div className="pt-3 border-t border-zinc-800/80 space-y-3 animate-fadeIn">
          {/* Preset Chips */}
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase">
              Duration
            </span>
            <div className="flex gap-1">
              {DURATION_PRESETS.map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => sendAction("set_duration", { duration: dur })}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                    timerState.duration === dur
                      ? "bg-amber-400/20 text-yellow-300 border-amber-400/60"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {dur}s
                </button>
              ))}
            </div>
          </div>

          {/* Clock controls */}
          <div className="grid grid-cols-3 gap-2">
            {!timerState.isRunning ? (
              <button
                type="button"
                onClick={() => sendAction("start")}
                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition"
              >
                <span>▶</span>
                <span>Start Clock</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => sendAction("pause")}
                className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-1 transition"
              >
                <span>⏸</span>
                <span>Pause</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => sendAction("reset")}
              className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={() => sendAction("add_time", { seconds: 15 })}
              className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-300 font-semibold text-xs border border-zinc-700 transition"
            >
              +15s
            </button>
          </div>

          <button
            type="button"
            onClick={() => socket?.emit("admin:start_random_player")}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/40 text-amber-300 font-extrabold text-xs flex items-center justify-center gap-2 transition shadow"
          >
            <span>🎲</span>
            <span>Draw Random Player to Stage</span>
          </button>
        </div>
      )}
    </div>
  );
}
