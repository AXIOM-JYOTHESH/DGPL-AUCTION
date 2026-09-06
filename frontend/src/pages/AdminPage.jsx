import { useState, useEffect } from "react";
import { useAuth } from "../context/authContextCore";
import YearSelector from "../components/admin/YearSelector";
import PlayerTable from "../components/admin/PlayerTable";
import { useSocket } from "../context/useSocket";
import AuctionTimer from "../components/AuctionTimer";
import AdminTimerControls from "../components/admin/AdminTimerControls";

// Admin Control Panel: select academic year, view unsold players for that year, start an auction
const yearOptions = [
  { label: "4th Year", value: 4 },
  { label: "3rd Year", value: 3 },
  { label: "2nd Year", value: 2 },
  { label: "1st Year", value: 1 },
];

export default function AdminPage() {
  const { token } = useAuth();
  const socketContext = useSocket() || {};
  const socket = socketContext.socket || null;
  const [selectedYear, setSelectedYear] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [auctionMessage, setAuctionMessage] = useState(null);
  const [isDrawingRandom, setIsDrawingRandom] = useState(false);
  const [appConfig, setAppConfig] = useState({
    privacyMode: false,
    auctionCompleted: false,
  });

  // Load tournament config & listen for real-time changes
  useEffect(() => {
    let ignore = false;
    const fetchConfig = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/auction/config`
        );
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data?.data) {
            setAppConfig({
              privacyMode: Boolean(data.data.privacyMode),
              auctionCompleted: Boolean(data.data.auctionCompleted),
            });
          }
        }
      } catch {
        /* ignore */
      }
    };
    fetchConfig();

    if (!socket) return;
    const handleConfigUpdate = (update) => {
      setAppConfig((prev) => ({
        ...prev,
        ...update,
      }));
    };
    socket.on("auction:config_update", handleConfigUpdate);

    return () => {
      ignore = true;
      socket.off("auction:config_update", handleConfigUpdate);
    };
  }, [socket]);

  const handleTogglePrivacy = () => {
    const nextVal = !appConfig.privacyMode;
    socket?.emit("admin:timer_action", {
      action: "set_privacy",
      privacyMode: nextVal,
    });
    setAppConfig((prev) => ({ ...prev, privacyMode: nextVal }));
    setAuctionMessage(
      nextVal
        ? "🔒 Privacy Mode Activated: Rival team purses and bids are now hidden from captains."
        : "🌐 Public Mode: All auction metrics are now visible."
    );
  };

  const handleToggleAuctionCompleted = () => {
    const nextVal = !appConfig.auctionCompleted;
    socket?.emit("admin:timer_action", {
      action: "set_auction_completed",
      auctionCompleted: nextVal,
    });
    setAppConfig((prev) => ({ ...prev, auctionCompleted: nextVal }));
    setAuctionMessage(
      nextVal
        ? "🏆 Tournament Auction Finalized! All financial records & rosters are permanently unlocked."
        : "Auction status reopened."
    );
  };

  const handleDrawRandomPlayer = async () => {
    if (isDrawingRandom) return;
    setIsDrawingRandom(true);
    setAuctionMessage("🎲 Drawing random player from available pool...");
    try {
      if (socket) {
        socket.emit("admin:start_random_player");
      }
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/auction/random`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to draw random player");
      }
      const data = await res.json();
      const player = data?.data?.player;
      if (player) {
        setAuctionMessage(
          `🎲 Drawn onto live stage: ${player.name} (${player.basePrice || 0} Pts)!`
        );
      }
      await refreshYearPlayers();
    } catch (err) {
      setAuctionMessage(err.message || "Error drawing random player");
    } finally {
      setTimeout(() => setIsDrawingRandom(false), 800);
    }
  };

  // Fetch players when year changes (and a year is selected)
  useEffect(() => {
    if (selectedYear == null) return;
    let aborted = false;
    const fetchPlayers = async () => {
      setLoading(true);
      setError(null);
      setPlayers([]);
      try {
        // Fetch all players for the year (exclude sold later client-side)
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/players?year=${selectedYear}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (!res.ok) throw new Error(`Failed to load players (${res.status})`);
        const data = await res.json();
        if (!aborted) setPlayers(data.data?.players || []);
      } catch (err) {
        if (!aborted) setError(err.message || "Error fetching players");
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    fetchPlayers();
    return () => {
      aborted = true;
    };
  }, [selectedYear, token]);

  // Attach socket bid events to update players list in realtime for current auction player.
  useEffect(() => {
    if (!socket) return;
    const handleNewBid = (payload) => {
      setPlayers((prev) => {
        return prev.map((p) => {
          if (p._id !== payload.playerId) return p;
          // update bidHistory and finalBidPrice / team
          let bidHistory = payload.bidHistory || p.bidHistory || [];
          bidHistory = bidHistory.map((b) => ({
            _id: b._id || b.timestamp || `${b.teamId}-${b.bidAmount}`,
            team: b.teamId || b.team,
            bidAmount: b.bidAmount,
            timestamp: b.timestamp || Date.now(),
            teamName: b.teamName,
          }));
          if (!payload.bidHistory && payload.latestBid) {
            const lb = payload.latestBid;
            bidHistory = [
              ...bidHistory,
              {
                _id: lb.timestamp || Date.now(),
                team: lb.teamId,
                bidAmount: lb.bidAmount,
                timestamp: lb.timestamp || Date.now(),
                teamName: lb.teamName,
              },
            ];
          }
          return {
            ...p,
            bidHistory,
            finalBidPrice: payload.finalBidPrice ?? p.finalBidPrice,
            team: payload.leadingTeam?.id || p.team,
            teamName: payload.leadingTeam?.name || p.teamName,
            status: "in_auction",
          };
        });
      });
    };
    const handleNewPlayer = (player) => {
      // mark all others unsold if still unsold, set this one in_auction
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          status:
            p._id === player._id
              ? "in_auction"
              : p.status === "in_auction"
              ? "unsold"
              : p.status,
        }))
      );
    };
    const handlePlayerSold = (payload) => {
      const soldPlayer = payload?.player || payload;
      if (!soldPlayer?._id) return;
      // Update status to 'sold' (table hides sold entries via filter) without refetch
      setPlayers((prev) =>
        prev.map((p) =>
          p._id === soldPlayer._id
            ? {
                ...p,
                status: "sold",
                finalBidPrice: soldPlayer.finalBidPrice ?? p.finalBidPrice,
                team: soldPlayer.team?._id || soldPlayer.team || p.team,
                teamName:
                  soldPlayer.team?.name || soldPlayer.teamName || p.teamName,
              }
            : p
        )
      );
    };
    const handlePlayerUnsold = (player) => {
      if (!player?._id) return;
      setPlayers((prev) =>
        prev.map((p) => (p._id === player._id ? { ...p, status: "unsold" } : p))
      );
    };
    socket.on("server:new_bid", handleNewBid);
    socket.on("new_player", handleNewPlayer);
    socket.on("server:player_sold", handlePlayerSold);
    socket.on("player_unsold", handlePlayerUnsold);
    // Listen for namespaced unsold event if backend adds it later
    socket.on("server:player_unsold", handlePlayerUnsold);
    return () => {
      socket.off("server:new_bid", handleNewBid);
      socket.off("new_player", handleNewPlayer);
      socket.off("server:player_sold", handlePlayerSold);
      socket.off("player_unsold", handlePlayerUnsold);
      socket.off("server:player_unsold", handlePlayerUnsold);
    };
  }, [socket]);

  const refreshYearPlayers = async () => {
    if (selectedYear == null) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/players?year=${selectedYear}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.data?.players || []);
      }
    } catch {
      /* ignore refresh errors */
    }
  };

  const handleStartAuction = async (playerId) => {
    if (!token) {
      setAuctionMessage("You must be logged in as admin to start auctions.");
      return;
    }
    setAuctionMessage(null);
    setActionLoadingId(playerId);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/auction/start`,
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
        throw new Error(txt || "Failed to start auction");
      }
      setAuctionMessage("Auction started for selected player.");
      // Refresh list to update statuses
      await refreshYearPlayers();
    } catch (err) {
      setAuctionMessage(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSellPlayer = async (playerId) => {
    // Find player from current list to auto derive winning team & price
    const player = players.find((p) => p._id === playerId);
    if (!player) return;
    // Determine winning team from last bid in bidHistory if present else player.team
    let winningTeamId = null;
    let finalBidPrice = null;
    if (player.bidHistory && player.bidHistory.length) {
      const last = player.bidHistory[player.bidHistory.length - 1];
      winningTeamId = (last.team && last.team._id) || last.team || player.team;
      finalBidPrice = last.bidAmount;
    } else {
      winningTeamId = player.team;
      finalBidPrice = player.finalBidPrice || player.basePrice || 0;
    }
    if (!winningTeamId) {
      setAuctionMessage("No winning team determined (no bids and no team).");
      return;
    }
    setActionLoadingId(playerId);
    setAuctionMessage(null);
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
      if (!res.ok) throw new Error(await res.text());
      setAuctionMessage("Player sold successfully.");
      // Optimistic local update (will be confirmed / enriched by socket event)
      setPlayers((prev) =>
        prev.map((p) =>
          p._id === playerId
            ? {
                ...p,
                status: "sold",
                finalBidPrice: finalBidPrice,
                team: winningTeamId,
              }
            : p
        )
      );
    } catch (err) {
      setAuctionMessage(err.message || "Failed to sell player");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkUnsold = async (playerId) => {
    setActionLoadingId(playerId);
    setAuctionMessage(null);
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
      if (!res.ok) throw new Error(await res.text());
      setAuctionMessage("Player marked unsold.");
      // Optimistic local status update; socket event will also adjust
      setPlayers((prev) =>
        prev.map((p) => (p._id === playerId ? { ...p, status: "unsold" } : p))
      );
    } catch (err) {
      setAuctionMessage(err.message || "Failed to mark unsold");
    } finally {
      setActionLoadingId(null);
    }
  };

  const livePlayer = players.find((p) => p.status === "in_auction");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-brand tracking-tight flex items-center gap-2.5">
            <span>🛡️</span>
            <span>Admin Control Console</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage live auctions, push random contenders, toggle privacy, and finalize tournament rosters.
          </p>
        </div>

        {/* Master Random Draw Action Button */}
        <button
          type="button"
          onClick={handleDrawRandomPlayer}
          disabled={isDrawingRandom}
          className="py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 font-black text-sm sm:text-base flex items-center gap-2.5 shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-amber-300 hover:brightness-110 active:scale-95 transition-all"
        >
          <span className={`text-lg ${isDrawingRandom ? "animate-spin" : ""}`}>
            🎲
          </span>
          <span>{isDrawingRandom ? "Drawing Contender..." : "Draw Random Player"}</span>
        </button>
      </div>

      {/* Tournament Privacy & Completion Operations Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Privacy Mode Card */}
        <div className="bg-[#0c101d] border border-zinc-800 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔒</span>
              <span className="text-sm font-extrabold text-white">
                Captain Privacy Mode
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border font-mono ${
                  appConfig.privacyMode
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {appConfig.privacyMode ? "ACTIVE" : "OFF"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Hides other teams' remaining purse & player purchase prices in summary.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTogglePrivacy}
            className={`py-2 px-3.5 rounded-xl font-extrabold text-xs transition border flex-shrink-0 ${
              appConfig.privacyMode
                ? "bg-amber-500 text-zinc-950 border-amber-400 shadow hover:brightness-105"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
            }`}
          >
            {appConfig.privacyMode ? "Turn Off" : "Turn On"}
          </button>
        </div>

        {/* Master Auction Completed Card */}
        <div className="bg-[#0c101d] border border-zinc-800 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏁</span>
              <span className="text-sm font-extrabold text-white">
                Tournament Status
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border font-mono ${
                  appConfig.auctionCompleted
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {appConfig.auctionCompleted ? "COMPLETED" : "LIVE AUCTION"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {appConfig.auctionCompleted
                ? "Auction finalized: all data is 100% public to all users."
                : "Marks tournament finished and automatically unmasks all stats."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleAuctionCompleted}
            className={`py-2 px-3.5 rounded-xl font-extrabold text-xs transition border flex-shrink-0 ${
              appConfig.auctionCompleted
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                : "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-black border-emerald-400 shadow hover:brightness-105"
            }`}
          >
            {appConfig.auctionCompleted ? "Reopen Auction" : "Finalize Auction"}
          </button>
        </div>
      </div>

      {/* Real-Time Live Player Clock & Gavel Console */}
      {livePlayer && (
        <div className="mb-8 p-5 rounded-2xl bg-[#0c101d] border border-amber-500/40 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                ACTIVE ON STAGE: {livePlayer.name}
              </span>
            </div>
            <span className="text-xs font-bold text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
              Current Bid: {livePlayer.finalBidPrice ?? livePlayer.basePrice ?? 0} Pts
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AuctionTimer />
            <AdminTimerControls
              player={livePlayer}
              onSell={handleSellPlayer}
              onUnsold={handleMarkUnsold}
            />
          </div>
        </div>
      )}

      <YearSelector
        yearOptions={yearOptions}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
      />

      {selectedYear == null && (
        <p className="text-zinc-500 text-sm">
          Select an academic year above to inspect available players.
        </p>
      )}

      {loading && (
        <p className="text-amber-400 text-xs font-bold animate-pulse">
          Loading players from roster...
        </p>
      )}

      {error && (
        <div className="text-red-300 bg-red-500/15 border border-red-500/30 rounded-xl p-3 text-xs font-semibold mb-4">
          {error}
        </div>
      )}

      {auctionMessage && (
        <div className="mb-4 text-xs font-bold text-amber-300 bg-amber-500/15 px-4 py-3 rounded-xl border border-amber-500/30">
          {auctionMessage}
        </div>
      )}

      {!loading &&
        !error &&
        selectedYear != null &&
        players.filter((p) => p.status !== "sold").length === 0 && (
          <p className="text-zinc-500 text-sm py-4">
            No available players found for this year group.
          </p>
        )}

      {!loading &&
        !error &&
        players.filter((p) => p.status !== "sold").length > 0 && (
          <PlayerTable
            players={players}
            onStartAuction={handleStartAuction}
            onSellPlayer={handleSellPlayer}
            onMarkUnsold={handleMarkUnsold}
            actionLoadingId={actionLoadingId}
          />
        )}
    </div>
  );
}
