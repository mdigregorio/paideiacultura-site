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
