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
const readMeta = file => {
  const source = fs.readFileSync(path.join(contentRoot, file), 'utf8').replace(/\r/g, '');
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, `Intestazione mancante: ${file}`);
  return JSON.parse(match[1]);
};

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
assert.doesNotMatch(html, /\b(?:href|src)="(?!https?:)[^"]*wp-content\/uploads/i, 'È rimasto un vecchio percorso WordPress locale');
assert.equal((html.match(/<h1\b/g) ?? []).length, 1, 'Deve esserci un solo H1');
assert.ok(html.includes('<html lang="it">'));
assert.ok(html.includes('name="viewport"'));
assert.ok(html.includes('class="skip-link"'));
assert.ok(html.includes('Content-Security-Policy'));
for (const [, tag] of html.matchAll(/(<img\b[^>]+>)/g)) assert.match(tag, /\balt="[^"]*"/, 'Immagine senza testo alternativo');

const sectionFiles = {
  manifesto: '02-manifesto.md',
  'chi-siamo': '03-chi-siamo.md',
  formazione: '04-formazione.md',
  convegni: '05-convegni.md',
  archivio: '06-archivio.md',
  contatti: '07-contatti.md'
};
for (const [id, file] of Object.entries(sectionFiles)) {
  const meta = readMeta(file);
  assert.equal(typeof meta.attiva, 'boolean', `Campo attiva mancante o non booleano: ${file}`);
  assert.equal(typeof meta.introduzione, 'string', `Campo introduzione mancante: ${file}`);
  assert.equal(typeof meta.nota, 'string', `Campo nota mancante: ${file}`);
  const active = meta.attiva;
  assert.equal(html.includes(`id="${id}"`), active, `Stato della sezione non rispettato: ${id}`);
  assert.equal(html.includes(`href="#${id}"`), active, `Voce di menu non coerente: ${id}`);
}

const archiveSources = contentFiles.filter(file => file.startsWith('archivio\\') || file.startsWith('archivio/'));
if (readMeta(sectionFiles.archivio).attiva !== false) {
  for (const file of archiveSources) {
    const source = fs.readFileSync(path.join(contentRoot, file), 'utf8');
    const id = source.match(/"source_id"\s*:\s*"([^"]+)"/)?.[1];
    assert.ok(id && html.includes(`data-source-id="${id}"`), `Archivio non pubblicato: ${file}`);
  }
}

const publicFiles = fs.readdirSync(site, { recursive: true }).map(String);
const catalog = JSON.parse(fs.readFileSync(path.join(contentRoot, 'catalogo-formazione.json'), 'utf8'));
const schoolIds = new Set(catalog.scuole.map(item => item.id));
const moduleIds = new Set(catalog.moduli.map(item => item.id));
assert.equal(schoolIds.size, catalog.scuole.length, 'Identificativi pubblici delle scuole duplicati');
assert.equal(moduleIds.size, catalog.moduli.length, 'Identificativi pubblici dei moduli duplicati');
const linkedModules = catalog.scuole.flatMap(school => school.moduli.map(id => ({ id, school: school.id })));
assert.equal(linkedModules.length, catalog.moduli.length, 'Numero di collegamenti scuola-modulo incoerente');
assert.equal(new Set(linkedModules.map(item => item.id)).size, catalog.moduli.length, 'Modulo associato a più scuole');
for (const item of catalog.moduli) {
  assert.ok(schoolIds.has(item.scuola), `Scuola mancante: ${item.id}`);
  assert.ok(linkedModules.some(link => link.id === item.id && link.school === item.scuola), `Associazione incoerente: ${item.id}`);
}
for (const item of [...catalog.scuole, ...catalog.moduli]) {
  assert.ok(['registrato', 'annullato', 'da-controllare'].includes(item.stato), `Stato non valido: ${item.id}`);
  assert.ok(!item.inizio || !item.fine || item.fine >= item.inizio, `Intervallo invertito: ${item.id}`);
  assert.ok(!item.inizio || Number(item.inizio.slice(0, 4)) === item.anno, `Anno della data incoerente: ${item.id}`);
  if (readMeta(sectionFiles.archivio).attiva !== false) assert.ok(ids.includes(item.id), `Voce del catalogo mancante: ${item.id}`);
}
assert.ok(!publicFiles.some(file => /\.(sql|php|env)$/i.test(file)), 'File non pubblico nella consegna');

console.log(JSON.stringify({
  result: 'OK',
  markdownFiles: contentFiles.length,
  archiveFiles: archiveSources.length,
  anchors,
  localReferences,
  catalogSchools: catalog.scuole.length,
  catalogModules: catalog.moduli.length,
  checks: ['contenuti Markdown', 'ancore e ID', 'risorse locali', 'assenza cookie e chiamate esterne', 'HTML semantico di base', 'esclusione SQL e PHP']
}, null, 2));
