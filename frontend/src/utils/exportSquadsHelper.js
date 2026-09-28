/**
 * Exports final team rosters to a clean CSV file.
 * Format: Team Name, Captain Name, Player Name, Sold Points
 */
export async function downloadSquadsCSV(apiUrl = import.meta.env.VITE_API_URL) {
  try {
    const res = await fetch(`${apiUrl}/api/v1/teams`);
    if (!res.ok) throw new Error("Failed to fetch teams data");
    const json = await res.json();
    const rawTeams = json.data?.teams || [];

    // Sort teams consistently
    const teams = [...rawTeams].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );

    // Prepare each team's roster
    const teamSquads = teams.map((t) => {
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

      // Collect players for this team, placing Captain first
      const squadList = [];

      // Add Captain as player #1
      squadList.push({
        name: captainName !== "Not Assigned" ? `${captainName} (Captain)` : "Captain (Unassigned)",
        points: 0,
      });

      // Add auctioned players (avoid duplicating captain)
      if (Array.isArray(t.players)) {
        t.players.forEach((p) => {
          const pName = p.name || "";
          if (
            !p.isCaptain &&
            pName.trim().toLowerCase() !== captainName.trim().toLowerCase()
          ) {
            squadList.push({
              name: pName,
              points: p.finalBidPrice != null ? p.finalBidPrice : (p.basePrice || 0),
            });
          }
        });
      }

      return {
        teamName,
        captainName,
        players: squadList,
      };
    });

    // Find the max number of player rows across all teams
    const maxPlayerRows = Math.max(
      ...teamSquads.map((s) => s.players.length),
      1
    );

    const rows = [];

    // Row 1: Team Names (each team name appears exactly once across 2 columns)
    const teamHeaderRow = [];
    teamSquads.forEach((s) => {
      teamHeaderRow.push(`"${s.teamName.replace(/"/g, '""')}"`, "");
    });
    rows.push(teamHeaderRow);

    // Row 2: Captain Names
    const captainHeaderRow = [];
    teamSquads.forEach((s) => {
      captainHeaderRow.push(
        `"Captain: ${s.captainName.replace(/"/g, '""')}"`,
        ""
      );
    });
    rows.push(captainHeaderRow);

    // Row 3: Column Titles for each team
    const colTitleRow = [];
    teamSquads.forEach(() => {
      colTitleRow.push('"Player Name"', '"Sold Points"');
    });
    rows.push(colTitleRow);

    // Row 4 onwards: Players and their sold points side-by-side
    for (let i = 0; i < maxPlayerRows; i++) {
      const playerRow = [];
      teamSquads.forEach((s) => {
        if (s.players[i]) {
          playerRow.push(
            `"${s.players[i].name.replace(/"/g, '""')}"`,
            s.players[i].points
          );
        } else {
          playerRow.push('""', '""');
        }
      });
      rows.push(playerRow);
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((r) => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "DGPL_2026_Final_Squads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Export error:", err);
    alert("Failed to export squads: " + err.message);
  }
}
