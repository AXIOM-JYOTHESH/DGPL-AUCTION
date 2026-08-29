import "./App.css";
import "./styles/overrides.css";
import Header from "./components/Header";
import NavTabs from "./components/NavTabs";
import CurrentPlayer from "./components/CurrentPlayer";
import SoldBanner from "./components/SoldBanner";
import UnsoldBanner from "./components/UnsoldBanner";
import AuctionSummary from "./components/AuctionSummary";
import Toast from "./components/Toast";
import { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import PlayerProfilePage from "./pages/PlayerProfilePage";
import { useSocket } from "./context/useSocket";
import { useAuth } from "./context/authContextCore";

function App() {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState("live");
  // Real-time current player state managed at App level
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [recentlySold, setRecentlySold] = useState(null); // { name, teamName, amount, until }
  const [recentlyUnsold, setRecentlyUnsold] = useState(null); // { name, until }
  // All teams (for budget & roster updates in client)
  const [teams, setTeams] = useState([]);
  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const socketContext = useSocket() || {};
  const socket = socketContext.socket || null;
  // Intentionally ignore isConnected to keep dependency array stable; logging for diagnostics
  const isConnected = !!socketContext.isConnected;

  const lastPlayerIdRef = useRef(null);
  useEffect(() => {
    if (!socket) {
      if (import.meta.env.DEV)
        console.log("[App] No socket yet; listener not attached");
      return;
    }
    if (import.meta.env.DEV)
      console.log(
        "[App] Attaching new_player listener (socket id?)",
        socket.id
      );
    const handleNewPlayer = (player) => {
      const pid = player?._id;
      if (import.meta.env.DEV)
        console.log(
          "[Socket] Received new_player event for",
          pid,
          player?.name,
          "prev state id:",
          lastPlayerIdRef.current
        );
      // Force deep clone to break any shared references (defensive)
      const cloned = player ? JSON.parse(JSON.stringify(player)) : null;
      setCurrentPlayer((prev) => {
        const prevId = prev?._id;
        if (prevId === pid) {
          if (import.meta.env.DEV)
            console.log(
              "[Socket] Incoming player matches existing state; still updating reference to ensure rerender"
            );
          return cloned; // still replace to ensure rerender if object identity matters
        }
        if (import.meta.env.DEV)
          console.log(
            "[Socket] Updating currentPlayer from",
            prevId,
            "to",
            pid
          );
        return cloned;
      });
      lastPlayerIdRef.current = pid;
    };
    const handleNewBid = (payload) => {
      if (import.meta.env.DEV)
        console.log("[Socket] server:new_bid payload", payload);
      setCurrentPlayer((prev) => {
        if (!prev) return prev;
        if (prev._id !== payload.playerId) return prev; // ignore if for different player
        // Prefer full bidHistory from payload (already authoritative)
        let bidHistory = payload.bidHistory || prev.bidHistory || [];
        // Defensive: normalize structure (ensure bidAmount / timestamp keys exist)
        bidHistory = bidHistory.map((b) => ({
          _id: b._id || b.timestamp || `${b.teamId}-${b.bidAmount}`,
          team: b.teamId || b.team,
          teamName: b.teamName || b.team?.name || "Unknown Team",
          bidAmount: b.bidAmount,
          timestamp: b.timestamp || Date.now(),
        }));
        // If no full history but latestBid provided, append it
        if (!payload.bidHistory && payload.latestBid) {
          const lb = payload.latestBid;
          const entry = {
            _id: lb.timestamp || Date.now(),
            team: lb.teamId,
            teamName: lb.teamName,
            bidAmount: lb.bidAmount,
            timestamp: lb.timestamp || Date.now(),
          };
          bidHistory = [...(prev.bidHistory || []), entry];
        }
        // Ensure newest bids appear first for CurrentPlayer component sorting logic (it sorts desc anyway)
        return {
          ...prev,
          bidHistory,
          finalBidPrice: payload.finalBidPrice ?? prev.finalBidPrice,
          team: payload.leadingTeam?.id || prev.team,
          teamName: payload.leadingTeam?.name || prev.teamName,
        };
      });
    };
    const handlePlayerSold = (payload) => {
      // payload.player expected
      const p = payload?.player || payload; // flexibility
      if (import.meta.env.DEV) console.log("[Socket] player_sold", p?._id);
      if (p) {
        setRecentlySold({
          name: p.name,
          teamName: p.teamName || p.team?.name || "—",
          amount: p.finalBidPrice,
          until: Date.now() + 10000,
        });
        setCurrentPlayer(null); // clear live player so banner shows
        // schedule cleanup if no new player appears
        setTimeout(() => {
          setRecentlySold((prev) =>
            prev && Date.now() > prev.until ? null : prev
          );
        }, 10500);
      }
      // Update winning team budget / roster if provided
      const winningTeam = payload?.team;
      if (winningTeam?.id) {
        setTeams((prev) => {
          const id = winningTeam.id;
          const idx = prev.findIndex((t) => t._id === id || t.id === id);
          const updatedTeam = {
            ...(idx >= 0 ? prev[idx] : {}),
            ...winningTeam,
            _id: id, // normalize id field
          };
          // ensure players array & budget updated from payload (already included)
          if (idx >= 0) {
            const clone = [...prev];
            clone[idx] = updatedTeam;
            return clone;
          }
          return [...prev, updatedTeam];
        });
      }
    };
    const handlePlayerUnsold = (payload) => {
      const p = payload?.player || payload;
      if (import.meta.env.DEV) console.log("[Socket] player_unsold", p?._id);
      if (p) {
        setRecentlyUnsold({ name: p.name, until: Date.now() + 8000 });
        setCurrentPlayer(null);
        setTimeout(() => {
          setRecentlyUnsold((prev) =>
            prev && Date.now() > prev.until ? null : prev
          );
        }, 8500);
      }
    };
    const handleBidError = (payload) => {
      const msg = payload?.message || "Bid failed";
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message: msg, type: "error" }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };
    socket.on("new_player", handleNewPlayer);
    socket.on("server:new_bid", handleNewBid);
    socket.on("player_sold", handlePlayerSold); // legacy event name
    socket.on("server:player_sold", handlePlayerSold); // new namespaced one
    socket.on("server:bid_error", handleBidError);
    socket.on("player_unsold", handlePlayerUnsold);
    socket.on("server:player_unsold", handlePlayerUnsold);
    return () => {
      if (import.meta.env.DEV)
        console.log("[App] Detaching new_player listener");
      socket.off("new_player", handleNewPlayer);
      socket.off("server:new_bid", handleNewBid);
      socket.off("player_sold", handlePlayerSold);
      socket.off("server:player_sold", handlePlayerSold);
      socket.off("server:bid_error", handleBidError);
      socket.off("player_unsold", handlePlayerUnsold);
      socket.off("server:player_unsold", handlePlayerUnsold);
    };
  }, [socket, isConnected]);

  // On first load, fetch current in_auction player (in case socket event raced or page refreshed)
  useEffect(() => {
    let ignore = false;
    const loadCurrent = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/auction/current`
        );
        if (!res.ok) return;
        const data = await res.json();
        const incoming = data?.data?.player;
        if (!ignore && incoming) {
          setCurrentPlayer((prev) => {
            if (!prev) return incoming;
            if (prev._id !== incoming._id) return incoming; // replace stale player
            return prev; // same player; keep reference
          });
        }
      } catch {
        /* ignore current fetch error */
      }
    };
    loadCurrent();
    return () => {
      ignore = true;
    };
  }, []);

  // Initial fetch of all teams for budgets & rosters
  useEffect(() => {
    let abort = false;
    const fetchTeams = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/teams`);
        if (!res.ok) return;
        const data = await res.json();
        const fetched = data?.data?.docs || data?.data?.teams || [];
        if (!abort && Array.isArray(fetched)) setTeams(fetched);
      } catch (e) {
        if (import.meta.env.DEV) console.warn("[Teams] fetch failed", e);
      }
    };
    fetchTeams();
    return () => {
      abort = true;
    };
  }, []);

  // Debug: log each render of App with currentPlayer id & name
  useEffect(() => {
    if (import.meta.env.DEV)
      console.log(
        "[App Render] currentPlayer id:",
        currentPlayer?._id,
        "name:",
        currentPlayer?.name
      );
  }, [currentPlayer]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 items-center w-full max-w-md px-4">
          {toasts.map((t) => (
            <Toast key={t.id} message={t.message} type={t.type} />
          ))}
        </div>
      )}
      <Header />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <NavTabs activeTab={activeTab} onChange={setActiveTab} />
              <main className="container mx-auto px-4 pb-16">
                {activeTab === "live" && (
                  <div className="flex justify-center w-full">
                    {recentlySold && !currentPlayer ? (
                      <SoldBanner
                        name={recentlySold.name}
                        teamName={recentlySold.teamName}
                        amount={recentlySold.amount}
                      />
                    ) : recentlyUnsold && !currentPlayer ? (
                      <UnsoldBanner name={recentlyUnsold.name} />
                    ) : (
                      <CurrentPlayer
                        key={currentPlayer?._id || "no-player"}
                        player={currentPlayer || null}
                        teams={teams}
                      />
                    )}
                  </div>
                )}
                {activeTab === "summary" && <AuctionSummary />}
              </main>
              {/* Debug HUD removed */}
            </>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/player/:playerId" element={<PlayerProfilePage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin isAuthenticated={isAuthenticated} user={user} />
          }
        />
      </Routes>
    </div>
  );
}

// Inline component to require admin auth
function RequireAdmin({ isAuthenticated, user }) {
  const location = useLocation();
  const isAdmin = isAuthenticated && user?.role === "admin";
  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <AdminPage />;
}

export default App;
