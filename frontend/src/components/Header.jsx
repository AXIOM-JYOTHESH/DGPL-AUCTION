// src/components/Header.jsx

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContextCore";

function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const isOnAdmin = location.pathname.startsWith("/admin");
  const handleLogout = () => {
    logout();
    navigate("/");
  };
  const firstName = user?.name ? user.name.split(" ")[0] : "User";
  return (
    <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-3 sm:p-4 flex items-start justify-between sm:items-center shadow-lg sm:sticky sm:top-0 z-50 border-b-2 border-blue-500 rounded-b-2xl">
      {/* Title */}
      <h1 className="font-brand text-white text-xl xs:text-2xl sm:text-3xl font-extrabold tracking-wide drop-shadow-lg select-none leading-tight mr-4">
        🏏 DGPL <span className="text-yellow-400">AUCTION</span>
      </h1>
      {/* Right side */}
      {isAuthenticated ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          {/* Desktop welcome line */}
          <span className="hidden sm:inline text-sm font-medium text-blue-100 truncate max-w-[240px]">
            Welcome,{" "}
            <span className="text-yellow-300 font-bold text-base sm:text-lg">
              {user?.name || "User"}
            </span>
          </span>
          {user?.role === "admin" && (
            <button
              onClick={() => navigate(isOnAdmin ? "/" : "/admin")}
              className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-gray-900 font-semibold py-1.5 sm:py-2 px-4 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg hover:brightness-105 transition text-xs sm:text-sm border border-yellow-300"
              type="button"
            >
              {isOnAdmin ? "Auction" : "Admin Control Panel"}
            </button>
          )}
          <div className="flex flex-col items-center sm:items-end">
            <button
              onClick={handleLogout}
              className="bg-black text-white font-bold py-1.5 sm:py-2 px-5 sm:px-6 rounded-lg sm:rounded-xl hover:bg-gray-800 hover:shadow-lg transition-all duration-300 text-xs sm:text-sm transform hover:scale-105 btn-solid-login"
            >
              Logout
            </button>
            {/* Mobile name under logout */}
            <span className="sm:hidden mt-1.5 text-base font-bold text-yellow-300 leading-tight tracking-wide text-center">
              {firstName}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex justify-end w-auto">
          <button
            onClick={() => navigate("/login")}
            className="bg-black text-white font-bold py-1.5 sm:py-2 px-5 sm:px-6 rounded-lg sm:rounded-xl hover:bg-gray-800 hover:shadow-lg transition-all duration-300 ease-in-out text-xs sm:text-sm transform hover:scale-105 btn-solid-login"
          >
            Login
          </button>
        </div>
      )}
    </header>
  );
}

export default Header;
