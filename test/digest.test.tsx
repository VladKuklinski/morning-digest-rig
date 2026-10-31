import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readNight, readNightWithStats } from '../src/digest/read-night.js';
import { createApp } from '../src/app.js';

const directories: string[] = [];

function makeRunsDir(content: string, night = '2026-10-28') {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  directories.push(dir);
  writeFileSync(join(dir, `${night}.jsonl`), content);
  return dir;
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('readNight', () => {
  it('aggregates jobs, counts malformed lines, retains null owners, and sorts by job', () => {
    const rows = readNight('runs', '2026-10-28');
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.job)).toEqual([...rows.map((row) => row.job)].sort());
    expect(rows.find((row) => row.job === 'digest/render')?.owner).toBeNull();
    expect(readNightWithStats('runs', '2026-10-28').malformedLines).toBe(1);
  });

  it('returns an empty list for an empty file', () => {
    const dir = makeRunsDir('');
    expect(readNight(dir, '2026-10-28')).toEqual([]);
  });

  it('counts structurally invalid JSONL records as malformed', () => {
    const dir = makeRunsDir('{"at":"2026-10-28T01:00:00+01:00","job":"x","status":"unknown","owner":null}');
    expect(readNightWithStats(dir, '2026-10-28').malformedLines).toBe(1);
  });

  it('retains a failure in counts after a later successful run', () => {
    const dir = makeRunsDir([
      '{"at":"2026-10-28T01:00:00+01:00","job":"recovering","status":"fail","owner":"a"}',
      '{"at":"2026-10-28T02:00:00+01:00","job":"recovering","status":"ok","owner":"a"}',
    ].join('\n'));
    expect(readNight(dir, '2026-10-28')[0]).toMatchObject({ lastStatus: 'ok', failRuns: 1, okRuns: 1 });
  });
});

describe('digest routes', () => {
  it('renders the page with sorted jobs and warnings', async () => {
    const app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' });
    const response = await app.request('/digest/2026-10-28');
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('morning digest · 2026-10-28');
    expect(html).toContain('digest/render');
    expect(html).toContain('—');
    expect(html).toContain('warn');
  });

  it('returns the same ordered rows as JSON', async () => {
    const app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' });
    const response = await app.request('/api/digest/2026-10-28');
    const rows = await response.json() as Array<{ job: string }>;
    expect(response.status).toBe(200);
    expect(rows.map((row) => row.job)).toEqual([...rows.map((row) => row.job)].sort());
  });

  it('returns 404 for a missing night', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-empty-'));
    directories.push(dir);
    const app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
    expect((await app.request('/digest/2026-10-28')).status).toBe(404);
    expect((await app.request('/api/digest/2026-10-28')).status).toBe(404);
  });

  it('renders an empty night and ignores a malformed line', async () => {
    const dir = makeRunsDir('not-json\n{"at":"2026-10-28T01:00:00+01:00","job":"one","status":"ok","owner":null}');
    const app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
    const response = await app.request('/api/digest/2026-10-28');
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveLength(1);

    const emptyDir = makeRunsDir('');
    const emptyApp = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: emptyDir });
    expect(await (await emptyApp.request('/digest/2026-10-28')).text()).toContain('nothing ran');
  });
});
