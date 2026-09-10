/* YapıCAD — tek dosyalık sürüm üreteci.
 *
 * renderer/ altındaki CSS ve JS'i index.html içine gömerek, çift tıklayınca
 * açılan bağımsız bir HTML üretir. Kurulum, sunucu, derleme gerektirmez.
 *
 * Kullanım: node tools/build-single-file.js [çıktı-yolu]
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', 'renderer');
const OUT = process.argv[2] || path.join(__dirname, '..', 'dist', 'yapicad-tek-dosya.html');

/** `</script>` içeren bir JS gövdesi HTML'i erken kapatır; kaçış şart. */
const safeJs = (s) => s.replace(/<\/script/gi, '<\\/script');

function build() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  // <link rel="stylesheet" href="..."> -> <style>...</style>
  html = html.replace(/[ \t]*<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/gi, (m, href) => {
    const css = fs.readFileSync(path.join(ROOT, href), 'utf8');
    return `<style>\n/* ${href} */\n${css}\n</style>`;
  });

  // <script src="..."></script> -> <script>...</script>
  html = html.replace(/[ \t]*<script\s+src="([^"]+)"\s*><\/script>/gi, (m, src) => {
    const js = fs.readFileSync(path.join(ROOT, src), 'utf8');
    return `<script>\n/* ${src} */\n${safeJs(js)}\n</script>`;
  });

  if (/<link\s+rel="stylesheet"|<script\s+src=/i.test(html)) {
    throw new Error('Gömülemeyen dış kaynak kaldı — çıktı bağımsız değil.');
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, 'utf8');
  console.log(`${OUT}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
}

build();
