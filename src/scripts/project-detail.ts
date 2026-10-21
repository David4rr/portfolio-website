import anime from 'animejs';
import { setupDetailBackButton, splitTextToWords } from '../lib/detail-helpers';
import { setupCardStack, setupSingleCoverAspect } from './card-stack';

let detailAbortController: AbortController | null = null;

function cleanupProjectDetail(): void {
  if (detailAbortController) {
    detailAbortController.abort();
    detailAbortController = null;
  }
}

function initProjectDetail(): void {
  cleanupProjectDetail();

  const titleEl = document.getElementById('project-title');
  const mediaEl = document.getElementById('project-media');
  if (!titleEl && !mediaEl) return;

  detailAbortController = new AbortController();
  const signal = detailAbortController.signal;

  setupDetailBackButton('/#projects');

  const timelineEl = document.getElementById('project-timeline');
  const descEl = document.querySelector<HTMLElement>('.hero-desc-writing');
  const tagsEl = document.getElementById('project-tags');
  const proseElements = document.querySelectorAll<HTMLElement>('.prose > *');

  const titleWords = titleEl ? splitTextToWords(titleEl) : [];
  const descWords = descEl ? splitTextToWords(descEl) : [];
  const allHeroWords = [...titleWords, ...descWords];

  // Progressive enhancement failsafe: ensure elements are visible if timeline is delayed
  const safetyTimer: number | undefined = window.setTimeout(() => {
    if (signal.aborted) return;
    allHeroWords.forEach((w) => {
      w.style.opacity = '1';
      w.style.transform = 'none';
    });
    if (timelineEl) timelineEl.style.opacity = '1';
    if (tagsEl) tagsEl.style.opacity = '1';
    if (mediaEl) mediaEl.style.opacity = '1';
  }, 1000);

  signal.addEventListener('abort', () => clearTimeout(safetyTimer), { once: true });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    clearTimeout(safetyTimer);
    if (timelineEl) timelineEl.style.opacity = '1';
    if (tagsEl) tagsEl.style.opacity = '1';
    if (mediaEl) mediaEl.style.opacity = '1';
    allHeroWords.forEach((w) => {
      w.style.opacity = '1';
      w.style.transform = 'none';
    });
    proseElements.forEach((p) => p.classList.add('optical-focus-in'));
  } else {
    const entranceTimeline = anime.timeline({
      easing: 'easeOutQuart',
      complete: () => {
        if (signal.aborted) return;
        clearTimeout(safetyTimer);

        allHeroWords.forEach((word) => {
          word.style.transition = 'color 0.2s ease, transform 0.2s ease';
        });

        const heroZone = document.getElementById('project-hero-zone');
        if (heroZone && allHeroWords.length > 0 && window.matchMedia('(pointer: fine)').matches) {
          let rafId: number | null = null;
          let lastX = 0;
          let lastY = 0;

          const onMouseMove = (e: MouseEvent) => {
            lastX = e.clientX;
            lastY = e.clientY;
            if (rafId !== null) return;

            rafId = requestAnimationFrame(() => {
              rafId = null;
              if (signal.aborted) return;
              const radius = 90;
              allHeroWords.forEach((word) => {
                const rect = word.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const dist = Math.hypot(lastX - centerX, lastY - centerY);

                if (dist < radius) {
                  const norm = 1 - dist / radius;
                  word.style.transform = `translateY(-${(norm * 3.5).toFixed(1)}px)`;
                  word.style.color = 'var(--color-accent)';
                } else {
                  word.style.transform = 'translateY(0px)';
                  word.style.color = '';
                }
              });
            });
          };

          const onMouseLeave = () => {
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
            allHeroWords.forEach((word) => {
              word.style.transform = 'translateY(0px)';
              word.style.color = '';
            });
          };

          heroZone.addEventListener('mousemove', onMouseMove, { passive: true, signal });
          heroZone.addEventListener('mouseleave', onMouseLeave, { signal });

          signal.addEventListener(
            'abort',
            () => {
              if (rafId !== null) cancelAnimationFrame(rafId);
            },
            { once: true }
          );
        }
      },
    });

    if (timelineEl) {
      entranceTimeline.add(
        {
          targets: timelineEl,
          translateY: [10, 0],
          opacity: [0.3, 1],
          duration: 400,
        },
        0
      );
    }

    if (titleWords.length > 0) {
      entranceTimeline.add(
        {
          targets: titleWords,
          translateY: [12, 0],
          opacity: [0.2, 1],
          duration: 450,
          delay: anime.stagger(15),
        },
        50
      );
    }

    if (descWords.length > 0) {
      entranceTimeline.add(
        {
          targets: descWords,
          translateY: [10, 0],
          opacity: [0.3, 1],
          duration: 400,
          delay: anime.stagger(8),
        },
        150
      );
    }

    if (tagsEl) {
      entranceTimeline.add(
        {
          targets: tagsEl,
          translateY: [8, 0],
          opacity: [0.3, 1],
          duration: 350,
        },
        150
      );
    }

    if (mediaEl) {
      entranceTimeline.add(
        {
          targets: mediaEl,
          translateY: [12, 0],
          opacity: [0.3, 1],
          duration: 450,
        },
        150
      );
    }
    signal.addEventListener(
      'abort',
      () => {
        entranceTimeline.pause();
      },
      { once: true }
    );
  }

  // Optical Fog-to-Focus for Article Prose
  if (proseElements.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.classList.add('optical-focus-in');
            observer.unobserve(target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    proseElements.forEach((el) => {
      el.classList.add('optical-focus-ready');
      observer.observe(el);
    });

    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  }

  const container = document.querySelector('.card-stack-container') as HTMLElement | null;
  if (container) {
    setupCardStack(container, mediaEl, signal);
  } else if (mediaEl) {
    setupSingleCoverAspect(mediaEl, signal);
  }
}

if (document.readyState === 'complete') {
  initProjectDetail();
}
document.addEventListener('astro:page-load', initProjectDetail);
document.addEventListener('astro:before-swap', cleanupProjectDetail);
