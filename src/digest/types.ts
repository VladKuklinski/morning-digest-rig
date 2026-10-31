export type RunStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  okRuns: number;
  retryRuns: number;
  failRuns: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstTime: string;
  lastTime: string;
};

export type ReadNight = (runsDir: string, night: string) => DigestRow[];

export type NightDigest = { rows: DigestRow[]; malformedLines: number };

