// Tarayıcı betiklerini (IIFE, global değişken) Node içinde tek bir bağlamda yükler.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '..');

export function loadScripts(files) {
  const ctx = { console, Math, Date, JSON, Object, Array, Number, String, Error, Infinity };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of files) {
    const code = fs.readFileSync(path.join(root, f), 'utf8');
    vm.runInContext(code, ctx, { filename: f });
  }
  return ctx;
}
