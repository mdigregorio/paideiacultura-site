import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(site, 'assets', 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(site, 'assets', 'site.js'), 'utf8');
const contentRoot = path.join(site, 'contenuti');
const contentFiles = fs.readdirSync(contentRoot, { recursive: true })
  .map(String).filter(file => file.endsWith('.md'));

assert.ok(contentFiles.length >= 7, 'File Markdown dei contenuti mancanti');
assert.ok(!html.includes('{{CONTENUTO}}'), 'Indice non rigenerato dal modello');
assert.ok(fs.readFileSync(path.join(site, 'modello.html'), 'utf8').includes('{{CONTENUTO}}'), 'Segnaposto mancante nel modello');

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'ID duplicati');
let anchors = 0;
let localReferences = 0;
for (const [, kind, value] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
  if (value.startsWith('#')) {
    assert.ok(ids.includes(value.slice(1)), `Ancora mancante: ${value}`);
    anchors++;
  } else if (/^https?:/.test(value)) {
    assert.notEqual(kind, 'src', 'Risorsa incorporata esterna');
  } else if (!value.startsWith('mailto:')) {
    assert.ok(fs.existsSync(path.resolve(site, value)), `File mancante: ${value}`);
    localReferences++;
  }
}

for (const [, value] of css.matchAll(/url\(['"]?([^'"\)]+)/g)) {
  assert.ok(!/^https?:/.test(value), 'Risorsa CSS esterna');
  assert.ok(fs.existsSync(path.resolve(site, 'assets', value)), `Risorsa CSS mancante: ${value}`);
}

assert.doesNotMatch(html, /<(iframe|form|object|embed)\b|\son[a-z]+=/i);
assert.doesNotMatch(js, /document\.cookie|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon/);
assert.doesNotMatch(html, /wp-content\/uploads/i, 'È rimasto un vecchio percorso WordPress');
assert.equal((html.match(/<h1\b/g) ?? []).length, 1, 'Deve esserci un solo H1');
assert.ok(html.includes('<html lang="it">'));
assert.ok(html.includes('name="viewport"'));
assert.ok(html.includes('class="skip-link"'));
assert.ok(html.includes('Content-Security-Policy'));
for (const [, tag] of html.matchAll(/(<img\b[^>]+>)/g)) assert.match(tag, /\balt="[^"]*"/, 'Immagine senza testo alternativo');

const archiveSources = contentFiles.filter(file => file.startsWith('archivio\\') || file.startsWith('archivio/'));
for (const file of archiveSources) {
  const source = fs.readFileSync(path.join(contentRoot, file), 'utf8');
  const id = source.match(/"source_id"\s*:\s*"([^"]+)"/)?.[1];
  assert.ok(id && html.includes(`data-source-id="${id}"`), `Archivio non pubblicato: ${file}`);
}

const publicFiles = fs.readdirSync(site, { recursive: true }).map(String);
assert.ok(!publicFiles.some(file => /\.(sql|php|env)$/i.test(file)), 'File non pubblico nella consegna');

console.log(JSON.stringify({
  result: 'OK',
  markdownFiles: contentFiles.length,
  archiveFiles: archiveSources.length,
  anchors,
  localReferences,
  checks: ['contenuti Markdown', 'ancore e ID', 'risorse locali', 'assenza cookie e chiamate esterne', 'HTML semantico di base', 'esclusione SQL e PHP']
}, null, 2));
