import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, RunStatus } from './types.js';

type RunEntry = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

function isRunEntry(value: unknown): value is RunEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.at === 'string' &&
    typeof entry.job === 'string' &&
    (entry.status === 'ok' || entry.status === 'retry' || entry.status === 'fail') &&
    (typeof entry.owner === 'string' || entry.owner === null) &&
    (entry.error === undefined || typeof entry.error === 'string')
  );
}

export function readNight(runsDir: string, night: string): DigestRow[] {
  const content = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  const jobs = new Map<string, DigestRow>();

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isRunEntry(value)) continue;

    const previous = jobs.get(value.job);
    if (!previous) {
      jobs.set(value.job, {
        job: value.job,
        owner: value.owner,
        runs: 1,
        retries: value.status === 'retry' ? 1 : 0,
        lastStatus: value.status,
        lastError: value.error ?? null,
        firstTime: value.at,
        lastTime: value.at,
      });
      continue;
    }

    previous.runs += 1;
    if (value.status === 'retry') previous.retries += 1;
    previous.lastStatus = value.status;
    previous.lastError = value.error ?? null;
    previous.lastTime = value.at;
    if (value.owner !== null) previous.owner = value.owner;
  }

  return [...jobs.values()].sort((a, b) => a.job.localeCompare(b.job));
}
