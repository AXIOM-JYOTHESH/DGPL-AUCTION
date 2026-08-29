import React from "react";

export default function Toast({ message, type = "info" }) {
  const base =
    "px-4 py-3 rounded-lg shadow-lg border text-sm font-semibold flex items-center gap-3";
  let style = "bg-gray-800/95 text-white border-gray-600";
  if (type === "error") style = "bg-red-600 text-white border-red-400";
  if (type === "success") style = "bg-green-600 text-white border-green-400";
  if (type === "warn") style = "bg-yellow-500 text-gray-900 border-yellow-300";
  return (
    <div className={`${base} ${style} animate-fade-in-down`}>{message}</div>
  );
}
