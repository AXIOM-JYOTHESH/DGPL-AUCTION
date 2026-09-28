import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../context/authContextCore";
import { useSocket } from "../context/useSocket";
import SummarySkeleton from "./SummarySkeleton";
import SummaryFilter from "./SummaryFilter";
import RecentSoldView from "./RecentSoldView";
import AvailablePlayersView from "./AvailablePlayersView";
import TeamDetailView from "./TeamDetailView";

/**
 * AuctionSummary Component
 * Displays either the Recent Bids view or a Team-specific summary depending on selectedTeamId.
 * Supports privacyMode (masking rival finances) and auctionCompleted (public disclosure).
 */
const AuctionSummary = () => {
  const { token } = useAuth();
  const { socket } = useSocket() || {};
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      } catch (err) {
        console.warn("Could not fetch auction config", err);
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

  // Real-time listener for incoming registrations via webhook
  useEffect(() => {
    if (!socket) return;
    const handlePlayerRegistered = (newPlayer) => {
      if (!newPlayer) return;
      const pid = newPlayer._id || newPlayer.id;
      setPlayers((prev) => {
        const idx = prev.findIndex((p) => (p._id || p.id) === pid);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = newPlayer;
          return updated;
        }
        return [...prev, newPlayer];
      });
      if (newPlayer.status === "unsold") {
        setAvailablePlayers((prev) => {
          const idx = prev.findIndex((p) => (p._id || p.id) === pid);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = newPlayer;
            return updated;
          }
          return [...prev, newPlayer];
        });
      }
    };
    socket.on("player_registered", handlePlayerRegistered);
    return () => {
      socket.off("player_registered", handlePlayerRegistered);
    };
  }, [socket]);

  // Fetch teams & players in parallel on mount
  useEffect(() => {
    let isCancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;
        const base = import.meta.env.VITE_API_URL;
        const [teamsRes, playersRes, unsoldRes] = await Promise.all([
          fetch(`${base}/api/v1/teams`, { headers }),
          fetch(`${base}/api/v1/players`, { headers }),
          fetch(`${base}/api/v1/players?status=unsold`, { headers }),
        ]);
        if (!teamsRes.ok || !playersRes.ok || !unsoldRes.ok) {
          throw new Error("Failed to load auction data");
        }
        const teamsData = await teamsRes.json();
        const playersData = await playersRes.json();
        const unsoldData = await unsoldRes.json();
        if (isCancelled) return;

        const rawTeams =
          teamsData.data?.teams ||
          teamsData.data?.docs ||
          teamsData.data ||
          teamsData;
        const rawPlayers =
          playersData.data?.players ||
          playersData.data?.docs ||
          playersData.data ||
          playersData;
        const rawUnsold =
          unsoldData.data?.players ||
          unsoldData.data?.docs ||
          unsoldData.data ||
          unsoldData;
        setTeams(Array.isArray(rawTeams) ? rawTeams : []);
        setPlayers(Array.isArray(rawPlayers) ? rawPlayers : []);
        setAvailablePlayers(Array.isArray(rawUnsold) ? rawUnsold : []);
      } catch (err) {
        if (!isCancelled) setError(err.message || "Unknown error");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [token]);

  // Map for quick team lookup
  const teamMap = useMemo(() => new Map(teams.map((t) => [t._id, t])), [teams]);

  // Recently sold (exclude captains)
  const recentSold = useMemo(() => {
    const sold = players.filter((p) => p.status === "sold" && !p.isCaptain);
    return sold.slice().sort((a, b) => {
      const aTime = a.bidHistory?.length
        ? new Date(a.bidHistory[a.bidHistory.length - 1].timestamp).getTime()
        : 0;
      const bTime = b.bidHistory?.length
        ? new Date(b.bidHistory[b.bidHistory.length - 1].timestamp).getTime()
        : 0;
      return bTime - aTime || (b.finalBidPrice || 0) - (a.finalBidPrice || 0);
    });
  }, [players]);

  const selectedTeam = useMemo(
    () => (selectedTeamId ? teamMap.get(selectedTeamId) || null : null),
    [selectedTeamId, teamMap]
  );

  const selectedTeamPlayers = useMemo(() => {
    if (!selectedTeam) return [];
    const byId = new Map(players.map((p) => [p._id || p.id, p]));
    const baseList = Array.isArray(selectedTeam.players)
      ? selectedTeam.players
      : [];
    const merged = baseList.map((tp) => byId.get(tp._id || tp.id) || tp);
    const extra = players.filter((p) => {
      const teamId =
        typeof p.team === "object" && p.team !== null
          ? p.team._id || p.team.id
          : p.team;
      const id = p._id || p.id;
      return (
        teamId === selectedTeam._id &&
        !merged.some((m) => (m._id || m.id) === id)
      );
    });
    return merged.concat(extra).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedTeam, players]);

  if (loading) {
    return <SummarySkeleton />;
  }

  if (error) {
    return (
      <section className="w-full mx-auto max-w-7xl px-4 py-10">
        <p className="text-center text-red-400 text-sm">{error}</p>
      </section>
    );
  }

  const { privacyMode, auctionCompleted } = appConfig;

  return (
    <section className="w-full mx-auto max-w-7xl px-4 py-6 space-y-5">
      {/* Tournament Status Ribbon */}
      {auctionCompleted ? (
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/50 rounded-2xl p-4 shadow-xl flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-amber-300 tracking-wide">
              AUCTION CONCLUDED — OFFICIAL TOURNAMENT ROSTERS RELEASED
            </h4>
            <p className="text-xs text-zinc-300">
              The tournament auction is completed. All team player purchases and purse statements are now 100% public.
            </p>
          </div>
        </div>
      ) : privacyMode ? (
        <div className="bg-[#0c101d] border border-amber-500/30 rounded-2xl p-4 shadow-xl flex items-center gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <h4 className="text-sm font-extrabold text-amber-300 tracking-wide flex items-center gap-2">
              <span>ACTIVE PRIVACY MODE</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Encrypted Purses
              </span>
            </h4>
            <p className="text-xs text-zinc-400">
              Rival team remaining purse points and purchase costs are masked during the live auction. All data will unlock automatically once the auction concludes.
            </p>
          </div>
        </div>
      ) : null}

      <SummaryFilter
        teams={teams}
        selectedTeamId={selectedTeamId}
        onChange={setSelectedTeamId}
      />

      {selectedTeamId === "available" ? (
        <AvailablePlayersView availablePlayers={availablePlayers} />
      ) : selectedTeamId ? (
        <TeamDetailView
          team={selectedTeam}
          teamPlayers={selectedTeamPlayers}
          privacyMode={privacyMode}
          auctionCompleted={auctionCompleted}
        />
      ) : (
        <RecentSoldView
          soldPlayers={recentSold}
          teamMap={teamMap}
          privacyMode={privacyMode}
          auctionCompleted={auctionCompleted}
        />
      )}
    </section>
  );
};

export default AuctionSummary;
