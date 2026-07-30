/**
 * Pure scheduling helpers (no DB, no server-only) — the heart of the booking
 * engine. Everything works in "local minutes from midnight" for a shop's
 * timezone, then converts to absolute UTC `Date`s for storage.
 *
 * Kept pure so slot math is unit-testable and identical on server and client.
 */

import type { DayOfWeek } from "@prisma/client";

export type Window = { start: number; end: number }; // minutes from local midnight

const DAY = 24 * 60;

/** UTC offset (localMinutes − utcMinutes) for an IANA timezone at an instant. */
export function tzOffsetMinutes(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(at)) p[part.type] = part.value;
  const asUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour === "24" ? "0" : p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return Math.round((asUTC - at.getTime()) / 60000);
}

/** The absolute UTC instant of local 00:00 on `dateStr` (YYYY-MM-DD). */
export function localDayStartUtc(dateStr: string, timeZone: string): Date {
  const guess = new Date(`${dateStr}T00:00:00Z`);
  const offset = tzOffsetMinutes(timeZone, guess);
  return new Date(guess.getTime() - offset * 60000);
}

/** Convert an absolute instant to minutes-from-local-midnight of `dayStartUtc`. */
export function toLocalMinutes(instant: Date, dayStartUtc: Date): number {
  return Math.round((instant.getTime() - dayStartUtc.getTime()) / 60000);
}

/** Convert local minutes back to an absolute UTC instant. */
export function localMinutesToUtc(dayStartUtc: Date, minutes: number): Date {
  return new Date(dayStartUtc.getTime() + minutes * 60000);
}

const DOW: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/** DayOfWeek enum value for a YYYY-MM-DD calendar date. */
export function dayOfWeek(dateStr: string): DayOfWeek {
  // Noon UTC avoids any date rollover at the edges.
  return DOW[new Date(`${dateStr}T12:00:00Z`).getUTCDay()];
}

export function minutesToLabel(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** True if two half-open intervals [a) and [b) overlap. */
function overlaps(aStart: number, aEnd: number, b: Window): boolean {
  return aStart < b.end && aEnd > b.start;
}

/**
 * Generate valid appointment start times (in local minutes).
 *
 * A start is valid when a `durationMinutes` block starting there fits entirely
 * inside an open window, overlaps no busy window, and starts at/after
 * `earliestStart`. Starts are aligned to a `stepMinutes` grid from midnight.
 */
export function generateSlotStarts(opts: {
  open: Window[];
  busy: Window[];
  durationMinutes: number;
  stepMinutes?: number;
  earliestStart?: number;
}): number[] {
  const step = opts.stepMinutes ?? 15;
  const earliest = opts.earliestStart ?? 0;
  const dur = opts.durationMinutes;
  if (dur <= 0) return [];

  const out: number[] = [];
  for (const win of opts.open) {
    let s = Math.max(win.start, earliest);
    if (s % step !== 0) s = Math.ceil(s / step) * step; // snap onto grid
    for (; s + dur <= win.end && s < DAY; s += step) {
      if (!opts.busy.some((b) => overlaps(s, s + dur, b))) out.push(s);
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}
