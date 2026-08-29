import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../context/authContextCore";
import SummarySkeleton from "./SummarySkeleton";
import SummaryFilter from "./SummaryFilter";
import RecentSoldView from "./RecentSoldView";
import AvailablePlayersView from "./AvailablePlayersView";
import TeamDetailView from "./TeamDetailView";

/**
 * AuctionSummary Component
 * Displays either the Recent Bids view or a Team-specific summary depending on selectedTeamId.
 * Dark theme, Tailwind CSS styling.
 */
const AuctionSummary = () => {
  const { token } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        // Expecting shape { data: { teams: [...] }} or similar; normalize
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
      // Try last bid timestamp if present
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
    // Add any players[] that point to this team but not present in team.players yet
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

  return (
    <section className="w-full mx-auto max-w-7xl px-4 py-6">
      <SummaryFilter
        teams={teams}
        selectedTeamId={selectedTeamId}
        onChange={setSelectedTeamId}
      />
      {selectedTeamId === "available" ? (
        <AvailablePlayersView availablePlayers={availablePlayers} />
      ) : selectedTeamId ? (
        <TeamDetailView team={selectedTeam} teamPlayers={selectedTeamPlayers} />
      ) : (
        <RecentSoldView soldPlayers={recentSold} teamMap={teamMap} />
      )}
    </section>
  );
};

export default AuctionSummary;
