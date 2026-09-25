'use strict';
const { screens } = window.DESIGN_CATALOG;
const grid = document.querySelector('#grid'), viewer = document.querySelector('#viewer');
let mode = 'current', visible = [], selected = 0, opener;
function render() {
  const query = document.querySelector('#search').value.trim().toLowerCase();
  const group = document.querySelector('#group').value;
  visible = screens.filter(s => (mode === 'all' || s.status === mode) && (group === 'all' || s.group === group) && `${s.title} ${s.group} ${s.note} ${s.revision}`.toLowerCase().includes(query));
  grid.replaceChildren();
  visible.forEach((screen, index) => {
    const article = document.createElement('article'); article.className = 'card';
    const button = document.createElement('button'); button.className = 'art'; button.setAttribute('aria-label', `Inspect ${screen.title}`);
    const img = new Image(); img.src = screen.path; img.alt = screen.title; img.loading = 'lazy'; img.decoding = 'async'; img.width = screen.width; img.height = screen.height;
    const zoom = document.createElement('span'); zoom.className = 'zoom'; zoom.textContent = 'View ↗';
    button.append(img, zoom); button.addEventListener('click', () => { opener = button; selected = index; show(); viewer.showModal(); });
    const body = document.createElement('div'); body.className = 'card-body';
    for (const [tag, cls, text] of [['div','badge',screen.revision],['h2','',screen.title],['p','flow',screen.group],['p','',screen.note]]) {
      const el = document.createElement(tag); el.className = cls; el.textContent = text; body.append(el);
    }
    article.append(button, body); grid.append(article);
  });
  document.querySelector('#count').textContent = `${visible.length} screens · ${screens.length} images in the complete collection`;
  document.querySelector('#empty').hidden = visible.length > 0;
}
function show() {
  const screen = visible[selected]; if (!screen) return;
  const img = document.querySelector('#full'); img.src = screen.path; img.alt = screen.title;
  for (const [id,text] of [['screen-title',screen.title],['note',screen.note],['revision',screen.revision],['position',`${selected+1} / ${visible.length}`],['dimensions',`${screen.width} × ${screen.height} · Original PNG`]]) document.getElementById(id).textContent = text;
  document.querySelector('#original').href = screen.path;
}
function step(delta) { selected = (selected + delta + visible.length) % visible.length; show(); }
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.view; document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  document.querySelector('#group').value = 'all'; render();
}));
document.querySelector('#search').addEventListener('input', render);
document.querySelector('#group').addEventListener('change', render);
document.querySelector('#close').addEventListener('click', () => viewer.close());
document.querySelector('#previous').addEventListener('click', () => step(-1));
document.querySelector('#next').addEventListener('click', () => step(1));
viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
viewer.addEventListener('close', () => opener?.focus());
document.addEventListener('keydown', event => {
  if (!viewer.open) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
});
window.addEventListener('pageshow', render);
render();
