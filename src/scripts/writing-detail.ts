import anime from 'animejs';
import { setupDetailBackButton, splitTextToWords } from '../lib/detail-helpers';

let writingAbortController: AbortController | null = null;

function setupCopyButtons(signal: AbortSignal): void {
  document.querySelectorAll<HTMLButtonElement>('.copy-terminal-btn').forEach((btn) => {
    btn.addEventListener(
      'click',
      async () => {
        const card = btn.closest('.terminal-card');
        const codeEl = card?.querySelector('.terminal-body code');
        const label = btn.querySelector('.copy-label');
        if (!codeEl || !label) return;

        try {
          await navigator.clipboard.writeText(codeEl.textContent || '');
          label.textContent = 'Copied!';
          btn.classList.add('text-accent');
          const resetTimer: number | undefined = window.setTimeout(() => {
            label.textContent = 'Copy';
            btn.classList.remove('text-accent');
          }, 2000);
          signal.addEventListener('abort', () => clearTimeout(resetTimer), { once: true });
        } catch (err) {
          console.error('Failed to copy code:', err);
        }
      },
      { signal }
    );
  });
}

function recordReadingHistory(signal?: AbortSignal): void {
  try {
    const slug = window.location.pathname.split('/').filter(Boolean).pop();
    if (!slug) return;
    const key = 'omp_reading_history';
    const history: Record<string, number> = JSON.parse(localStorage.getItem(key) || '{}');
    const priorExitTime = history[slug];

    if (priorExitTime && typeof priorExitTime === 'number') {
      const diffSec = Math.floor((Date.now() - priorExitTime) / 1000);
      let prevRel: string;
      if (diffSec < 60) prevRel = 'just now';
      else if (diffSec < 3600) prevRel = `${Math.floor(diffSec / 60)}m ago`;
      else if (diffSec < 86400) prevRel = `${Math.floor(diffSec / 3600)}h ago`;
      else if (diffSec < 172800) prevRel = 'yesterday';
      else prevRel = `${Math.floor(diffSec / 86400)}d ago`;

      const indicator = document.getElementById('detail-last-read');
      if (indicator) {
        indicator.textContent = `• last read ${prevRel}`;
        indicator.classList.remove('hidden');
      }
    }

    let hasFlushed = false;
    const flushTimestamp = () => {
      if (hasFlushed) return;
      hasFlushed = true;
      try {
        const currentHistory: Record<string, number> = JSON.parse(localStorage.getItem(key) || '{}');
        currentHistory[slug] = Date.now();
        localStorage.setItem(key, JSON.stringify(currentHistory));
      } catch {}
    };

    const returnBtn = document.getElementById('magnetic-area');
    if (returnBtn && signal) {
      returnBtn.addEventListener('click', flushTimestamp, { signal });
    }

    if (signal) {
      signal.addEventListener('abort', flushTimestamp, { once: true });
    }
  } catch {}
}

function cleanupWritingDetail(): void {
  if (writingAbortController) {
    writingAbortController.abort();
    writingAbortController = null;
  }
}

function initWritingDetail(): void {
  cleanupWritingDetail();

  const titleEl = document.getElementById('writing-title');
  if (!titleEl) return;

  writingAbortController = new AbortController();
  const signal = writingAbortController.signal;

  setupDetailBackButton('/#writing');
  setupCopyButtons(signal);
  recordReadingHistory(signal);

  const metaEl = document.getElementById('writing-meta');
  const coverEl = document.getElementById('writing-cover');
  const titleWords = splitTextToWords(titleEl);

  const proseElements = document.querySelectorAll<HTMLElement>(
    'article.prose > p, article.prose > h2, article.prose > h3, article.prose > h4, article.prose > blockquote, article.prose > ul, article.prose > ol'
  );

  const safetyTimer: number | undefined = window.setTimeout(() => {
    if (signal.aborted) return;
    titleWords.forEach((w) => {
      w.style.opacity = '1';
      w.style.transform = 'none';
    });
    if (metaEl) metaEl.style.opacity = '1';
    if (coverEl) coverEl.style.opacity = '1';
  }, 1000);

  signal.addEventListener('abort', () => clearTimeout(safetyTimer), { once: true });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    clearTimeout(safetyTimer);
    if (metaEl) metaEl.style.opacity = '1';
    if (coverEl) coverEl.style.opacity = '1';
    titleWords.forEach((w) => {
      w.style.opacity = '1';
      w.style.transform = 'none';
    });
    proseElements.forEach((p) => p.classList.add('writing-optical-in'));
    return;
  }

  const entranceTimeline = anime.timeline({
    easing: 'easeOutQuart',
    complete: () => {
      if (signal.aborted) return;
      clearTimeout(safetyTimer);

      titleWords.forEach((word) => {
        word.style.transition = 'color 0.2s ease, transform 0.2s ease';
      });

      const heroZone = document.getElementById('writing-hero-zone');
      if (heroZone && titleWords.length > 0 && window.matchMedia('(pointer: fine)').matches) {
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
            titleWords.forEach((word) => {
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
          titleWords.forEach((word) => {
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

  if (metaEl) {
    entranceTimeline.add(
      {
        targets: metaEl,
        translateY: [12, 0],
        opacity: [0, 1],
        duration: 500,
      },
      0
    );
  }

  if (titleWords.length > 0) {
    entranceTimeline.add(
      {
        targets: titleWords,
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 800,
        delay: anime.stagger(22),
      },
      100
    );
  }

  if (coverEl) {
    entranceTimeline.add(
      {
        targets: coverEl,
        translateY: [16, 0],
        opacity: [0, 1],
        duration: 650,
      },
      450
    );
  }

  signal.addEventListener(
    'abort',
    () => {
      entranceTimeline.pause();
    },
    { once: true }
  );

  if (proseElements.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.classList.add('writing-optical-in');
            observer.unobserve(target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );

    proseElements.forEach((el) => {
      el.classList.add('writing-optical-ready');
      observer.observe(el);
    });

    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  }
}

document.addEventListener('astro:page-load', initWritingDetail);
document.addEventListener('astro:before-swap', cleanupWritingDetail);
window.addEventListener('pageshow', () => {
  recordReadingHistory();
});
