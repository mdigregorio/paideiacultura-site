import fs from 'node:fs';

const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const personName = person => [person.nome, person.cognome].filter(Boolean).join(' ').trim();
const state = item => item.stato === 'annullato' ? '<span class="catalog-status">Annullato</span>' : item.stato === 'da-controllare' ? '<span class="catalog-status">Da controllare</span>' : '';
const formatter = new Intl.DateTimeFormat('it', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const date = value => `<time datetime="${esc(value)}">${esc(formatter.format(new Date(value + 'T12:00:00Z')))}</time>`;
const period = item => item.inizio && item.fine ? (item.inizio === item.fine ? date(item.inizio) : `${date(item.inizio)} – ${date(item.fine)}`) : item.inizio ? date(item.inizio) : esc(item.periodo ?? '');
const paragraphs = text => String(text ?? '').trim().split(/\n\s*\n/).filter(Boolean).map(block => `<p>${esc(block).replace(/\n/g, '<br>')}</p>`).join('\n');
const summary = (year, title, subtitle, status) => `<summary><span class="entry-date">${esc(year)}</span><span class="catalog-entry-title">${esc(title)}${status}<span class="catalog-meta">${esc(subtitle)}</span></span><span class="disclosure" aria-hidden="true"></span></summary>`;
const historicDocuments = {
  Cannigione2000: 'seconda-scuola-estiva-di-teoria-e-metodologia-sociologica',
  Roma2001: 'terza-scuola-invernale-di-metodologia', Firenze2002: 'quarta-scuola-invernale-di-metodologia', Otranto2002: 'primo-articolo-del-blog',
  Giffoni2004: 'prima-scuola-estiva-sul-metodo-e-la-ricerca-sociale', Giffoni2005: 'seconda-scuola-estiva-sul-metodo-e-la-ricerca-sociale',
  Giffoni2006: 'terza-scuola-estiva-sul-metodo-e-la-ricerca-sociale', Giffoni2007: 'quarta-scuola-estiva-sul-metodo-e-la-ricerca-sociale',
  Giffoni2008: 'quinta-scuola-estiva-sul-metodo-e-la-ricerca-sociale', Giffoni2009: 'sesta-scuola-estiva-sul-metodo-e-la-ricerca-sociale'
};

export function renderCatalogoFormazione(file, archiveIds = []) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const schools = [...data.scuole].sort((a, b) => b.anno - a.anno || (b.inizio ?? '').localeCompare(a.inizio ?? '') || a.id.localeCompare(b.id));
  const schoolById = new Map(schools.map(item => [item.id, item]));
  const modules = [...data.moduli].sort((a, b) => b.anno - a.anno || (a.inizio ?? '').localeCompare(b.inizio ?? '') || a.id.localeCompare(b.id));
  const moduleById = new Map(modules.map(item => [item.id, item]));
  const years = [...new Set(schools.map(item => item.anno))].sort((a, b) => b - a);
  const categories = [...new Set(schools.map(item => item.categoria))].sort((a, b) => a.localeCompare(b, 'it'));
  const schoolTitle = school => `${school.luogo} — ${school.categoria}${school.edizione ? ` · ${school.edizione}ª edizione` : ''}`;
  const moduleSearch = item => [item.titolo, item.opzione, ...(item.docenti ?? []).map(personName)].filter(Boolean).join(' ');
  const historicLink = school => {
    const id = historicDocuments[school.origine];
    return id && archiveIds.includes(id) ? `<a href="#${id}">Programma storico dell’edizione</a>` : '';
  };
  const coursesHtml = modules.map(item => {
    const school = schoolById.get(item.scuola);
    if (!school) throw new Error(`Scuola mancante per ${item.id}`);
    return `<details class="course-entry" id="${esc(item.id)}" data-catalog-course data-year="${item.anno}" data-category="${esc(school.categoria)}" data-school="${esc(school.id)}" data-search="${esc([school.luogo, school.categoria, moduleSearch(item)].join(' '))}">
      ${summary(item.anno, item.titolo || 'Intervento senza titolo registrato', `${school.luogo} · ${(item.docenti ?? []).map(personName).join(', ')}`, state(item))}
      <div class="catalog-body"><p class="catalog-meta">${esc(school.categoria)}${school.edizione ? ` · ${esc(school.edizione)}ª edizione` : ''}${item.opzione ? ` · Settimana / opzione ${esc(item.opzione)}` : ''}</p>
        ${period(item) ? `<p>${period(item)}</p>` : ''}
        <h4>Docenti indicati nel programma</h4><ul class="catalog-teachers">${(item.docenti ?? []).map(person => `<li>${esc(personName(person))}${person.affiliazione ? `<span>${esc(person.affiliazione)}</span>` : ''}</li>`).join('')}</ul>
        ${item.programma ? `<h4>Programma del corso</h4><div class="prose">${paragraphs(item.programma)}</div>` : ''}
        <div class="catalog-actions"><a href="#${esc(school.id)}" data-show-edition>Vedi l’edizione</a>${historicLink(school)}</div>
      </div></details>`;
  }).join('\n');
  const schoolsHtml = schools.map(school => {
    const items = school.moduli.map(id => moduleById.get(id));
    if (items.some(item => !item)) throw new Error(`Modulo mancante per ${school.id}`);
    const search = [schoolTitle(school), school.argomento, ...items.map(moduleSearch)].filter(Boolean).join(' ');
    const title = school.categoria === 'MetA' && school.argomento ? school.argomento : schoolTitle(school);
    const teachers = [...new Set(items.flatMap(item => (item.docenti ?? []).map(personName)).filter(Boolean))];
    const subtitle = school.categoria === 'MetA'
      ? `${school.luogo} · MetA${teachers.length ? ` · Docenti: ${teachers.join(', ')}` : ''}`
      : school.struttura || school.luogo;
    return `<details class="edition-entry" id="${esc(school.id)}" data-catalog-edition data-year="${school.anno}" data-category="${esc(school.categoria)}" data-search="${esc(search)}">
      ${summary(school.anno, title, subtitle, state(school))}
      <div class="catalog-body">${period(school) ? `<p>${period(school)}</p>` : ''}${school.sedi_multiple ? '<p class="catalog-meta">Edizione su due sedi.</p>' : ''}
        ${items.length ? `<ul class="catalog-modules">${items.map(item => `<li><a href="#${esc(item.id)}">${esc(item.titolo || 'Intervento senza titolo registrato')}</a>${state(item)}<span class="catalog-meta">${esc((item.docenti ?? []).map(personName).join(', '))}${item.opzione ? ` · Settimana / opzione ${esc(item.opzione)}` : ''}</span></li>`).join('')}</ul>` : '<p class="catalog-meta">Il dettaglio dei moduli non è disponibile.</p>'}
        ${historicLink(school) ? `<div class="catalog-actions">${historicLink(school)}</div>` : ''}
      </div></details>`;
  }).join('\n');
  return `<div class="training-catalog" id="catalogo-formazione">
    <p class="catalog-overview">${schools.length} scuole e iniziative · ${modules.length} corsi e interventi · ${Math.min(...years)}–${Math.max(...years)}</p>
    <div class="catalog-controls" hidden>
      <label for="catalogo-vista">Consulta per<select id="catalogo-vista"><option value="edizioni">Edizione</option><option value="corsi">Corso</option></select></label>
      <label for="catalogo-cerca" class="catalog-search">Argomento, docente o luogo<input id="catalogo-cerca" type="search" placeholder="Es. intervista, Marradi, Tortorella" autocomplete="off" aria-controls="catalogo-edizioni catalogo-corsi"></label>
      <label for="catalogo-anno">Anno<select id="catalogo-anno"><option value="">Tutti gli anni</option>${years.map(year => `<option value="${year}">${year}</option>`).join('')}</select></label>
      <label for="catalogo-categoria">Iniziativa<select id="catalogo-categoria"><option value="">Tutte le iniziative</option>${categories.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('')}</select></label>
      <button class="button button-secondary" type="button" id="catalogo-azzera">Azzera filtri</button>
    </div>
    <p class="catalog-results" id="catalogo-risultati" role="status">Le edizioni sono ordinate dalla più recente.</p>
    <p class="catalog-note">Le affiliazioni dei docenti si riferiscono al programma dell’epoca.</p>
    <p id="catalogo-nessuno" hidden>Nessun risultato. Prova a cambiare la ricerca o i filtri.</p>
    <div class="catalog-list" id="catalogo-edizioni" data-catalog-panel="edizioni"><h3 class="sr-only">Scuole e iniziative per edizione</h3>${schoolsHtml}</div>
    <div class="catalog-list" id="catalogo-corsi" data-catalog-panel="corsi"><h3>Corsi e interventi</h3>${coursesHtml}</div>
    <button class="button button-secondary" id="catalogo-altri" type="button" hidden>Mostra altre edizioni</button>
  </div>`;
}
