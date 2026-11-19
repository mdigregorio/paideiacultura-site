'use strict';
// Progressive enhancement only: every document is in the HTML, with no fetch,
// cookies, browser storage, embedded services or third-party libraries.
const sidebar = document.querySelector('.sidebar');
const menu = document.querySelector('.menu-toggle');
const mobile = window.matchMedia('(max-width: 760px)');
const links = [...document.querySelectorAll('#navigazione a[href^="#"]')];

function closeMenu() {
  sidebar.classList.remove('menu-open');
  menu.setAttribute('aria-expanded', 'false');
}
function syncMenu() {
  menu.hidden = !mobile.matches;
  sidebar.classList.toggle('menu-enhanced', mobile.matches);
  closeMenu();
}
menu.addEventListener('click', () => {
  const open = sidebar.classList.toggle('menu-open');
  menu.setAttribute('aria-expanded', String(open));
});
sidebar.addEventListener('keydown', event => {
  if (event.key === 'Escape' && mobile.matches) { closeMenu(); menu.focus(); }
});
mobile.addEventListener('change', syncMenu);
syncMenu();

function anchorTarget(hash) {
  try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
  catch { return null; }
}
function reveal(target, focus = false) {
  if (!target) return;
  let parent = target;
  while (parent) {
    if (parent instanceof HTMLDetailsElement) parent.open = true;
    parent = parent.parentElement;
  }
  if (focus) {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
  const target = anchorTarget(link.hash);
  if (!target) return;
  closeMenu();
  // Keep native links, URL fragments and browser history working.
  reveal(target, true);
});
window.addEventListener('hashchange', () => reveal(anchorTarget(location.hash), true));
if (location.hash) reveal(anchorTarget(location.hash));

const membersOrder = document.getElementById('ordine-soci');
const membersList = document.getElementById('soci');
if (membersOrder && membersList) {
  const collator = new Intl.Collator('it', { sensitivity: 'base' });
  const members = [...membersList.children];
  const compareSurnames = (a, b) => collator.compare(a.dataset.cognome, b.dataset.cognome)
    || collator.compare(a.dataset.nome, b.dataset.nome);
  const cardNumber = member => member.dataset.tessera ? Number(member.dataset.tessera) : Infinity;
  const sortMembers = () => {
    const byCard = membersOrder.value === 'tessera';
    const ordered = [...members].sort((a, b) => (byCard ? cardNumber(a) - cardNumber(b) : 0)
      || compareSurnames(a, b));
    membersList.replaceChildren(...ordered);
    document.getElementById('stato-ordine-soci').textContent = byCard
      ? 'Elenco ordinato per numero di tessera.'
      : 'Elenco ordinato per cognome.';
  };
  membersOrder.closest('.members-controls').hidden = false;
  membersOrder.addEventListener('change', sortMembers);
  sortMembers();
}

// The catalog keeps all records in the HTML. Filters only change visibility.
(() => {
  const catalog = document.getElementById('catalogo-formazione');
  if (!catalog) return;
  const controls = catalog.querySelector('.catalog-controls');
  const view = catalog.querySelector('#catalogo-vista');
  const search = catalog.querySelector('#catalogo-cerca');
  const year = catalog.querySelector('#catalogo-anno');
  const category = catalog.querySelector('#catalogo-categoria');
  const reset = catalog.querySelector('#catalogo-azzera');
  const status = catalog.querySelector('#catalogo-risultati');
  const more = catalog.querySelector('#catalogo-altri');
  const empty = catalog.querySelector('#catalogo-nessuno');
  const panels = {
    corsi: catalog.querySelector('[data-catalog-panel="corsi"]'),
    edizioni: catalog.querySelector('[data-catalog-panel="edizioni"]')
  };
  if ([controls, view, search, year, category, reset, status, more, empty, ...Object.values(panels)].some(element => !element)) return;

  const entries = {
    corsi: [...panels.corsi.querySelectorAll('[data-catalog-course]')],
    edizioni: [...panels.edizioni.querySelectorAll('[data-catalog-edition]')]
  };
  const pageSize = { corsi: 12, edizioni: 8 };
  const limits = { ...pageSize };
  const normalize = value => String(value ?? '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it')
    .replace(/['’\-]/g, ' ').replace(/\s+/g, ' ').trim();
  const searchable = new Map(Object.values(entries).flat().map(entry => [entry, normalize(entry.dataset.search)]));
  const currentView = () => view.value === 'corsi' ? 'corsi' : 'edizioni';
  const tokens = () => normalize(search.value).split(' ').filter(Boolean);
  const matchesFilters = (entry, words) => (!year.value || entry.dataset.year === year.value)
    && (!category.value || entry.dataset.category === category.value)
    && words.every(word => searchable.get(entry).includes(word));
  const matchingEntries = key => {
    const words = tokens();
    return entries[key].filter(entry => matchesFilters(entry, words));
  };
  const hashEntry = hash => {
    const target = anchorTarget(hash);
    if (!target || !catalog.contains(target)) return null;
    return target.closest('[data-catalog-course], [data-catalog-edition]');
  };

  function render(keepHash = false) {
    const key = currentView();
    const matched = matchingEntries(key);
    const visible = new Set(matched.slice(0, limits[key]));
    for (const [name, panel] of Object.entries(panels)) {
      panel.hidden = name !== key;
      for (const entry of entries[name]) entry.hidden = name === key && !visible.has(entry);
    }
    const label = key === 'corsi'
      ? matched.length === 1 ? 'corso o intervento' : 'corsi e interventi'
      : matched.length === 1 ? 'scuola o iniziativa' : 'scuole e iniziative';
    status.textContent = `${matched.length} ${label} su ${entries[key].length} · ${visible.size} ${visible.size === 1 ? 'visibile' : 'visibili'}`;
    more.textContent = key === 'corsi' ? 'Mostra altri corsi' : 'Mostra altre edizioni';
    more.hidden = visible.size >= matched.length;
    empty.hidden = matched.length > 0;
    // Keep a shared URL meaningful if a manual filter hides its former target.
    const linkedEntry = hashEntry(location.hash);
    if (!keepHash && linkedEntry && (linkedEntry.hidden || linkedEntry.closest('[data-catalog-panel]').hidden)) {
      history.replaceState(history.state, '', '#catalogo-formazione');
    }
    return matched;
  }

  function activateTarget(hash) {
    const entry = hashEntry(hash);
    if (!entry) return false;
    const key = entry.hasAttribute('data-catalog-course') ? 'corsi' : 'edizioni';
    view.value = key;
    if (!matchesFilters(entry, tokens())) {
      search.value = '';
      year.value = '';
      category.value = '';
    }
    const position = matchingEntries(key).indexOf(entry);
    limits[key] = Math.max(limits[key], position + 1);
    render(true);
    return true;
  }

  const resetLimits = () => Object.assign(limits, pageSize);
  for (const field of [search, year, category]) {
    field.addEventListener(field === search ? 'input' : 'change', () => {
      resetLimits();
      render();
    });
  }
  view.addEventListener('change', () => render());
  reset.addEventListener('click', () => {
    search.value = '';
    year.value = '';
    category.value = '';
    resetLimits();
    render();
  });
  more.addEventListener('click', () => {
    const key = currentView();
    const previousLimit = limits[key];
    limits[key] += pageSize[key];
    const matched = render();
    const firstNewSummary = matched[previousLimit]?.querySelector('summary');
    if (firstNewSummary) {
      firstNewSummary.focus({ preventScroll: true });
      firstNewSummary.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  });
  // Capture before the site's general anchor handler opens and focuses details.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    activateTarget(link.hash);
  }, true);
  window.addEventListener('hashchange', () => {
    if (activateTarget(location.hash)) reveal(anchorTarget(location.hash), true);
  });
  if (!['corsi', 'edizioni'].includes(view.value)) view.value = 'edizioni';
  if (!activateTarget(location.hash)) render();
  controls.hidden = false;
})();

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (!visible.length) return;
    for (const link of links) {
      if (link.hash === '#' + visible[0].target.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }, { rootMargin: '-12% 0px -55% 0px' });
  document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
}
