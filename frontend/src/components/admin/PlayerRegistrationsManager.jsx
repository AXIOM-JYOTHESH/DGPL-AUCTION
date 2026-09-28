import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/authContextCore";
import { useSocket } from "../../context/useSocket";
import { handleImageError } from "../../utils/imageHelper";

const ROLE_OPTIONS = [
  { label: "Batsman", icon: "🏏", value: "Batsman" },
  { label: "Bowler", icon: "🎯", value: "Bowler" },
  { label: "All-Rounder", icon: "⚡", value: "All-Rounder" },
  { label: "Wicket-Keeper", icon: "🧤", value: "Wicket-Keeper" },
];

const YEAR_OPTIONS = [
  { label: "All Years", value: null },
  { label: "4th Year", value: 4 },
  { label: "3rd Year", value: 3 },
  { label: "2nd Year", value: 2 },
  { label: "1st Year", value: 1 },
];

export default function PlayerRegistrationsManager({ onPlayerApproved }) {
  const { token } = useAuth();
  const socketContext = useSocket() || {};
  const socket = socketContext.socket || null;

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("pending"); // "pending" | "rejected" | "unsold"
  const [players, setPlayers] = useState([]);
  const [countsByYear, setCountsByYear] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Local modifications per player (admin overrides before accepting)
  // { [playerId]: { category, year, basePrice, name, isCaptain, teamId } }
  const [editState, setEditState] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams`);
        if (res.ok) {
          const data = await res.json();
          setTeams(data.data?.teams || []);
        }
      } catch {
        /* ignore */
      }
    };
    fetchTeams();
  }, []);

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch pending registrations
  const fetchRegistrations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      let url = `${import.meta.env.VITE_API_URL}/api/v1/players/pending-registrations?status=${selectedStatus}`;
      if (selectedYear != null) {
        url += `&year=${selectedYear}`;
      }

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`Failed to load registrations (${res.status})`);
      const data = await res.json();
      const list = data.data?.players || [];
      setPlayers(list);
      if (data.data?.countsByYear) {
        setCountsByYear(data.data.countsByYear);
      }

      // Initialize edit state with current player values
      const initialEdits = {};
      list.forEach((p) => {
        const id = p._id || p.id;
        initialEdits[id] = {
          name: p.name || "",
          category: p.category || "All-Rounder",
          year: p.year || 3,
          basePrice: p.basePrice != null ? p.basePrice : 0.5,
          isCaptain: Boolean(p.isCaptain),
          teamId: p.teamId || (p.team && (p.team._id || p.team.id)) || "",
        };
      });
      setEditState(initialEdits);
    } catch (err) {
      setError(err.message || "Error fetching registrations");
    } finally {
      setLoading(false);
    }
  }, [token, selectedStatus, selectedYear]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Real-time socket listener for incoming Google Form registrations
  useEffect(() => {
    if (!socket) return;

    const handleNewPending = (player) => {
      showToast(`⚡ New Registration: ${player.name} (${player.category}, Year ${player.year || '?'})`);
      // Re-fetch to update badge counts and fresh list
      fetchRegistrations();
    };

    const handleUpdated = () => {
      fetchRegistrations();
    };

    socket.on("player_pending_registration", handleNewPending);
    socket.on("auction:registrations_updated", handleUpdated);
    socket.on("player_approved", handleUpdated);
    socket.on("player_rejected", handleUpdated);

    return () => {
      socket.off("player_pending_registration", handleNewPending);
      socket.off("auction:registrations_updated", handleUpdated);
      socket.off("player_approved", handleUpdated);
      socket.off("player_rejected", handleUpdated);
    };
  }, [socket, fetchRegistrations]);

  // Update a field in local edit state
  const handleEditChange = (id, field, value) => {
    setEditState((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  };

  // ADMIN ACTION: ACCEPT PLAYER
  const handleAcceptPlayer = async (player) => {
    const id = player._id || player.id;
    const currentEdits = editState[id] || {};
    setActionLoadingId(id);

    try {
      if (currentEdits.isCaptain && !currentEdits.teamId) {
        showToast("⚠️ Please select a team to assign this captain to.", true);
        setActionLoadingId(null);
        return;
      }

      const payload = {
        name: currentEdits.name || player.name,
        category: currentEdits.category || player.category,
        year: currentEdits.year != null ? parseInt(currentEdits.year, 10) : player.year,
        basePrice:
          currentEdits.basePrice != null ? parseFloat(currentEdits.basePrice) : player.basePrice,
        isCaptain: Boolean(currentEdits.isCaptain),
        teamId: currentEdits.isCaptain ? currentEdits.teamId : null,
      };

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/players/${id}/approve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to approve player");
      }

      if (payload.isCaptain) {
        const teamObj = teams.find((t) => (t._id || t.id) === payload.teamId);
        showToast(`👑 '${payload.name}' appointed as Captain of ${teamObj?.name || 'the team'}!`);
      } else {
        showToast(`✅ '${payload.name}' approved as ${payload.category} and added to auction pool!`);
      }
      // Remove from current pending list
      setPlayers((prev) => prev.filter((p) => (p._id || p.id) !== id));
      setCountsByYear((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        [payload.year]: Math.max(0, (prev[payload.year] || 1) - 1),
      }));

      if (onPlayerApproved) onPlayerApproved(id);
    } catch (err) {
      showToast(err.message || "Failed to approve player", true);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ADMIN ACTION: REJECT PLAYER
  const handleRejectPlayer = async (player) => {
    const id = player._id || player.id;
    if (!window.confirm(`Are you sure you want to reject registration for '${player.name}'?`)) {
      return;
    }
    setActionLoadingId(id);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/players/${id}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to reject player");
      }

      showToast(`❌ Registration for '${player.name}' rejected.`);
      setPlayers((prev) => prev.filter((p) => (p._id || p.id) !== id));
      setCountsByYear((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        [player.year]: Math.max(0, (prev[player.year] || 1) - 1),
      }));
    } catch (err) {
      showToast(err.message || "Failed to reject player", true);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ADMIN ACTION: UPDATE EXISTING / ACCEPTED PLAYER
  const handleUpdatePlayer = async (player) => {
    const id = player._id || player.id;
    const currentEdits = editState[id] || {};
    setActionLoadingId(id);

    try {
      if (currentEdits.isCaptain && !currentEdits.teamId) {
        showToast("⚠️ Please select a team to assign this captain to.", true);
        setActionLoadingId(null);
        return;
      }

      const payload = {
        name: currentEdits.name || player.name,
        category: currentEdits.category || player.category,
        year: currentEdits.year != null ? parseInt(currentEdits.year, 10) : player.year,
        basePrice:
          currentEdits.basePrice != null ? parseFloat(currentEdits.basePrice) : player.basePrice,
        isCaptain: Boolean(currentEdits.isCaptain),
        teamId: currentEdits.isCaptain ? currentEdits.teamId : null,
      };

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/players/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to update player");
      }

      showToast(`💾 Changes saved for '${payload.name}'!`);
      if (onPlayerApproved) onPlayerApproved(id);
    } catch (err) {
      showToast(err.message || "Failed to update player", true);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ADMIN ACTION: RESET ACCEPTED PLAYER BACK TO PENDING QUEUE
  const handleResetToPending = async (player) => {
    const id = player._id || player.id;
    setActionLoadingId(id);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/players/${id}/reset-pending`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to move player to pending");

      showToast(`↩️ '${player.name}' moved back to Pending Review.`);
      setPlayers((prev) => prev.filter((p) => (p._id || p.id) !== id));
      setCountsByYear((prev) => ({
        ...prev,
        total: prev.total + 1,
        [player.year]: (prev[player.year] || 0) + 1,
      }));
    } catch (err) {
      showToast(err.message || "Error moving player to pending", true);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ADMIN ACTION: PERMANENTLY DELETE
  const handleDeletePlayer = async (player) => {
    const id = player._id || player.id;
    if (!window.confirm(`Permanently delete '${player.name}' from the database?`)) {
      return;
    }
    setActionLoadingId(id);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/players/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to delete record");

      showToast(`🗑️ Record for '${player.name}' deleted.`);
      setPlayers((prev) => prev.filter((p) => (p._id || p.id) !== id));
    } catch (err) {
      showToast(err.message || "Failed to delete player", true);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-between shadow-xl transition-all animate-bounce ${
            toastMessage.isError
              ? "bg-red-500/20 text-red-300 border-red-500/40"
              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
          }`}
        >
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Control Header & Status Filters */}
      <div className="bg-[#0c101d] border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📋</span>
            <h2 className="text-lg sm:text-xl font-black text-white font-brand tracking-tight">
              Player Registrations & Approval Portal
            </h2>
            {countsByYear.total > 0 && (
              <span className="bg-amber-500 text-zinc-950 font-black text-xs px-2.5 py-0.5 rounded-full shadow-md animate-pulse">
                {countsByYear.total} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Review incoming Google Form entries. You have the upper hand to modify sportsmanship (role), year, or base price before accepting into the auction.
          </p>
        </div>

        {/* Status Switcher & Manual Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedStatus("pending")}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedStatus === "pending"
                  ? "bg-amber-400 text-zinc-950 font-black shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Pending Review ({countsByYear.total})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("rejected")}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedStatus === "rejected"
                  ? "bg-red-500 text-white font-black shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Rejected
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("unsold")}
              className={`px-3 py-1.5 rounded-lg transition ${
                selectedStatus === "unsold"
                  ? "bg-emerald-500 text-zinc-950 font-black shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Approved Pool
            </button>
          </div>

          <button
            type="button"
            onClick={fetchRegistrations}
            disabled={loading}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
            title="Refresh registrations"
          >
            <span className={`inline-block ${loading ? "animate-spin" : ""}`}>🔄</span>
          </button>
        </div>
      </div>

      {/* Year-by-Year Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {YEAR_OPTIONS.map((opt) => {
          const active = selectedYear === opt.value;
          const count = opt.value === null ? countsByYear.total : countsByYear[opt.value] || 0;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => setSelectedYear(opt.value)}
              className={`relative px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 border ${
                active
                  ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 border-amber-300 shadow-lg shadow-amber-500/20 font-black scale-[1.02]"
                  : "bg-[#0c101d] text-zinc-400 border-zinc-800 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              <span>{opt.label}</span>
              {selectedStatus === "pending" && count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    active ? "bg-zinc-950 text-amber-300" : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center space-y-2">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-amber-400 font-bold">Loading registrations...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && players.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-[#0c101d] space-y-3">
          <div className="text-4xl">🎉</div>
          <h3 className="text-base font-black text-white font-brand">
            {selectedStatus === "pending"
              ? "All Caught Up! No Pending Registrations."
              : selectedStatus === "rejected"
              ? "No Rejected Registrations"
              : "No Approved Players in this filter"}
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            {selectedStatus === "pending"
              ? "When participants submit your Google Form, their entries will show up here instantly in real time."
              : "Players you process will appear here according to their status."}
          </p>
        </div>
      )}

      {/* Registrations List / Cards */}
      {!loading && !error && players.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {players.map((p) => {
            const id = p._id || p.id;
            const currentEdit = editState[id] || {
              name: p.name,
              category: p.category,
              year: p.year,
              basePrice: p.basePrice != null ? p.basePrice : 0.5,
            };
            const isProcessing = actionLoadingId === id;
            const isOriginalRoleChanged = currentEdit.category !== p.category;

            return (
              <div
                key={id}
                className="bg-[#0c101d] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 shadow-xl transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Left: Player Avatar & Basic Info */}
                <div className="flex items-start sm:items-center gap-4 flex-1">
                  {/* Photo thumbnail */}
                  <div
                    className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-700 flex-shrink-0 cursor-pointer group"
                    onClick={() => p.image && setPreviewImage(p.image)}
                    title="Click to view full photo"
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                        onError={(e) => handleImageError(e, p.image)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-2xl font-black">
                        🏏
                      </div>
                    )}
                    {p.image && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                        🔍
                      </div>
                    )}
                  </div>

                  {/* Player Name & Year editing */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <input
                        type="text"
                        value={currentEdit.name}
                        onChange={(e) => handleEditChange(id, "name", e.target.value)}
                        placeholder="Player Name"
                        className="font-black text-white text-base sm:text-lg bg-zinc-900/60 border border-zinc-700/60 rounded-lg px-2.5 py-1 focus:border-amber-400 focus:outline-none w-full sm:w-64"
                      />
                      <span className="text-[11px] font-mono text-zinc-500">
                        {p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>

                    {/* Academic Year Dropdown */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-400 font-bold">Year:</span>
                      <select
                        value={currentEdit.year || 3}
                        onChange={(e) => handleEditChange(id, "year", parseInt(e.target.value, 10))}
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-zinc-200 font-bold focus:border-amber-400 focus:outline-none text-xs"
                      >
                        <option value={1}>1st Year</option>
                        <option value={2}>2nd Year</option>
                        <option value={3}>3rd Year</option>
                        <option value={4}>4th Year</option>
                      </select>

                      {/* Base Price input */}
                      <span className="text-zinc-400 font-bold ml-2">Base Price:</span>
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={currentEdit.basePrice}
                          onChange={(e) => handleEditChange(id, "basePrice", e.target.value)}
                          className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-amber-300 font-mono font-bold text-xs focus:border-amber-400 focus:outline-none text-center"
                        />
                        <span className="text-zinc-500 font-mono text-xs">Pts</span>
                      </div>
                    </div>

                    {/* Captain Assignment Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-zinc-800/80 mt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-zinc-300 hover:text-amber-300 transition select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(currentEdit.isCaptain)}
                          onChange={(e) => handleEditChange(id, "isCaptain", e.target.checked)}
                          className="rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-0 cursor-pointer"
                        />
                        <span>👑 Make Team Captain</span>
                      </label>

                      {currentEdit.isCaptain && (
                        <select
                          value={currentEdit.teamId || ""}
                          onChange={(e) => handleEditChange(id, "teamId", e.target.value)}
                          className="bg-zinc-900 border border-amber-500/60 text-amber-300 text-xs font-bold rounded-lg px-2 py-0.5 focus:border-amber-400 focus:outline-none"
                        >
                          <option value="">-- Select Franchise Team --</option>
                          {teams.map((t) => (
                            <option key={t._id || t.id} value={t._id || t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Sportsmanship / Role Override (ADMIN UPPER HAND) */}
                <div className="space-y-1.5 bg-zinc-950/60 border border-zinc-800/80 p-3 rounded-xl flex-shrink-0">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold">
                    <span>Playing Role (Admin Override):</span>
                    {isOriginalRoleChanged && (
                      <span className="text-amber-400 font-mono text-[10px]">
                        Form: {p.category}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5">
                    {ROLE_OPTIONS.map((r) => {
                      const isSelected = currentEdit.category === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => handleEditChange(id, "category", r.value)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                            isSelected
                              ? "bg-amber-400 text-zinc-950 border-amber-300 font-black shadow-md scale-105"
                              : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800"
                          }`}
                        >
                          <span>{r.icon}</span>
                          <span>{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Accept / Reject / Delete Action Buttons */}
                <div className="flex items-center gap-2 justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-800">
                  {selectedStatus === "pending" && (
                    <>
                      {/* ACCEPT BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleAcceptPlayer(p)}
                        disabled={isProcessing}
                        className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 border border-emerald-300 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <span>{isProcessing ? "⏳" : "✅"}</span>
                        <span>Accept Player</span>
                      </button>

                      {/* REJECT BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleRejectPlayer(p)}
                        disabled={isProcessing}
                        className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-50"
                        title="Reject registration"
                      >
                        <span>❌ Reject</span>
                      </button>
                    </>
                  )}

                  {selectedStatus === "rejected" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAcceptPlayer(p)}
                        disabled={isProcessing}
                        className="py-2 px-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs hover:bg-emerald-500/30 transition"
                      >
                        Restore & Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlayer(p)}
                        disabled={isProcessing}
                        className="py-2 px-3 rounded-xl bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-700 font-bold text-xs transition"
                        title="Delete permanently"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}

                  {selectedStatus === "unsold" && (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => handleUpdatePlayer(p)}
                        disabled={isProcessing}
                        className="py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs transition flex items-center gap-1 shadow"
                        title="Save edited details"
                      >
                        <span>💾 Save Changes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResetToPending(p)}
                        disabled={isProcessing}
                        className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-xs transition flex items-center gap-1"
                        title="Move back to Pending Review queue"
                      >
                        <span>↩️ Move to Pending</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePlayer(p)}
                        disabled={isProcessing}
                        className="py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-300 font-bold text-xs transition border border-zinc-700"
                        title="Delete player from database"
                      >
                        <span>🗑️</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo Zoom Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-[#0c101d] border border-zinc-800 rounded-3xl p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-xs font-bold text-zinc-400">Player Photo Preview</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="w-full max-h-[70vh] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={previewImage}
                alt="Player Photo"
                referrerPolicy="no-referrer"
                className="max-h-[65vh] w-auto object-contain rounded-xl"
                onError={(e) => handleImageError(e, previewImage)}
              />
            </div>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
