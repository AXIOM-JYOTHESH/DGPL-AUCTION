/**
 * Exports final team rosters to a clean CSV file.
 * Format: Team Name, Captain Name, Player Name, Sold Points
 */
export async function downloadSquadsCSV(apiUrl = import.meta.env.VITE_API_URL) {
  try {
    const res = await fetch(`${apiUrl}/api/v1/teams`);
    if (!res.ok) throw new Error("Failed to fetch teams data");
    const json = await res.json();
    const teams = json.data?.teams || [];

    // Exact columns requested: Team Name, Captain Name, Player Name, Sold Points
    const rows = [["Team Name", "Captain Name", "Player Name", "Sold Points"]];

    teams.forEach((t) => {
      const teamName = t.name || "Unknown Team";
      let captainName = "Not Assigned";

      if (t.captain && typeof t.captain === "object" && t.captain.name) {
        captainName = t.captain.name;
      } else if (Array.isArray(t.players)) {
        const cap = t.players.find((p) => p.isCaptain);
        if (cap && cap.name) {
          captainName = cap.name;
        }
      } else if (typeof t.captain === "string") {
        captainName = t.captain;
      } else if (t.user && t.user.name) {
        captainName = t.user.name;
      }

      if (t.players && t.players.length > 0) {
        t.players.forEach((p) => {
          rows.push([
            `"${teamName.replace(/"/g, '""')}"`,
            `"${captainName.replace(/"/g, '""')}"`,
            `"${(p.name || "").replace(/"/g, '""')}"`,
            p.finalBidPrice != null ? p.finalBidPrice : (p.basePrice || 0),
          ]);
        });
      } else {
        rows.push([
          `"${teamName.replace(/"/g, '""')}"`,
          `"${captainName.replace(/"/g, '""')}"`,
          "None",
          "0",
        ]);
      }
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DGPL_2026_Final_Squads.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Export error:", err);
    alert("Failed to export squads: " + err.message);
  }
}
