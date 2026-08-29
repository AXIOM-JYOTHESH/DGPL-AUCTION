// Dummy sold players summary data for Auction Summary view.
// Each object mimics a persisted Player after being sold.
// NOTE: _id values are placeholder Mongo-like strings; replace when integrating backend.

export const soldPlayers = [
  {
    _id: "675f1e10a1b0c1d001000001",
    name: "Rohit Sharma",
    year: 3,
    category: "Batsman",
    image: "https://via.placeholder.com/120x160.png?text=Rohit",
    teamName: "Royal Strikers",
    finalBidPrice: 72,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000002",
    name: "Jasprit Bumrah",
    year: 2,
    category: "Bowler",
    image: "https://via.placeholder.com/120x160.png?text=Bumrah",
    teamName: "Metro Titans",
    finalBidPrice: 88,
    timestamp: new Date(
      Date.now() - 1000 * 60 * 60 * 5 - 1000 * 60 * 10
    ).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000003",
    name: "Hardik Pandya",
    year: 4,
    category: "All-Rounder",
    image: "https://via.placeholder.com/120x160.png?text=Hardik",
    teamName: "Coastal Kings",
    finalBidPrice: 95,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000004",
    name: "KL Rahul",
    year: 1,
    category: "Batsman",
    image: "https://via.placeholder.com/120x160.png?text=Rahul",
    teamName: "Desert Falcons",
    finalBidPrice: 68,
    timestamp: new Date(
      Date.now() - 1000 * 60 * 60 * 4 - 1000 * 60 * 30
    ).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000005",
    name: "Ravindra Jadeja",
    year: 4,
    category: "All-Rounder",
    image: "https://via.placeholder.com/120x160.png?text=Jadeja",
    teamName: "Emerald Warriors",
    finalBidPrice: 102,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000006",
    name: "Suryakumar Yadav",
    year: 2,
    category: "Batsman",
    image: "https://via.placeholder.com/120x160.png?text=SKY",
    teamName: "Metro Titans",
    finalBidPrice: 76,
    timestamp: new Date(
      Date.now() - 1000 * 60 * 60 * 3 - 1000 * 60 * 40
    ).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000007",
    name: "Mohammed Shami",
    year: 3,
    category: "Bowler",
    image: "https://via.placeholder.com/120x160.png?text=Shami",
    teamName: "Highland Rangers",
    finalBidPrice: 71,
    timestamp: new Date(
      Date.now() - 1000 * 60 * 60 * 3 - 1000 * 60 * 15
    ).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000008",
    name: "Shubman Gill",
    year: 1,
    category: "Batsman",
    image: "https://via.placeholder.com/120x160.png?text=Gill",
    teamName: "Royal Strikers",
    finalBidPrice: 83,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000009",
    name: "Bhuvneshwar Kumar",
    year: 4,
    category: "Bowler",
    image: "https://via.placeholder.com/120x160.png?text=Bhuvi",
    teamName: "Coastal Kings",
    finalBidPrice: 66,
    timestamp: new Date(
      Date.now() - 1000 * 60 * 60 * 2 - 1000 * 60 * 50
    ).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d00100000a",
    name: "Yuzvendra Chahal",
    year: 2,
    category: "Bowler",
    image: "https://via.placeholder.com/120x160.png?text=Chahal",
    teamName: "Metro Titans",
    finalBidPrice: 64,
    timestamp: new Date(
      Date.now() - 1000 * 60 * 60 * 2 - 1000 * 60 * 25
    ).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d00100000b",
    name: "Ishan Kishan",
    year: 1,
    category: "Wicket-Keeper",
    image: "https://via.placeholder.com/120x160.png?text=Ishan",
    teamName: "Emerald Warriors",
    finalBidPrice: 69,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d00100000c",
    name: "Axar Patel",
    year: 3,
    category: "All-Rounder",
    image: "https://via.placeholder.com/120x160.png?text=Axar",
    teamName: "Highland Rangers",
    finalBidPrice: 74,
    timestamp: new Date(
      Date.now() - 1000 * 60 * 60 * 1 - 1000 * 60 * 55
    ).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d00100000d",
    name: "Rishabh Pant",
    year: 2,
    category: "Wicket-Keeper",
    image: "https://via.placeholder.com/120x160.png?text=Pant",
    teamName: "Metro Titans",
    finalBidPrice: 90,
    timestamp: new Date(
      Date.now() - 1000 * 60 * 60 * 1 - 1000 * 60 * 40
    ).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d00100000e",
    name: "Shardul Thakur",
    year: 4,
    category: "Bowler",
    image: "https://via.placeholder.com/120x160.png?text=Shardul",
    teamName: "Desert Falcons",
    finalBidPrice: 58,
    timestamp: new Date(
      Date.now() - 1000 * 60 * 60 * 1 - 1000 * 60 * 20
    ).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d00100000f",
    name: "Prithvi Shaw",
    year: 1,
    category: "Batsman",
    image: "https://via.placeholder.com/120x160.png?text=Shaw",
    teamName: "Highland Rangers",
    finalBidPrice: 57,
    timestamp: new Date(
      Date.now() - 1000 * 60 * 60 * 1 - 1000 * 60 * 5
    ).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000010",
    name: "Umran Malik",
    year: 2,
    category: "Bowler",
    image: "https://documents.iplt20.com/ipl/IPLHeadshot2024/637.png",
    teamName: "Royal Strikers",
    finalBidPrice: 62,
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000011",
    name: "Deepak Chahar",
    year: 3,
    category: "Bowler",
    image: "https://via.placeholder.com/120x160.png?text=Chahar",
    teamName: "Coastal Kings",
    finalBidPrice: 61,
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000012",
    name: "Washington Sundar",
    year: 2,
    category: "All-Rounder",
    image: "https://via.placeholder.com/120x160.png?text=Sundar",
    teamName: "Emerald Warriors",
    finalBidPrice: 59,
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000013",
    name: "Sanju Samson",
    year: 4,
    category: "Wicket-Keeper",
    image: "https://via.placeholder.com/120x160.png?text=Samson",
    teamName: "Highland Rangers",
    finalBidPrice: 73,
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    _id: "675f1e10a1b0c1d001000014",
    name: "Mayank Agarwal",
    year: 1,
    category: "Batsman",
    image: "https://via.placeholder.com/120x160.png?text=Mayank",
    teamName: "Desert Falcons",
    finalBidPrice: 54,
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];
