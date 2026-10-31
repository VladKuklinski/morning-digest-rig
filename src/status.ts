import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { lastBeat, type Beat } from './heartbeat.js';
import { readNightWithStats } from './digest/read-night.js';

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: string[];
  nightCounts: Record<string, { ok: number; retry: number; fail: number }>;
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig): Status {
  const nights = nightsOnDisk(config.runsDir);
  const nightCounts = Object.fromEntries(nights.map((night) => {
    const { rows } = readNightWithStats(config.runsDir, night);
    return [night, {
      ok: rows.reduce((sum, row) => sum + row.okRuns, 0),
      retry: rows.reduce((sum, row) => sum + row.retryRuns, 0),
      fail: rows.reduce((sum, row) => sum + row.failRuns, 0),
    }];
  }));
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights,
    nightCounts,
  };
}
