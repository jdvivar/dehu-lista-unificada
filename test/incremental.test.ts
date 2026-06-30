import { describe, it, expect } from "vitest";
import { computeFetchRanges } from "../src/core/incremental";

const d = (s: string) => new Date(s + "T12:00:00");

describe("computeFetchRanges", () => {
  it("fetches the whole range on the first sync", () => {
    expect(computeFetchRanges(d("2025-01-01"), d("2026-01-01"), null, null))
      .toEqual([{ from: d("2025-01-01"), to: d("2026-01-01") }]);
  });

  it("re-syncs only the 30-day doubt window when already fully covered", () => {
    const r = computeFetchRanges(d("2025-01-01"), d("2026-01-31"), d("2025-01-01"), d("2026-01-31"), 30);
    expect(r).toHaveLength(1);
    expect(r[0].to).toEqual(d("2026-01-31"));
    expect(r[0].from).toEqual(d("2026-01-01")); // 30 days before `to`
  });

  it("covers the gap since the last sync if it predates the doubt window", () => {
    const r = computeFetchRanges(d("2025-01-01"), d("2026-03-01"), d("2025-01-01"), d("2026-01-01"), 30);
    expect(r[0].from).toEqual(d("2026-01-01")); // min(coveredTo, doubtStart) = coveredTo
    expect(r[0].to).toEqual(d("2026-03-01"));
  });

  it("backfills older history when the range extends before what's covered", () => {
    const r = computeFetchRanges(d("2024-01-01"), d("2026-01-31"), d("2025-06-01"), d("2026-01-31"), 30);
    expect(r.some(x => x.from.getTime() === d("2024-01-01").getTime() && x.to.getTime() === d("2025-06-01").getTime())).toBe(true);
  });
});
