import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, NightDigest, ReadNight, RunStatus } from './types.js';

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

export function readNightWithStats(runsDir: string, night: string): NightDigest {
  const content = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  const jobs = new Map<string, DigestRow>();
  let malformedLines = 0;

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      malformedLines += 1;
      continue;
    }
    if (!isRunEntry(value)) {
      malformedLines += 1;
      continue;
    }

    const previous = jobs.get(value.job);
    if (!previous) {
      jobs.set(value.job, {
        job: value.job,
        owner: value.owner,
        runs: 1,
        retries: value.status === 'retry' ? 1 : 0,
        okRuns: value.status === 'ok' ? 1 : 0,
        retryRuns: value.status === 'retry' ? 1 : 0,
        failRuns: value.status === 'fail' ? 1 : 0,
        lastStatus: value.status,
        lastError: value.error ?? null,
        firstTime: value.at,
        lastTime: value.at,
      });
      continue;
    }

    previous.runs += 1;
    if (value.status === 'retry') previous.retries += 1;
    if (value.status === 'ok') previous.okRuns += 1;
    if (value.status === 'retry') previous.retryRuns += 1;
    if (value.status === 'fail') previous.failRuns += 1;
    previous.lastStatus = value.status;
    previous.lastError = value.error ?? null;
    previous.lastTime = value.at;
    if (value.owner !== null) previous.owner = value.owner;
  }

  return { rows: [...jobs.values()].sort((a, b) => a.job.localeCompare(b.job)), malformedLines };
}

export const readNight: ReadNight = (runsDir, night) => readNightWithStats(runsDir, night).rows;
