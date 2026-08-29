import { useState, useEffect } from "react";
import { useAuth } from "../context/authContextCore";
import YearSelector from "../components/admin/YearSelector";
import PlayerTable from "../components/admin/PlayerTable";
import { useSocket } from "../context/useSocket";

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

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold mb-8 text-blue-900 drop-shadow-sm tracking-wide">
        Admin Control Panel
      </h1>

      <YearSelector
        yearOptions={yearOptions}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
      />

      {selectedYear == null && (
        <p className="text-gray-600">
          Select a year to view available players.
        </p>
      )}

      {loading && (
        <p className="text-gray-500 animate-pulse">Loading players...</p>
      )}

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {auctionMessage && (
        <div className="mb-4 text-sm text-indigo-700 bg-indigo-50 px-3 py-2 rounded border border-indigo-200">
          {auctionMessage}
        </div>
      )}

      {!loading &&
        !error &&
        selectedYear != null &&
        players.filter((p) => p.status !== "sold").length === 0 && (
          <p className="text-gray-600">No available players for this year.</p>
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
