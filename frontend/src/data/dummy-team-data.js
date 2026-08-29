// Dummy team aggregation data derived from soldPlayers (see dummy-summary-data.js)
// Each team starts with a virtual startingBudget of 5000 and we subtract spent amounts.
// Schema reference (teamModel.js): { name, owner, captain (Player ref), image (logo), budget, players[] }

export const teams = [
  {
    _id: "66af0c11aa01f0a000000001",
    name: "Royal Strikers",
    owner: "Royal Sports Group",
    logoUrl: "https://via.placeholder.com/96x96.png?text=RS",
    startingBudget: 5000,
    totalSpent: 217,
    remainingBalance: 5000 - 217,
    captain: "675f1e10a1b0c1d001000008", // Shubman Gill (highest bid)
    players: [
      "675f1e10a1b0c1d001000001", // Rohit Sharma
      "675f1e10a1b0c1d001000008", // Shubman Gill
      "675f1e10a1b0c1d001000010", // Umran Malik
    ],
  },
  {
    _id: "66af0c11aa01f0a000000002",
    name: "Metro Titans",
    owner: "Metro Sports Holdings",
    logoUrl: "https://via.placeholder.com/96x96.png?text=MT",
    startingBudget: 5000,
    totalSpent: 318,
    remainingBalance: 5000 - 318,
    captain: "675f1e10a1b0c1d00100000d", // Rishabh Pant (highest bid)
    players: [
      "675f1e10a1b0c1d001000002", // Jasprit Bumrah
      "675f1e10a1b0c1d001000006", // Suryakumar Yadav
      "675f1e10a1b0c1d00100000a", // Yuzvendra Chahal
      "675f1e10a1b0c1d00100000d", // Rishabh Pant
    ],
  },
  {
    _id: "66af0c11aa01f0a000000003",
    name: "Coastal Kings",
    owner: "Coastal Cricket Ventures",
    logoUrl: "https://via.placeholder.com/96x96.png?text=CK",
    startingBudget: 5000,
    totalSpent: 222,
    remainingBalance: 5000 - 222,
    captain: "675f1e10a1b0c1d001000003", // Hardik Pandya (highest bid)
    players: [
      "675f1e10a1b0c1d001000003", // Hardik Pandya
      "675f1e10a1b0c1d001000009", // Bhuvneshwar Kumar
      "675f1e10a1b0c1d001000011", // Deepak Chahar
    ],
  },
  {
    _id: "66af0c11aa01f0a000000004",
    name: "Desert Falcons",
    owner: "Desert League Consortium",
    logoUrl: "https://via.placeholder.com/96x96.png?text=DF",
    startingBudget: 5000,
    totalSpent: 180,
    remainingBalance: 5000 - 180,
    captain: "675f1e10a1b0c1d001000004", // KL Rahul (highest bid)
    players: [
      "675f1e10a1b0c1d001000004", // KL Rahul
      "675f1e10a1b0c1d00100000e", // Shardul Thakur
      "675f1e10a1b0c1d001000014", // Mayank Agarwal
    ],
  },
  {
    _id: "66af0c11aa01f0a000000005",
    name: "Emerald Warriors",
    owner: "Emerald Cricket Group",
    logoUrl: "https://via.placeholder.com/96x96.png?text=EW",
    startingBudget: 5000,
    totalSpent: 230,
    remainingBalance: 5000 - 230,
    captain: "675f1e10a1b0c1d001000005", // Ravindra Jadeja (highest bid)
    players: [
      "675f1e10a1b0c1d001000005", // Ravindra Jadeja
      "675f1e10a1b0c1d00100000b", // Ishan Kishan
      "675f1e10a1b0c1d001000012", // Washington Sundar
    ],
  },
  {
    _id: "66af0c11aa01f0a000000006",
    name: "Highland Rangers",
    owner: "Highland Sports Trust",
    logoUrl: "https://via.placeholder.com/96x96.png?text=HR",
    startingBudget: 5000,
    totalSpent: 275,
    remainingBalance: 5000 - 275,
    captain: "675f1e10a1b0c1d00100000c", // Axar Patel (highest bid)
    players: [
      "675f1e10a1b0c1d001000007", // Mohammed Shami
      "675f1e10a1b0c1d00100000c", // Axar Patel
      "675f1e10a1b0c1d00100000f", // Prithvi Shaw
      "675f1e10a1b0c1d001000013", // Sanju Samson
    ],
  },
];

// Utility helper (optional) to find a team by player ID (can be imported elsewhere)
export const getTeamByPlayerId = (playerId) =>
  teams.find((t) => t.players.includes(playerId));
