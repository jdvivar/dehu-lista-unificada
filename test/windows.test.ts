import { describe, it, expect } from "vitest";
import { generateWindows, formatDDMMYYYY } from "../src/core/windows";

const d = (s: string) => new Date(s + "T12:00:00");

describe("generateWindows", () => {
  it("covers a range with no gaps or overlaps, newest first", () => {
    const w = generateWindows(d("2026-01-01"), d("2026-03-15"), 28);
    expect(w[0].end).toEqual(d("2026-03-15"));                       // starts at 'to'
    expect(w[w.length - 1].start).toEqual(d("2026-01-01"));          // ends at 'from'
    for (let i = 1; i < w.length; i++) {
      const gapMs = w[i - 1].start.getTime() - w[i].end.getTime();
      expect(gapMs).toBe(24 * 3600 * 1000);                          // adjacent, 1 day apart
    }
    for (const win of w) {
      const days = (win.end.getTime() - win.start.getTime()) / 86400000;
      expect(days).toBeLessThanOrEqual(28);
    }
  });

  it("handles a 31-day month within fixed windows (never a >maxDays span)", () => {
    const w = generateWindows(d("2026-07-01"), d("2026-07-31"), 28); // 31 days
    expect(w.length).toBe(2);
    for (const win of w) {
      expect((win.end.getTime() - win.start.getTime()) / 86400000).toBeLessThanOrEqual(28);
    }
  });

  it("returns a single window when range <= maxDays", () => {
    expect(generateWindows(d("2026-02-01"), d("2026-02-10"), 28)).toHaveLength(1);
  });

  it("handles a single-day range", () => {
    const w = generateWindows(d("2026-02-10"), d("2026-02-10"), 28);
    expect(w).toHaveLength(1);
    expect(w[0].start).toEqual(w[0].end);
  });

  it("swaps reversed inputs", () => {
    const w = generateWindows(d("2026-03-15"), d("2026-01-01"), 28);
    expect(w[0].end).toEqual(d("2026-03-15"));
  });
});

describe("formatDDMMYYYY", () => {
  it("formats with zero padding", () => {
    expect(formatDDMMYYYY(d("2026-03-05"))).toBe("05/03/2026");
  });
});
