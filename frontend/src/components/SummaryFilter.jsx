import React from "react";

const SummaryFilter = ({ teams = [], selectedTeamId, onChange }) => {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-xs w-full">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Team Filter
        </label>
        <div className="relative">
          <select
            value={
              selectedTeamId && selectedTeamId !== "available"
                ? selectedTeamId
                : ""
            }
            onChange={(e) => onChange(e.target.value || null)}
            className="w-full appearance-none bg-gray-800/70 border border-gray-700 text-gray-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-yellow-400/60 focus:border-yellow-400 transition-colors pr-10"
          >
            <option value="">Select Team</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
            ▼
          </span>
        </div>
      </div>
      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium tracking-wide transition-colors border ${
            selectedTeamId === null
              ? "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-gray-900 font-semibold border-yellow-400 shadow shadow-yellow-500/30"
              : "!bg-black !text-white !border-gray-700 hover:!bg-gray-800"
          }`}
        >
          Recently Sold
        </button>
        <button
          type="button"
          onClick={() => onChange("available")}
          className={`px-4 py-2 rounded-lg text-sm font-medium tracking-wide transition-colors border ${
            selectedTeamId === "available"
              ? "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-gray-900 font-semibold border-yellow-400 shadow shadow-yellow-500/30"
              : "!bg-black !text-white !border-gray-700 hover:!bg-gray-800"
          }`}
        >
          Available Players
        </button>
      </div>
    </div>
  );
};

export default SummaryFilter;
