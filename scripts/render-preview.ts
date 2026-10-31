import { mkdirSync, writeFileSync } from 'node:fs';
import { createApp } from '../src/app.js';

const response = await createApp().request('/digest/2026-10-28');
if (!response.ok) throw new Error(`Preview render failed: ${response.status}`);

const html = await response.text();
const previewPath = 'dist/public/digest-2026-10-28.html';
mkdirSync('dist/public', { recursive: true });
writeFileSync(previewPath, html);

// Pages expects a top-level entry point; keep the submitted preview at its existing URL.
writeFileSync(
  'dist/index.html',
  '<!doctype html><html lang="en"><meta charset="utf-8"><title>rig preview</title><p><a href="./public/digest-2026-10-28.html">Morning digest preview</a></p></html>',
);

console.log(`Rendered ${previewPath} (${html.length} characters)`);
