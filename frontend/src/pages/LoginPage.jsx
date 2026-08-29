import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContextCore";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      // If user is admin navigate to admin panel directly
      if (data?.data?.user?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      alert(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black px-4 py-10">
      <div className="w-full max-w-md bg-gray-800/90 backdrop-blur rounded-2xl shadow-2xl border border-gray-700/70 p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl" />

        {/* Back icon button (absolute, does not affect heading layout) */}
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back"
          style={{ backgroundColor: "#ffffff", color: "#111111" }}
          className="absolute top-4 left-4 px-4 h-9 inline-flex items-center justify-center rounded-full text-sm font-semibold border border-gray-300 shadow-md hover:bg-gray-50 hover:shadow-lg transition focus:outline-none focus:ring-2 focus:ring-yellow-400/60 focus:ring-offset-1 focus:ring-offset-gray-800"
        >
          Back
        </button>

        <h1 className="mt-10 text-2xl sm:text-3xl font-extrabold text-white tracking-wide mb-6 text-center font-brand">
          Welcome Back
        </h1>
        <div className="mb-4">
          <div className="w-full text-center text-xs font-semibold text-yellow-300 bg-gray-900/80 rounded-lg px-3 py-2 border border-yellow-400/40">
            Note: Only <span className="text-yellow-400">captains</span> and{" "}
            <span className="text-yellow-400">admin</span> can login.
          </div>
        </div>
        <p className="text-sm text-gray-400 text-center mb-8">
          Sign in to continue to{" "}
          <span className="text-yellow-400 font-semibold">DGPL Auction</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 tracking-wide"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-gray-900/70 border border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/40 text-gray-100 px-4 py-2.5 text-sm placeholder-gray-500 outline-none transition"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 tracking-wide"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-gray-900/70 border border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/40 text-gray-100 px-4 py-2.5 text-sm placeholder-gray-500 outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-gray-900 font-bold tracking-wide py-2.5 rounded-lg shadow-lg shadow-yellow-500/25 hover:shadow-yellow-400/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
