// Tüm testleri sırayla çalıştırır: node tests/run-all.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
let failed = false;
for (const f of ['engine.test.mjs', 'endgame.test.mjs', 'content.test.mjs']) {
  const r = spawnSync(process.execPath, [path.join(here, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
