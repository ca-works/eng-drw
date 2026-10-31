// The PowerPoint story: one drawing, three callouts, three comments, the queue, the finished slide.
// Steps are buttons too, so the story can be read at any pace and without motion.
const story = document.querySelector<HTMLElement>('[data-review]');
if (story) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const buttons = [...story.querySelectorAll<HTMLButtonElement>('[data-review-step]')];
  const marked = [...story.querySelectorAll<HTMLElement>('[data-at]')];
  const last = buttons.length - 1;
  const hold = [900, 1500, 1000, 2100, 1500];
  let timers: number[] = [];
  const show = (step: number) => {
    story.dataset.step = String(step);
    marked.forEach((el) => el.classList.toggle('is-on', Number(el.dataset.at) <= step));
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === step)));
  };
  const stop = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const play = () => {
    stop();
    if (reduced) return show(last);
    show(0);
    let at = 0;
    hold.forEach((ms, i) => {
      at += ms;
      timers.push(window.setTimeout(() => show(i + 1), at));
    });
  };
  buttons.forEach((b, i) =>
    b.addEventListener('click', () => {
      stop();
      show(i);
    }),
  );
  story.querySelector('[data-review-replay]')?.addEventListener('click', play);
  story.classList.add('is-ready');
  show(reduced ? last : 0);
  new IntersectionObserver(
    (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      play();
    },
    { threshold: 0.35 },
  ).observe(story);
}
