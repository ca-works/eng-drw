// Tap a screenshot to see it large. A second tap on the picture zooms in, for reading on a phone.
const box = document.querySelector<HTMLDialogElement>('#lightbox');
if (box) {
  const picture = box.querySelector('img')!;
  const opener = { last: null as HTMLElement | null };
  document.addEventListener('click', (event) => {
    const zoom = (event.target as Element).closest<HTMLElement>('[data-zoom]');
    if (!zoom) return;
    const figure = zoom.closest('figure');
    const shown = [...(figure?.querySelectorAll('img') ?? [])].find((i) => i.getClientRects().length > 0);
    if (!shown) return;
    const sources = shown.closest('picture')?.querySelector<HTMLSourceElement>('source[type="image/webp"]')?.srcset;
    const largest = sources
      ?.split(',')
      .map((entry) => entry.trim().split(/\s+/))
      .sort((a, b) => parseInt(b[1]) - parseInt(a[1]))[0][0];
    picture.src = largest ?? shown.currentSrc;
    picture.alt = shown.alt;
    box.classList.remove('is-zoomed');
    opener.last = zoom;
    box.showModal();
  });
  box.addEventListener('click', (event) => {
    const target = event.target as Element;
    if (target === picture) box.classList.toggle('is-zoomed');
    else box.close();
  });
  box.addEventListener('close', () => {
    picture.removeAttribute('src');
    opener.last?.focus();
  });
}
