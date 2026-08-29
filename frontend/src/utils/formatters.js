// Utility formatting helpers
// Academic year ordinal: converts 1 -> '1st Year', 2 -> '2nd Year', etc.
export function formatAcademicYear(year) {
  if (year == null || isNaN(year)) return "";
  const y = Number(year);
  const suffix =
    y % 100 >= 11 && y % 100 <= 13
      ? "th"
      : y % 10 === 1
      ? "st"
      : y % 10 === 2
      ? "nd"
      : y % 10 === 3
      ? "rd"
      : "th";
  return `${y}${suffix} Year`;
}

// Short form without the word "Year" (e.g., 1st, 2nd, 3rd, 4th)
export function formatAcademicYearShort(year) {
  if (year == null || isNaN(year)) return "";
  const y = Number(year);
  const suffix =
    y % 100 >= 11 && y % 100 <= 13
      ? "th"
      : y % 10 === 1
      ? "st"
      : y % 10 === 2
      ? "nd"
      : y % 10 === 3
      ? "rd"
      : "th";
  return `${y}${suffix}`;
}

// Generic ordinal (if needed elsewhere)
export function ordinal(n) {
  if (n == null || isNaN(n)) return "";
  const num = Number(n);
  const suf =
    num % 100 >= 11 && num % 100 <= 13
      ? "th"
      : num % 10 === 1
      ? "st"
      : num % 10 === 2
      ? "nd"
      : num % 10 === 3
      ? "rd"
      : "th";
  return `${num}${suf}`;
}
