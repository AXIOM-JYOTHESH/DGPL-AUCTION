import React from "react";
import { downloadSquadsCSV } from "../utils/exportSquadsHelper";

const SummaryFilter = ({ teams = [], selectedTeamId, onChange }) => {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-xs w-full">
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
          Filter By Team
        </label>
        <div className="relative">
          <select
            value={
              selectedTeamId && selectedTeamId !== "available"
                ? selectedTeamId
                : ""
            }
            onChange={(e) => onChange(e.target.value || null)}
            className="w-full appearance-none bg-[#0c101d] border border-zinc-800 text-zinc-200 text-sm font-medium rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-400 transition-colors pr-10 shadow-lg"
          >
            <option value="">All Teams (Overview)</option>
            {teams.map((team) => (
              <option key={team._id || team.id} value={team._id || team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500 text-xs">
            ▼
          </span>
        </div>
      </div>

      <div className="flex gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide transition-all border ${
            selectedTeamId === null
              ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 font-black border-amber-300 shadow-lg shadow-amber-500/20"
              : "bg-[#0c101d] text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          Recently Sold Feed
        </button>
        <button
          type="button"
          onClick={() => onChange("available")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide transition-all border ${
            selectedTeamId === "available"
              ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 font-black border-amber-300 shadow-lg shadow-amber-500/20"
              : "bg-[#0c101d] text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          Available Player Pool
        </button>
        <button
          type="button"
          onClick={() => downloadSquadsCSV()}
          className="px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          title="Export final squads CSV (Team Name, Captain Name, Player Name, Sold Points)"
        >
          <span>📥</span>
          <span>Download Squads (.CSV)</span>
        </button>
      </div>
    </div>
  );
};

export default SummaryFilter;
