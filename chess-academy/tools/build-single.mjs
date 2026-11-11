// Tek dosyalık sürüm üretir: CSS ve tüm JS dosyaları index.html içine gömülür.
//   node tools/build-single.mjs dist/satranc-akademisi.html            → tam HTML belgesi
//   node tools/build-single.mjs out.html --fragment                    → <html>/<head>/<body> etiketleri olmadan
//                                                                        (claude.ai Artifact olarak yayınlamak için)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2];
const fragment = process.argv.includes('--fragment');
if (!out) { console.error('Kullanım: node tools/build-single.mjs <çıktı.html> [--fragment]'); process.exit(1); }

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="css\/style\.css">/, () =>
  '<style>\n' + fs.readFileSync(path.join(root, 'css/style.css'), 'utf8') + '\n</style>');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, src) => {
  const code = fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return '<script>\n' + code + '\n</script>';
});
if (fragment) {
  html = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '')
    .replace(/<head>\s*/i, '')
    .replace(/<meta charset="utf-8">\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '')
    .replace(/<\/head>\s*/i, '')
    .replace(/<body>\s*/i, '')
    .replace(/<\/body>\s*/i, '')
    .replace(/<\/html>\s*/i, '');
}
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${out} yazıldı (${Math.round(html.length / 1024)} KB)`);
