import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };
const directories: string[] = [];
afterEach(() => {
  process.env.LANE_MARKER = '';
  for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('status board', () => {
  it('shows the lane banner and the nights on disk', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await createApp(config).request('/');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('2026-10-28');
  });

  it('health answers with the lane id', async () => {
    const res = await createApp(config).request('/health');
    expect(await res.json()).toEqual({ ok: true, lane: 'lane-07' });
  });

  it('shows per-night run counts and highlights a night with a recovered failure', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-status-'));
    directories.push(dir);
    writeFileSync(join(dir, '2026-10-30.jsonl'), [
      '{"at":"2026-10-30T01:00:00+01:00","job":"x","status":"fail","owner":"a"}',
      '{"at":"2026-10-30T02:00:00+01:00","job":"x","status":"ok","owner":"a"}',
      '{"at":"2026-10-30T03:00:00+01:00","job":"x","status":"retry","owner":"a"}',
    ].join('\n'));
    const html = await (await createApp({ ...config, runsDir: dir }).request('/')).text();
    expect(html).toContain('class="warn"');
    expect(html).toContain('ok 1 · retry 1 · fail 1');
    expect(html).toContain('href="/digest/2026-10-30"');
  });
});
