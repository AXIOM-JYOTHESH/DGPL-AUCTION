/**
 * Formats a Prisma Player record (with optional relations) into the JSON shape
 * expected by the React frontend (mimicking the previous Mongoose contract).
 */
function formatPlayer(player) {
  if (!player) return null;

  const plain = {
    _id: player.id,
    id: player.id,
    name: player.name,
    isCaptain: player.isCaptain,
    year: player.year,
    image: player.image,
    category: player.category,
    basePrice: player.basePrice,
    status: player.status,
    team: player.teamId,
    teamName: player.team?.name || null,
    finalBidPrice: player.finalBidPrice,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  };

  if (Array.isArray(player.bids)) {
    plain.bidHistory = player.bids.map((b) => ({
      _id: b.id,
      id: b.id,
      team: b.teamId,
      teamName: b.team?.name || 'Unknown Team',
      bidAmount: b.bidAmount,
      timestamp: b.timestamp,
    }));
  } else {
    plain.bidHistory = [];
  }

  return plain;
}

/**
 * Formats a Prisma Team record into the shape expected by the React frontend.
 */
function formatTeam(team) {
  if (!team) return null;

  return {
    _id: team.id,
    id: team.id,
    name: team.name,
    image: team.image,
    budget: team.budget,
    captain: team.captain
      ? {
          _id: team.captain.id,
          id: team.captain.id,
          name: team.captain.name,
          image: team.captain.image,
          isCaptain: team.captain.isCaptain,
          category: team.captain.category,
        }
      : team.captainId,
    players: Array.isArray(team.players)
      ? team.players.map((p) => ({
          _id: p.id,
          id: p.id,
          name: p.name,
          image: p.image,
          category: p.category,
          isCaptain: p.isCaptain,
          finalBidPrice: p.finalBidPrice,
          basePrice: p.basePrice,
        }))
      : [],
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

module.exports = { formatPlayer, formatTeam };
