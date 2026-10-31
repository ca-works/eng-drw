import './lightbox';

const root = document.documentElement;
const themeButton = document.querySelector<HTMLButtonElement>(
  '[data-theme-toggle]',
);
const modes = ['auto', 'light', 'dark'];
function themeLabel() {
  if (themeButton)
    themeButton.setAttribute(
      'aria-label',
      `Theme: ${root.dataset.theme || 'auto'}. Click to switch.`,
    );
}
themeLabel();
themeButton?.addEventListener('click', () => {
  const next = modes[(modes.indexOf(root.dataset.theme || 'auto') + 1) % 3];
  root.dataset.theme = next;
  root.style.colorScheme = next === 'auto' ? 'light dark' : next;
  try {
    localStorage.setItem('eng-theme', next);
  } catch {}
  themeLabel();
});
const dialog = document.querySelector<HTMLDialogElement>('#mobile-menu');
const menuButton = document.querySelector<HTMLButtonElement>('.menu-button');
menuButton?.addEventListener('click', () => {
  dialog?.showModal();
  menuButton.setAttribute('aria-expanded', 'true');
});
dialog
  ?.querySelector('[data-close-menu]')
  ?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('close', () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.focus();
});
document.querySelector('[data-share]')?.addEventListener('click', async () => {
  const status = document.querySelector('[data-share-status]');
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'ENG Drawing Viewer',
        url: location.href,
      });
    } else {
      await navigator.clipboard.writeText(location.href);
      if (status) status.textContent = 'Link copied.';
    }
  } catch {
    if (status) status.textContent = 'Copy this page’s address to share it.';
  }
});

// Keep keyboard focus within the mobile sheet, including reverse tabbing.
dialog?.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const stops = Array.from(
    dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled])'),
  );
  const first = stops[0],
    last = stops[stops.length - 1];
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === dialog)
  ) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});
