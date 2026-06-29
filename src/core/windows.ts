import type { DateWindow } from "../types";

const DAY = 86400000;
const atNoon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);

export function generateWindows(from: Date, to: Date, maxDays = 28): DateWindow[] {
  let lo = atNoon(from), hi = atNoon(to);
  if (lo > hi) [lo, hi] = [hi, lo];
  const windows: DateWindow[] = [];
  let end = hi;
  while (end >= lo) {
    // window spans (maxDays-1) days inclusive, so end-start <= maxDays-1 days
    let start = atNoon(new Date(end.getTime() - (maxDays - 1) * DAY));
    if (start < lo) start = lo;
    windows.push({ start, end });
    end = atNoon(new Date(start.getTime() - DAY)); // next window ends the day before
  }
  return windows;
}

export function formatDDMMYYYY(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
