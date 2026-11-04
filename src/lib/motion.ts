/**
 * Page motion, kept in one place and deliberately small.
 *
 * Reveals, a read-progress rule, gentle parallax and counters. Everything is
 * driven by IntersectionObserver or one rAF-throttled scroll handler, and all of
 * it stands down when the reader prefers reduced motion.
 */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Read progress ------------------------------------------------------- */

const progress = document.querySelector<HTMLElement>('[data-progress]');
let ticking = false;

const onScroll = () => {
  if (ticking) return;
  ticking = true;

  requestAnimationFrame(() => {
    ticking = false;

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const value = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      progress.style.transform = `scaleX(${value})`;
    }

    if (reduce) return;

    for (const element of parallaxItems) {
      const speed = Number(element.dataset.parallax || 0);
      if (!speed) continue;
      const rect = element.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) continue;
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
      element.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    }

    const header = document.querySelector<HTMLElement>('[data-site-header]');
    if (header) header.toggleAttribute('data-scrolled', window.scrollY > 24);
  });
};

/* Parallax ------------------------------------------------------------ */

const parallaxItems = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));

/* Reveals ------------------------------------------------------------- */

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );

  for (const element of document.querySelectorAll<HTMLElement>('[data-reveal], .reveal-line')) {
    revealObserver.observe(element);
  }
} else {
  for (const element of document.querySelectorAll<HTMLElement>('[data-reveal], .reveal-line')) {
    element.classList.add('is-in');
  }
}

/* Counters ------------------------------------------------------------ */

const formatCount = (value: number, decimals: number) =>
  value.toLocaleString('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const animateCount = (element: HTMLElement) => {
  const target = Number(element.dataset.count || 0);
  if (!Number.isFinite(target)) return;

  const decimals = Number(element.dataset.decimals || 0);
  const prefix = element.dataset.prefix || '';
  const suffix = element.dataset.suffix || '';
  const duration = 1300;
  const started = performance.now();

  const frame = (now: number) => {
    const linear = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - linear, 3);
    element.textContent = `${prefix}${formatCount(target * eased, decimals)}${suffix}`;
    if (linear < 1) requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
};

const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));

if (reduce || !('IntersectionObserver' in window)) {
  for (const counter of counters) {
    const target = Number(counter.dataset.count || 0);
    const decimals = Number(counter.dataset.decimals || 0);
    counter.textContent = `${counter.dataset.prefix || ''}${formatCount(target, decimals)}${counter.dataset.suffix || ''}`;
  }
} else if (counters.length > 0) {
  const counterObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        counterObserver.unobserve(element);
        animateCount(element);
      }
    },
    { threshold: 0.4 }
  );

  for (const counter of counters) counterObserver.observe(counter);
}

/* Wire up ------------------------------------------------------------- */

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
onScroll();
