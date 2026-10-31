import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { readNight, readNightWithStats } from './digest/read-night.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';
import { DigestPage } from './views/digest.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/digest/:night', (c) => {
    const { night } = c.req.param();
    let digest;
    try {
      digest = readNightWithStats(config.runsDir, night);
    } catch {
      return c.notFound();
    }
    return c.html(
      <Layout title={`digest · ${night}`} lane={lane()}>
        <DigestPage night={night} rows={digest.rows} malformedLines={digest.malformedLines} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const { night } = c.req.param();
    let rows;
    try {
      rows = readNight(config.runsDir, night);
    } catch {
      return c.notFound();
    }
    return c.json(rows);
  });

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  return app;
}
