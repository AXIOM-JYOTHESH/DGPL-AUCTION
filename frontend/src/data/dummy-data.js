// Dummy current player data modeled from Backend playerModel.js schema
// This represents a player currently being auctioned.
// Note: ObjectId strings are placeholders; replace with real IDs when integrating backend.

export const currentPlayer = {
  _id: "675f1c2b8f9a4b6d12345678",
  name: "Virat Kohli",
  year: 2025,
  image: "https://documents.iplt20.com/ipl/IPLHeadshot2025/2.png",
  category: "Batsman",
  basePrice: 50, // in arbitrary budget units
  status: "in_auction",
  team: null, // not yet sold
  bidHistory: [
    {
      _id: "bidh1",
      team: "675f1d3c8f9a4b6d22345670", // Royal Strikers ID placeholder
      teamName: "Royal Strikers",
      bidAmount: 55,
      timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    },
    {
      _id: "bidh2",
      team: "675f1d3c8f9a4b6d22345671", // Metro Titans ID placeholder
      teamName: "Metro Titans",
      bidAmount: 60,
      timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    },
    {
      _id: "bidh3",
      team: "675f1d3c8f9a4b6d22345672", // Coastal Kings ID placeholder
      teamName: "Coastal Kings",
      bidAmount: 68,
      timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
    {
      _id: "bidh4",
      team: "675f1d3c8f9a4b6d22345673", // Royal Strikers raises again
      teamName: "Royal Strikers",
      bidAmount: 74,
      timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    },
    {
      _id: "bidh5",
      team: "675f1d3c8f9a4b6d22345671", // Metro Titans comeback
      teamName: "Metro Titans",
      bidAmount: 80,
      timestamp: new Date().toISOString(),
    },
  ],
  // Derived convenience data (not in original schema) – optional for UI usage
  currentBid: 80,
  leadingTeamName: "Metro Titans",
};
