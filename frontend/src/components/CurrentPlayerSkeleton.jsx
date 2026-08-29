import React from "react";

const CurrentPlayerSkeleton = () => {
  return (
    <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden max-w-md w-full border border-gray-700 animate-pulse">
      <div className="aspect-[3/4] w-full bg-gray-700" />
      <div className="p-6 space-y-5">
        <div className="h-4 w-40 bg-gray-700 rounded" />
        <div className="h-8 w-56 bg-gray-700 rounded" />
        <div className="bg-gray-900/60 rounded-xl p-5 border border-gray-700 space-y-4">
          <div className="h-3 w-24 bg-gray-700 rounded" />
          <div className="flex items-end gap-4">
            <div className="h-10 w-32 bg-gray-700 rounded" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-700 rounded" />
              <div className="h-4 w-28 bg-gray-700 rounded" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-3 w-28 bg-gray-700 rounded" />
          <ul className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="h-8 w-full bg-gray-700/70 rounded-lg" />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CurrentPlayerSkeleton;
