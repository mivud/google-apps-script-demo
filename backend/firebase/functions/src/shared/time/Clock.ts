// Time always comes through this port so it can be replaced.
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

// UTC, millisecond precision, +00:00 offset (same as the Supabase and Sheets backends).
export function formatUtc(date: Date): string {
  return date.toISOString().replace('Z', '+00:00');
}
