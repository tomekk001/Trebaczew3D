// Przygotowuje kopię gry do instalatora: pliki z ../gra i biblioteka three.js z node_modules (żeby gra działała bez internetu).
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', 'gra'), OUT = path.join(__dirname, 'game'), LIB = path.join(OUT, 'lib');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(LIB, { recursive: true });
const copyDir = (a, b) => { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a, { withFileTypes: true })) { const p = path.join(a, f.name), q = path.join(b, f.name); if (f.isDirectory()) copyDir(p, q); else fs.copyFileSync(p, q); } };
copyDir(SRC, OUT);
const three = path.join(__dirname, 'node_modules', 'three');
let html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8'), n = 0;
html = html.replace(/src="https:\/\/(?:cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/(three\.min\.js)|cdn\.jsdelivr\.net\/npm\/three@0\.128\.0\/(examples\/js\/[^"]+))"/g, (m, core, ex) => {
  const from = core ? path.join(three, 'build', core) : path.join(three, ex); const name = path.basename(from);
  fs.copyFileSync(from, path.join(LIB, name)); n++; return 'src="lib/' + name + '"';
});
if (n < 8) throw new Error('Nie podmieniono wszystkich bibliotek three.js (' + n + ')');
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.copyFileSync(path.join(__dirname, '..', 'src', 'icon-512.png'), path.join(__dirname, 'icon.png'));
console.log('ok, biblioteki:', n);
