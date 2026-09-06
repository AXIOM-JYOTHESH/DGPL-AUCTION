import React, { useEffect, useState, useRef } from "react";
import { useSocket } from "../context/useSocket";
import {
  playTick,
  playChime,
  getIsMuted,
  toggleMute,
  subscribeMute,
} from "../utils/audioEffects";

export default function AuctionTimer({ className = "" }) {
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

  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [isMuted, setIsMuted] = useState(getIsMuted());
  const lastSoundSecRef = useRef(null);
  const prevCallRef = useRef(null);

  useEffect(() => {
    return subscribeMute((muted) => setIsMuted(muted));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleTimerUpdate = (newState) => {
      setTimerState(newState);
      if (newState.expiresAt && newState.isRunning) {
        const left = Math.max(
          0,
          Math.round((newState.expiresAt - Date.now()) / 1000)
        );
        setSecondsRemaining(left);
      } else {
        setSecondsRemaining(newState.timeLeft ?? newState.duration ?? 30);
      }
    };

    const handleTimerExpired = (expiredState) => {
      setTimerState(expiredState);
      setSecondsRemaining(0);
      playChime();
    };

    socket.on("auction:timer_update", handleTimerUpdate);
    socket.on("auction:timer_expired", handleTimerExpired);

    return () => {
      socket.off("auction:timer_update", handleTimerUpdate);
      socket.off("auction:timer_expired", handleTimerExpired);
    };
  }, [socket]);

  // Play subtle chime on progressive call change
  useEffect(() => {
    if (timerState.callState && timerState.callState !== prevCallRef.current) {
      playChime();
    }
    prevCallRef.current = timerState.callState;
  }, [timerState.callState]);

  // Synchronized countdown ticker with soft sine pips in last seconds
  useEffect(() => {
    if (!timerState.isRunning || !timerState.expiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.round((timerState.expiresAt - now) / 1000));
      setSecondsRemaining(diff);

      // Soft micro-pip countdown in the final 8 seconds
      if (diff <= 8 && diff > 0) {
        if (lastSoundSecRef.current !== diff) {
          lastSoundSecRef.current = diff;
          playTick(diff <= 3);
        }
      } else if (diff === 0) {
        if (lastSoundSecRef.current !== 0) {
          lastSoundSecRef.current = 0;
          playChime();
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.expiresAt]);

  const duration = timerState.duration || 30;
  const progressPercent = Math.min(
    100,
    Math.max(0, (secondsRemaining / duration) * 100)
  );

  const isDanger = secondsRemaining <= 5 && timerState.isRunning;
  const isWarning =
    secondsRemaining <= 10 && secondsRemaining > 5 && timerState.isRunning;
  const isExpired = secondsRemaining === 0 && !timerState.isRunning;

  // Progressive Gavel Call Banner if in progressive state
  const hasActiveCall = Boolean(timerState.callState);

  return (
    <div
      className={`relative bg-[#0c101d]/90 backdrop-blur-xl rounded-2xl p-4 border transition-all duration-300 ${
        hasActiveCall
          ? timerState.callState === "final"
            ? "border-red-500/70 shadow-[0_0_25px_rgba(239,68,68,0.25)]"
            : timerState.callState === "twice"
            ? "border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
            : "border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
          : isDanger
          ? "border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]"
          : "border-zinc-800"
      } ${className}`}
    >
      {/* Top Status Bar & Sound Mute Toggle */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              timerState.isRunning
                ? "bg-emerald-400 animate-pulse"
                : hasActiveCall
                ? "bg-amber-400 animate-ping"
                : "bg-zinc-600"
            }`}
          />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
            {hasActiveCall ? "Stage Announcement" : "Auction Timing"}
          </span>
          {timerState.mode === "timer" && !hasActiveCall && (
            <span
              className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                timerState.isRunning
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : isExpired
                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
              }`}
            >
              {timerState.isRunning ? "RUNNING" : isExpired ? "EXPIRED" : "PAUSED"}
            </span>
          )}
        </div>

        {/* Minimal Sound Toggle */}
        <button
          onClick={() => toggleMute()}
          type="button"
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-all border ${
            isMuted
              ? "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"
              : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
          }`}
          title={isMuted ? "Sound is Muted" : "Sound is Active"}
        >
          <span>{isMuted ? "🔇" : "🔔"}</span>
          <span>{isMuted ? "Muted" : "Sound On"}</span>
        </button>
      </div>

      {/* Progressive Gavel Call Stage Overlay (When Active) */}
      {hasActiveCall ? (
        <div className="py-1 text-center animate-fadeIn">
          {timerState.callState === "once" && (
            <div className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-amber-400/50 shadow-lg">
              <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest block">
                Official 1st Call
              </span>
              <span className="text-xl font-black text-yellow-300 tracking-wide block mt-0.5">
                GOING ONCE
              </span>
              <span className="text-[11px] text-zinc-300 mt-0.5 block">
                Any higher bids before second call?
              </span>
            </div>
          )}

          {timerState.callState === "twice" && (
            <div className="py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500/20 via-amber-500/25 to-orange-500/20 border border-orange-500/60 shadow-lg animate-pulse">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block">
                Official 2nd Call
              </span>
              <span className="text-xl font-black text-orange-400 tracking-wide block mt-0.5">
                GOING TWICE
              </span>
              <span className="text-[11px] text-orange-200 mt-0.5 block">
                Final opportunity to bid before hammer falls!
              </span>
            </div>
          )}

          {timerState.callState === "final" && (
            <div className="py-3 px-4 rounded-xl bg-gradient-to-r from-red-600/25 via-red-500/30 to-red-600/25 border border-red-500/70 shadow-lg animate-pulse">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block">
                Final Call & Fair Warning
              </span>
              <span className="text-2xl font-black text-red-400 tracking-wide block mt-0.5">
                FAIR WARNING — SOLD!
              </span>
              <span className="text-[11px] text-red-200 font-semibold mt-0.5 block">
                Player awarded to leading bidder!
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Broadcast Style Minimalist Timing Bar & Countdown */
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-400 font-semibold">
              {timerState.isRunning ? "Time Remaining" : "Clock Paused"}
            </span>
            <span
              className={`font-mono text-2xl font-black tabular-nums transition-colors ${
                isDanger
                  ? "text-red-400 animate-pulse"
                  : isWarning
                  ? "text-orange-400"
                  : "text-amber-300"
              }`}
            >
              00:{secondsRemaining.toString().padStart(2, "0")}
            </span>
          </div>

          {/* Smooth Linear Progress Bar */}
          <div className="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-linear ${
                isDanger
                  ? "bg-gradient-to-r from-red-500 to-rose-400"
                  : isWarning
                  ? "bg-gradient-to-r from-orange-500 to-amber-400"
                  : "bg-gradient-to-r from-amber-400 to-yellow-300"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
            <span>Limit: {duration}s</span>
            <span>
              {timerState.autoResetOnBid ? "Auto-resets on new bids" : "Manual clock"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
