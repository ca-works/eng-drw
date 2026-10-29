// Interactions of the Image, Vector and platform sections on the homepage. Everything shown is real
// application output (public/demo, made by tools/demo/make_demo_assets.py); these scripts only reveal it.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Before/after slider and the Quick Selection outline.
const cutout = document.querySelector<HTMLElement>('[data-cutout]');
if (cutout) {
  const range = cutout.querySelector<HTMLInputElement>('.cutout-range')!;
  const caption = document.querySelector<HTMLElement>('[data-cutout-caption]');
  const set = (v: number) => cutout.style.setProperty('--split', `${v}%`);
  range.addEventListener('input', () => set(Number(range.value)));
  const captions: Record<string, string> = {
    remove: caption?.innerHTML ?? '',
    select:
      'Real output of the app’s <em>Quick Selection</em>: one brush stroke across the hub, and the selection follows the edges it finds. Selections become masks, crops or new layers.',
  };
  document.querySelectorAll<HTMLButtonElement>('[data-cutout-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      const mode = b.dataset.cutoutMode!;
      document.querySelectorAll('[data-cutout-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      cutout.dataset.mode = mode;
      range.disabled = mode === 'select';
      if (caption) caption.innerHTML = captions[mode];
    }),
  );
  // A gentle first sweep shows that the picture can be compared.
  if (!reduced)
    new IntersectionObserver((entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / 1600);
        const v = 50 + Math.sin(p * Math.PI * 2) * 22 * (1 - p);
        set(v);
        range.value = String(v);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 }).observe(cutout);
}

// Target file size: switch between the app's exported files.
const compress = document.querySelector<HTMLElement>('[data-compress]');
compress?.querySelectorAll<HTMLButtonElement>('[data-target]').forEach((b) =>
  b.addEventListener('click', () => {
    const i = b.dataset.target!;
    compress.querySelectorAll('[data-target]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    compress.querySelectorAll<HTMLElement>('[data-export]').forEach((img) => (img.hidden = img.dataset.export !== i));
    compress.querySelectorAll<HTMLElement>('[data-stats]').forEach((s) => (s.hidden = s.dataset.stats !== i));
  }),
);
compress?.querySelector('[role="radiogroup"]')?.addEventListener('keydown', (event) => {
  const e = event as KeyboardEvent;
  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
  const buttons = [...compress.querySelectorAll<HTMLButtonElement>('[data-target]')];
  const current = buttons.findIndex((x) => x.getAttribute('aria-checked') === 'true');
  const next = buttons[(current + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length];
  e.preventDefault();
  next.click();
  next.focus();
});

// Vector tracing: raster → outline drawn → points → export, once in view (replayable).
const trace = document.querySelector<HTMLElement>('[data-trace]');
if (trace) {
  let timers: number[] = [];
  const play = () => {
    timers.forEach(clearTimeout);
    timers = [];
    if (reduced) {
      trace.dataset.step = '3';
      return;
    }
    trace.dataset.step = '0';
    void trace.offsetWidth;
    [1, 2, 3].forEach((s, i) => timers.push(window.setTimeout(() => (trace.dataset.step = String(s)), 700 + i * 1500)));
  };
  trace.dataset.step = reduced ? '3' : '0';
  new IntersectionObserver((entries, observer) => {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();
    play();
  }, { threshold: 0.45 }).observe(trace);
  document.querySelector('[data-trace-replay]')?.addEventListener('click', play);
}

// Platform tabs (WAI-ARIA tabs pattern).
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-platform-tab]')];
const select = (tab: HTMLButtonElement) => {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls')!);
    if (panel) panel.hidden = !on;
  });
};
tabs.forEach((t, i) => {
  t.addEventListener('click', () => select(t));
  t.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const next = tabs[(i + d + tabs.length) % tabs.length];
    select(next);
    next.focus();
  });
});
// Start on the visitor's own platform where it is clear.
const ua = navigator.userAgent;
const own = /Windows/.test(ua) ? 'Windows' : /Linux|X11/.test(ua) && !/Android/.test(ua) ? 'Linux' : null;
const ownTab = tabs.find((t) => t.dataset.platformTab === own);
if (ownTab) select(ownTab);
