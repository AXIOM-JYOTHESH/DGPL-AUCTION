import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContextCore";

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const isOnAdmin = location.pathname.startsWith("/admin");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isAdmin = user?.role === "admin";
  const isCaptain = user?.role === "captain" || user?.role === "team-owner";

  return (
    <header className="sticky top-0 z-50 bg-[#0c101a]/85 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xl transition-all">
      {/* Brand & Live Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 text-left focus:outline-none group"
        >
          <span className="text-2xl sm:text-3xl filter drop-shadow">🏏</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-2xl tracking-tight text-white font-brand">
                DGPL <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">AUCTION</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Arena
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase hidden sm:block">
              Telugu Community Cricket League
            </p>
          </div>
        </button>
      </div>

      {/* Navigation Actions & User Profile */}
      {isAuthenticated ? (
        <div className="flex items-center gap-3 sm:gap-4">
          {/* User Profile Pill */}
          <div className="hidden sm:flex items-center gap-2.5 bg-zinc-900/90 border border-zinc-800 py-1.5 px-3 rounded-full">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-zinc-950 font-black text-xs flex items-center justify-center">
              {(user?.name || "U")[0].toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-zinc-200 truncate max-w-[140px]">
              {user?.name || "User"}
            </span>
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                isAdmin
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : isCaptain
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}
            >
              {isAdmin ? "Admin" : isCaptain ? "Captain" : "Viewer"}
            </span>
          </div>

          {/* Admin Navigation Switcher */}
          {isAdmin && (
            <button
              onClick={() => navigate(isOnAdmin ? "/" : "/admin")}
              type="button"
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all active:scale-95 flex items-center gap-1.5 shadow-md ${
                isOnAdmin
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 border-amber-300 shadow-amber-500/20 font-extrabold"
                  : "bg-zinc-900 hover:bg-zinc-800 text-amber-300 border-amber-500/40"
              }`}
            >
              <span>{isOnAdmin ? "📺 Live Stage" : "🛡️ Admin Console"}</span>
            </button>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            type="button"
            className="px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 transition-all active:scale-95"
          >
            Logout
          </button>
        </div>
      ) : (
        <button
          onClick={() => navigate("/login")}
          type="button"
          className="px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 hover:brightness-110 shadow-lg shadow-amber-500/25 border border-amber-300/80 transition-all active:scale-95 flex items-center gap-1.5"
        >
          <span>Sign In</span>
          <span>→</span>
        </button>
      )}
    </header>
  );
}
