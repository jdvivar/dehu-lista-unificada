export interface Range { from: Date; to: Date; }

const DAY = 86400000;

// Decides which date ranges actually need fetching, given what's already cached.
// History is immutable except the recent "doubt window" (a past-dated item can be
// published late), so:
//   - first sync (nothing covered): fetch the whole [from, to]
//   - otherwise: re-fetch from min(lastCoveredTo, to - doubtDays) up to `to`
//     (covers both new-since-last-sync and the doubt window), and additionally
//     backfill [from, coveredFrom] when the requested range reaches further back
//     than we've previously covered.
export function computeFetchRanges(
  from: Date, to: Date,
  coveredFrom: Date | null, coveredTo: Date | null,
  doubtDays = 30,
): Range[] {
  if (!coveredFrom || !coveredTo) return [{ from, to }];

  const ranges: Range[] = [];
  const doubtStart = new Date(to.getTime() - doubtDays * DAY);
  const recentFrom = new Date(Math.min(coveredTo.getTime(), doubtStart.getTime()));
  if (recentFrom <= to) ranges.push({ from: recentFrom, to });
  if (from < coveredFrom) ranges.push({ from, to: coveredFrom });
  return ranges;
}
