import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(site, 'contenuti');
const templateFile = path.join(site, 'modello.html');
const outputFile = path.join(site, 'index.html');

const escapeHtml = value => String(value)
  .replace(/&(?!(?:#\d+|#x[\da-f]+|[a-z]+);)/gi, '&amp;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inlineMarkdown(value) {
  let text = escapeHtml(value.trim());
  const stash = [];
  const hold = html => `\u0000${stash.push(html) - 1}\u0000`;
  text = text.replace(/!\[([^\]]*)\]\(([^\s\)]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src) => hold(`<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`));
  text = text.replace(/\[([^\]]+)\]\(([^\s\)]+)\)/g, (_, label, href) => hold(`<a href="${escapeHtml(href)}">${inlineMarkdown(label)}</a>`));
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  text = text.replace(/\n/g, '<br>');
  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => stash[Number(index)]);
}

function markdownToHtml(markdown) {
  const raw = [];
  let source = markdown.replace(/\r/g, '').trim();
  source = source.replace(/<div class="table-wrap">[\s\S]*?<\/div>/gi, block => `\n\n@@RAW${raw.push(block) - 1}@@\n\n`);
  source = source.replace(/<table\b[\s\S]*?<\/table>/gi, block => `\n\n@@RAW${raw.push(`<div class="table-wrap">${block}</div>`) - 1}@@\n\n`);
  const blocks = source.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  const html = [];
  for (const block of blocks) {
    const token = block.match(/^@@RAW(\d+)@@$/);
    if (token) { html.push(raw[Number(token[1])]); continue; }
    const heading = block.match(/^(#{1,4})\s+(.+)$/s);
    if (heading && !heading[2].includes('\n')) {
      const level = Math.min(4, heading[1].length + 2);
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const lines = block.split('\n');
    if (lines.every(line => /^[-*]\s+/.test(line))) {
      html.push(`<ul>${lines.map(line => `<li>${inlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`);
      continue;
    }
    if (lines.every(line => /^\d+[.)]\s+/.test(line))) {
      html.push(`<ol>${lines.map(line => `<li>${inlineMarkdown(line.replace(/^\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`);
      continue;
    }
    if (/^---+$/.test(block)) { html.push('<hr>'); continue; }
    html.push(`<p>${inlineMarkdown(block)}</p>`);
  }
  return html.join('\n');
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').trim();
}

function htmlInlineToMarkdown(value) {
  return value
    .replace(/<(strong|b|em|i)\b[^>]*>\s*<\/\1>/gi, '')
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => `[${htmlInlineToMarkdown(label)}](${href})`)
    .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<span\b[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function htmlToMarkdown(value) {
  const raw = [];
  let html = value.replace(/\r/g, '').trim();
  html = html.replace(/<div class="table-wrap">[\s\S]*?<\/div>/gi, block => `\n\n@@RAW${raw.push(block) - 1}@@\n\n`);
  html = html.replace(/<table\b[\s\S]*?<\/table>/gi, block => `\n\n@@RAW${raw.push(`<div class="table-wrap">${block}</div>`) - 1}@@\n\n`);
  html = html.replace(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, tag, body) => {
    const items = [...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(match => htmlInlineToMarkdown(match[1]).replace(/\n/g, ' '));
    return `\n\n${items.map((item, index) => tag.toLowerCase() === 'ol' ? `${index + 1}. ${item}` : `- ${item}`).join('\n')}\n\n`;
  });
  html = html.replace(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, body) => `\n\n## ${htmlInlineToMarkdown(body)}\n\n`);
  html = html.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_, body) => `\n\n${htmlInlineToMarkdown(body)}\n\n`);
  html = html.replace(/<img\b[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, (_, src, alt) => `\n\n![${alt}](${src})\n\n`);
  html = html.replace(/<hr\s*\/?\s*>/gi, '\n\n---\n\n').replace(/<\/?div\b[^>]*>/gi, '\n\n');
  html = htmlInlineToMarkdown(html);
  html = html.replace(/@@RAW(\d+)@@/g, (_, index) => raw[Number(index)]);
  return html.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function serialize(meta, body = '') {
  return `---\n${JSON.stringify(meta, null, 2)}\n---\n\n${body.trim()}\n`;
}

function readContent(relative) {
  const file = path.join(contentDir, relative);
  const source = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`Intestazione mancante o non valida: ${relative}`);
  return { meta: JSON.parse(match[1]), body: match[2].trim(), file };
}

const sectionHeading = (number, eyebrow, title, id) => `<div class="section-heading"><span class="section-number" aria-hidden="true">${number}</span><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2 id="titolo-${id}">${escapeHtml(title)}</h2></div></div>`;

function renderSite() {
  const home = readContent('01-home.md');
  const manifesto = readContent('02-manifesto.md');
  const about = readContent('03-chi-siamo.md');
  const formation = readContent('04-formazione.md');
  const conference = readContent('05-convegni.md');
  const archive = readContent('06-archivio.md');
  const contact = readContent('07-contatti.md');

  const initiatives = fs.readdirSync(path.join(contentDir, 'formazione')).filter(name => name.endsWith('.md')).sort().map(name => readContent(path.join('formazione', name)));
  const events = fs.readdirSync(path.join(contentDir, 'convegni')).filter(name => name.endsWith('.md')).sort().map(name => readContent(path.join('convegni', name)));
  const archiveEntries = fs.readdirSync(path.join(contentDir, 'archivio')).filter(name => name.endsWith('.md')).sort().map(name => readContent(path.join('archivio', name)));

  const people = about.meta.direttivo.map(person => `<div><dt>${escapeHtml(person.ruolo)}</dt><dd>${escapeHtml(person.nome)}<span>${escapeHtml(person.istituzione)}</span></dd></div>`).join('');
  const members = about.meta.soci.map(name => `<li>${escapeHtml(name)}</li>`).join('');
  const sections = [
    `<section class="hero section" aria-labelledby="titolo">
      <p class="eyebrow">${escapeHtml(home.meta.eyebrow)}</p>
      <h1 id="titolo">${home.meta.titolo_html}</h1>
      <div class="intro prose">${markdownToHtml(home.body)}</div>
      <a class="button" href="${escapeHtml(home.meta.pulsante_link)}">${escapeHtml(home.meta.pulsante_testo)} <span aria-hidden="true">↓</span></a>
      <a class="text-link" href="${escapeHtml(home.meta.link_secondario)}">${escapeHtml(home.meta.testo_secondario)}</a>
      <div class="hero-bottom"><span>${escapeHtml(home.meta.motto)}</span><span aria-hidden="true">${escapeHtml(home.meta.parola_greca)}</span></div>
    </section>`,
    `<section class="section" id="manifesto" aria-labelledby="titolo-manifesto" data-source-id="28">
      ${sectionHeading('01', manifesto.meta.eyebrow, manifesto.meta.titolo, 'manifesto')}
      <p class="lead">${inlineMarkdown(manifesto.meta.introduzione)}</p>
      <details class="manifesto-details"><summary>${escapeHtml(manifesto.meta.etichetta_apertura)} <span class="disclosure" aria-hidden="true"></span></summary><div class="prose">${markdownToHtml(manifesto.body)}</div></details>
    </section>`,
    `<section class="section" id="chi-siamo" aria-labelledby="titolo-chi-siamo" data-source-id="15">
      ${sectionHeading('02', about.meta.eyebrow, about.meta.titolo, 'chi-siamo')}
      <p class="lead">${inlineMarkdown(about.meta.introduzione)}</p>
      <p class="archive-note">${inlineMarkdown(about.meta.nota)}</p>
      <dl class="people">${people}</dl>
      <details class="plain-details"><summary>Le socie e i soci <span class="disclosure" aria-hidden="true"></span></summary><ul class="members">${members}</ul></details>
      <details class="plain-details"><summary>I direttivi precedenti <span class="disclosure" aria-hidden="true"></span></summary><div class="prose">${markdownToHtml(about.body)}</div></details>
    </section>`,
    `<section class="section" id="formazione" aria-labelledby="titolo-formazione" data-source-id="34">
      ${sectionHeading('03', formation.meta.eyebrow, formation.meta.titolo, 'formazione')}
      <p class="lead">${inlineMarkdown(formation.body)}</p>
      <div class="initiatives">${initiatives.map(item => `<article class="initiative"><p class="eyebrow">${escapeHtml(item.meta.categoria)}</p><h3>${escapeHtml(item.meta.titolo)}</h3><div class="prose">${markdownToHtml(item.body)}</div></article>`).join('')}</div>
    </section>`,
    `<section class="section" id="convegni" aria-labelledby="titolo-convegni" data-source-id="52">
      ${sectionHeading('04', conference.meta.eyebrow, conference.meta.titolo, 'convegni')}
      ${markdownToHtml(conference.body)}
      <div class="events">${events.map(item => `<article class="event"><p class="event-date">${escapeHtml(item.meta.luogo)} · <time datetime="${escapeHtml(item.meta.data_iso)}">${escapeHtml(item.meta.data)}</time></p><h3>${escapeHtml(item.meta.titolo)}</h3>${markdownToHtml(item.body)}<a href="${escapeHtml(item.meta.allegato)}">${escapeHtml(item.meta.etichetta_allegato)} <span class="filetype">${escapeHtml(item.meta.tipo_allegato)}</span></a></article>`).join('')}</div>
    </section>`,
    `<section class="section archive-section" id="archivio" aria-labelledby="titolo-archivio">
      ${sectionHeading('05', archive.meta.eyebrow, archive.meta.titolo, 'archivio')}
      <p class="lead">${inlineMarkdown(archive.body)}</p>
      ${archiveEntries.map((item, index) => `${index === 0 || archiveEntries[index - 1].meta.gruppo !== item.meta.gruppo ? `<h3>${escapeHtml(item.meta.gruppo)}</h3>` : ''}<details class="archive-entry" id="${escapeHtml(item.meta.id)}" data-source-id="${escapeHtml(item.meta.source_id)}"><summary><span class="entry-date">${escapeHtml(item.meta.data)}</span><span>${escapeHtml(item.meta.titolo)}</span><span class="disclosure" aria-hidden="true"></span></summary><div class="archive-body prose"><p class="archive-note">Documento d’archivio. Date, quote e riferimenti si riferiscono all’edizione indicata.</p>${markdownToHtml(item.body)}<a class="back-link" href="#archivio">Torna all’indice dell’archivio ↑</a></div></details>`).join('\n')}
    </section>`,
    `<section class="section contact-section" id="contatti" aria-labelledby="titolo-contatti" data-source-id="16">
      ${sectionHeading('06', contact.meta.eyebrow, contact.meta.titolo, 'contatti')}
      <p class="lead">${inlineMarkdown(contact.body)}</p>
      <a class="button"${contact.meta.nuova_scheda ? ' target="_blank" rel="noopener"' : ''} href="${escapeHtml(contact.meta.link)}">${escapeHtml(contact.meta.etichetta_link)} <span aria-hidden="true">↗</span></a>
    </section>`
  ].join('\n');

  const template = fs.readFileSync(templateFile, 'utf8');
  if (!template.includes('{{CONTENUTO}}')) throw new Error('Segnaposto {{CONTENUTO}} mancante in modello.html');
  fs.writeFileSync(outputFile, template.replace('{{CONTENUTO}}', sections));
  console.log(`Creato ${path.relative(site, outputFile)} da ${7 + initiatives.length + events.length + archiveEntries.length} file Markdown.`);
}

function extract(pattern, source, label) {
  const value = source.match(pattern)?.[1];
  if (value === undefined) throw new Error(`Impossibile estrarre: ${label}`);
  return value.trim();
}

function initialize() {
  if (fs.existsSync(contentDir) || fs.existsSync(templateFile)) throw new Error('Inizializzazione già eseguita: contenuti/ o modello.html esistono.');
  const html = fs.readFileSync(outputFile, 'utf8').replace(/\r/g, '');
  const sectionMatches = [...html.matchAll(/^    <section\b[\s\S]*?^    <\/section>/gm)].map(match => match[0]);
  if (sectionMatches.length !== 7) throw new Error(`Attese 7 sezioni, trovate ${sectionMatches.length}.`);
  const [homeHtml, manifestoHtml, aboutHtml, formationHtml, conferenceHtml, archiveHtml, contactHtml] = sectionMatches;
  const contentStart = html.indexOf(sectionMatches[0]);
  const contentEnd = html.indexOf(sectionMatches.at(-1)) + sectionMatches.at(-1).length;
  fs.writeFileSync(templateFile, html.slice(0, contentStart) + '{{CONTENUTO}}' + html.slice(contentEnd));
  fs.mkdirSync(path.join(contentDir, 'formazione'), { recursive: true });
  fs.mkdirSync(path.join(contentDir, 'convegni'), { recursive: true });
  fs.mkdirSync(path.join(contentDir, 'archivio'), { recursive: true });

  fs.writeFileSync(path.join(contentDir, '01-home.md'), serialize({
    eyebrow: stripTags(extract(/<p class="eyebrow">([\s\S]*?)<\/p>/, homeHtml, 'home eyebrow')),
    titolo_html: extract(/<h1[^>]*>([\s\S]*?)<\/h1>/, homeHtml, 'home titolo'),
    pulsante_testo: stripTags(extract(/<a class="button"[^>]*>([\s\S]*?)<span/, homeHtml, 'home pulsante')),
    pulsante_link: extract(/<a class="button" href="([^"]+)"/, homeHtml, 'home link pulsante'),
    testo_secondario: stripTags(extract(/<a class="text-link"[^>]*>([\s\S]*?)<\/a>/, homeHtml, 'home link secondario')),
    link_secondario: extract(/<a class="text-link" href="([^"]+)"/, homeHtml, 'home href secondario'),
    motto: stripTags(extract(/<div class="hero-bottom"><span>([\s\S]*?)<\/span>/, homeHtml, 'home motto')),
    parola_greca: stripTags(extract(/<div class="hero-bottom">[\s\S]*?<span aria-hidden="true">([\s\S]*?)<\/span>/, homeHtml, 'home parola greca'))
  }, htmlToMarkdown(extract(/<div class="intro prose">([\s\S]*?)<\/div>/, homeHtml, 'home testo'))));

  fs.writeFileSync(path.join(contentDir, '02-manifesto.md'), serialize({
    eyebrow: stripTags(extract(/section-heading[\s\S]*?<p class="eyebrow">([\s\S]*?)<\/p>/, manifestoHtml, 'manifesto eyebrow')),
    titolo: stripTags(extract(/<h2[^>]*>([\s\S]*?)<\/h2>/, manifestoHtml, 'manifesto titolo')),
    introduzione: htmlInlineToMarkdown(extract(/<p class="lead">([\s\S]*?)<\/p>/, manifestoHtml, 'manifesto introduzione')),
    etichetta_apertura: stripTags(extract(/<summary>([\s\S]*?)<span class="disclosure"/, manifestoHtml, 'manifesto etichetta'))
  }, htmlToMarkdown(extract(/<summary>[\s\S]*?<div class="prose">([\s\S]*?)<\/div><\/details>/, manifestoHtml, 'manifesto testo'))));

  const directors = [...aboutHtml.matchAll(/<div><dt>([\s\S]*?)<\/dt><dd>([\s\S]*?)<span>([\s\S]*?)<\/span><\/dd><\/div>/g)].map(match => ({ ruolo: stripTags(match[1]), nome: stripTags(match[2]), istituzione: stripTags(match[3]) }));
  const members = [...extract(/<ul class="members">([\s\S]*?)<\/ul>/, aboutHtml, 'soci').matchAll(/<li>([\s\S]*?)<\/li>/g)].map(match => stripTags(match[1]));
  fs.writeFileSync(path.join(contentDir, '03-chi-siamo.md'), serialize({
    eyebrow: stripTags(extract(/section-heading[\s\S]*?<p class="eyebrow">([\s\S]*?)<\/p>/, aboutHtml, 'chi siamo eyebrow')),
    titolo: stripTags(extract(/<h2[^>]*>([\s\S]*?)<\/h2>/, aboutHtml, 'chi siamo titolo')),
    introduzione: htmlInlineToMarkdown(extract(/<p class="lead">([\s\S]*?)<\/p>/, aboutHtml, 'chi siamo introduzione')),
    nota: htmlInlineToMarkdown(extract(/<p class="archive-note">([\s\S]*?)<\/p>/, aboutHtml, 'chi siamo nota')),
    direttivo: directors,
    soci: members
  }, htmlToMarkdown(extract(/<summary>I direttivi precedenti[\s\S]*?<div class="prose">([\s\S]*?)<\/div><\/details>/, aboutHtml, 'direttivi precedenti'))));

  fs.writeFileSync(path.join(contentDir, '04-formazione.md'), serialize({
    eyebrow: stripTags(extract(/section-heading[\s\S]*?<p class="eyebrow">([\s\S]*?)<\/p>/, formationHtml, 'formazione eyebrow')),
    titolo: stripTags(extract(/<h2[^>]*>([\s\S]*?)<\/h2>/, formationHtml, 'formazione titolo'))
  }, htmlInlineToMarkdown(extract(/<p class="lead">([\s\S]*?)<\/p>/, formationHtml, 'formazione introduzione'))));
  const initiativeMatches = [...formationHtml.matchAll(/<article class="initiative"><p class="eyebrow">([\s\S]*?)<\/p><h3>([\s\S]*?)<\/h3><div class="prose">([\s\S]*?)<\/div><\/article>/g)];
  initiativeMatches.forEach((match, index) => fs.writeFileSync(path.join(contentDir, 'formazione', `${String(index + 1).padStart(2, '0')}-${slug(stripTags(match[2]))}.md`), serialize({ categoria: stripTags(match[1]), titolo: stripTags(match[2]) }, htmlToMarkdown(match[3]))));

  fs.writeFileSync(path.join(contentDir, '05-convegni.md'), serialize({
    eyebrow: stripTags(extract(/section-heading[\s\S]*?<p class="eyebrow">([\s\S]*?)<\/p>/, conferenceHtml, 'convegni eyebrow')),
    titolo: stripTags(extract(/<h2[^>]*>([\s\S]*?)<\/h2>/, conferenceHtml, 'convegni titolo'))
  }, htmlToMarkdown(extract(/<\/div>\s*([\s\S]*?)\s*<div class="events">/, conferenceHtml, 'convegni introduzione'))));
  const eventMatches = [...conferenceHtml.matchAll(/<article class="event"><p class="event-date">([\s\S]*?) · <time datetime="([^"]+)">([\s\S]*?)<\/time><\/p><h3>([\s\S]*?)<\/h3>([\s\S]*?)<a href="([^"]+)">([\s\S]*?)<span class="filetype">([\s\S]*?)<\/span><\/a><\/article>/g)];
  eventMatches.forEach((match, index) => fs.writeFileSync(path.join(contentDir, 'convegni', `${String(index + 1).padStart(2, '0')}-${slug(stripTags(match[4]))}.md`), serialize({ luogo: stripTags(match[1]), data_iso: match[2], data: stripTags(match[3]), titolo: stripTags(match[4]), allegato: match[6], etichetta_allegato: stripTags(match[7]), tipo_allegato: stripTags(match[8]) }, htmlToMarkdown(match[5]))));

  fs.writeFileSync(path.join(contentDir, '06-archivio.md'), serialize({
    eyebrow: stripTags(extract(/section-heading[\s\S]*?<p class="eyebrow">([\s\S]*?)<\/p>/, archiveHtml, 'archivio eyebrow')),
    titolo: stripTags(extract(/<h2[^>]*>([\s\S]*?)<\/h2>/, archiveHtml, 'archivio titolo'))
  }, htmlInlineToMarkdown(extract(/<p class="lead">([\s\S]*?)<\/p>/, archiveHtml, 'archivio introduzione'))));
  const archiveToken = /<h3>([\s\S]*?)<\/h3>|<details class="archive-entry" id="([^"]+)" data-source-id="([^"]+)"><summary><span class="entry-date">([\s\S]*?)<\/span><span>([\s\S]*?)<\/span>[\s\S]*?<div class="archive-body prose"><p class="archive-note">[\s\S]*?<\/p>([\s\S]*?)<a class="back-link"[\s\S]*?<\/a><\/div><\/details>/g;
  let group = '';
  let archiveIndex = 0;
  for (const match of archiveHtml.matchAll(archiveToken)) {
    if (match[1] !== undefined) { group = stripTags(match[1]); continue; }
    archiveIndex++;
    fs.writeFileSync(path.join(contentDir, 'archivio', `${String(archiveIndex).padStart(2, '0')}-${match[2]}.md`), serialize({ gruppo: group, id: match[2], source_id: match[3], data: stripTags(match[4]), titolo: stripTags(match[5]) }, htmlToMarkdown(match[6])));
  }

  fs.writeFileSync(path.join(contentDir, '07-contatti.md'), serialize({
    eyebrow: stripTags(extract(/section-heading[\s\S]*?<p class="eyebrow">([\s\S]*?)<\/p>/, contactHtml, 'contatti eyebrow')),
    titolo: stripTags(extract(/<h2[^>]*>([\s\S]*?)<\/h2>/, contactHtml, 'contatti titolo')),
    link: extract(/<a class="button"[^>]*href="([^"]+)"/, contactHtml, 'contatti link'),
    etichetta_link: stripTags(extract(/<a class="button"[^>]*>([\s\S]*?)<span/, contactHtml, 'contatti etichetta')),
    nuova_scheda: /<a class="button"[^>]*target\s*=\s*(?:"_blank"|blank)/i.test(contactHtml)
  }, htmlInlineToMarkdown(extract(/<p class="lead">([\s\S]*?)<\/p>/, contactHtml, 'contatti introduzione'))));
  console.log(`Estratti ${7 + initiativeMatches.length + eventMatches.length + archiveIndex} file Markdown dall'index.html attuale.`);
}

function slug(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

if (process.argv.includes('--inizializza')) initialize();
else renderSite();
