import React from "react";

// Skeleton loader mimicking AuctionSummary layout
const SummarySkeleton = () => {
  const cards = Array.from({ length: 6 });
  return (
    <section className="w-full mx-auto max-w-7xl px-4 py-6">
      {/* Filter Row */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xs w-full space-y-2">
          <div className="h-3 w-24 bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="h-10 w-32 bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-10 w-40 bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Heading Placeholder */}
      <div className="h-7 w-56 bg-gray-700 rounded-md mb-6 animate-pulse" />

      {/* Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((_, i) => (
          <div
            key={i}
            className="relative flex items-center gap-5 bg-gray-800/70 border border-gray-700 rounded-2xl p-4"
          >
            <div className="w-16 h-24 bg-gray-700 rounded-lg animate-pulse" />
            <div className="flex-1 min-w-0 space-y-3">
              <div className="h-4 w-40 bg-gray-700 rounded animate-pulse" />
              <div className="flex gap-2 flex-wrap">
                <div className="h-3 w-16 bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-12 bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-20 bg-gray-700 rounded animate-pulse hidden sm:block" />
              </div>
            </div>
            <div className="w-14 h-6 bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default SummarySkeleton;
