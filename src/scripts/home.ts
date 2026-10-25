import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.to('.hero-window', {
    rotateX: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero-product',
      start: 'top 65%',
      end: 'bottom 55%',
      scrub: 1,
    },
  });
  gsap.utils
    .toArray<HTMLElement>(
      '.section-heading,.feature-grid,.converter,.slide-composition,.privacy-content',
    )
    .forEach((el) =>
      gsap.from(el, {
        y: 26,
        opacity: 0,
        duration: 0.75,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 94%', once: true },
      }),
    );
});
const zoom = document.querySelector<HTMLInputElement>('#zoom');
zoom?.addEventListener('input', () => {
  const out = document.querySelector<HTMLOutputElement>('#zoom-value');
  const sheet = document.querySelector<HTMLElement>('[data-zoom-sheet]');
  if (out) out.value = `${zoom.value}%`;
  if (sheet) sheet.style.transform = `scale(${Number(zoom.value) / 100})`;
});
const descriptions: Record<string, string> = {
  DOCX: 'Editable text or page pictures in a Word document.',
  XLSX: 'Extract tables into an Excel workbook. Best for text-based tables.',
  PPTX: 'One drawing per slide, with an editable filename title.',
  PNG: 'Render PDF pages as PNG, JPEG or TIFF at 100–600 DPI.',
  TXT: 'Extract text as plain text or Markdown with page headings.',
};
document
  .querySelectorAll<HTMLButtonElement>('[data-format]')
  .forEach((button) =>
    button.addEventListener('click', () => {
      document
        .querySelectorAll('[data-format]')
        .forEach((b) => b.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
      const desc = document.querySelector('[data-format-description]');
      if (desc) desc.textContent = descriptions[button.dataset.format!];
    }),
  );
