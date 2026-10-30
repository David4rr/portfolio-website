export interface MobileTocController {
  setOpen: (open: boolean) => void;
  updateActive: (index: number, title?: string) => void;
}

function toggleVisibilityPair(el: HTMLElement | null, visible: boolean) {
  if (!el) return;
  el.classList.toggle('opacity-100', visible);
  el.classList.toggle('pointer-events-auto', visible);
  el.classList.toggle('opacity-0', !visible);
  el.classList.toggle('pointer-events-none', !visible);
}

export function initMobileToc(signal: AbortSignal): MobileTocController | null {
  const container = document.getElementById('toc-mobile-container');
  if (!container) return null;

  const scrim = document.getElementById('toc-mobile-scrim');
  const header = document.getElementById('toc-mobile-header');
  const pillBtn = document.getElementById('toc-mobile-pill-btn');
  const expandedHeader = document.getElementById('toc-mobile-expanded-header');
  const closeBtn = document.getElementById('toc-mobile-close-btn');
  const body = document.getElementById('toc-mobile-body');
  const activeNum = document.getElementById('toc-mobile-active-num');
  const activeTitle = document.getElementById('toc-mobile-active-title');
  const links = document.querySelectorAll<HTMLElement>('.toc-mobile-link');

  let isOpen = false;

  const setOpen = (open: boolean) => {
    if (isOpen === open) return;
    isOpen = open;
    scrim?.classList.toggle('pointer-events-none', !open);
    scrim?.classList.toggle('opacity-100', open);

    const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
    if (scrollToTopBtn) {
      const showBtn = !open && window.scrollY > 300;
      if (open) scrollToTopBtn.dataset.suppressed = 'true';
      else delete scrollToTopBtn.dataset.suppressed;
      scrollToTopBtn.style.transition = 'opacity 200ms ease, transform 200ms ease';
      scrollToTopBtn.style.opacity = showBtn ? '1' : '0';
      scrollToTopBtn.style.pointerEvents = showBtn ? 'auto' : 'none';
      scrollToTopBtn.style.transform = open ? 'translateY(16px) scale(0.85)' : showBtn ? 'translateY(0px) scale(1)' : 'translateY(16px) scale(1)';
      if (!open) setTimeout(() => { scrollToTopBtn.style.transition = ''; }, 250);
    }

    container.style.width = open ? (window.innerWidth >= 640 ? '380px' : 'calc(100vw - 2rem)') : '210px';
    container.style.maxWidth = '380px';
    container.style.height = open ? `${Math.min(window.innerHeight * 0.58, 420)}px` : '44px';
    container.style.borderRadius = open ? '16px' : '9999px';
    if (header) header.style.borderBottomColor = open ? 'rgba(255, 255, 255, 0.08)' : 'transparent';
    pillBtn?.classList.toggle('opacity-0', open);
    pillBtn?.classList.toggle('pointer-events-none', open);
    pillBtn?.setAttribute('aria-expanded', String(open));
    toggleVisibilityPair(expandedHeader, open);
    if (open) setTimeout(() => toggleVisibilityPair(body, true), 80);
    else toggleVisibilityPair(body, false);
  };

  pillBtn?.addEventListener('click', () => setOpen(true), { signal });
  closeBtn?.addEventListener('click', (e) => { e.stopPropagation(); setOpen(false); }, { signal });
  scrim?.addEventListener('click', () => setOpen(false), { signal });
  document.addEventListener('click', (e: MouseEvent) => {
    if (!isOpen) return;
    const target = e.target as Node;
    if (!container.contains(target) && !scrim?.contains(target)) setOpen(false);
  }, { signal });
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) setOpen(false);
  }, { signal });

  const updateActive = (index: number, title?: string) => {
    if (activeNum) activeNum.textContent = String(index + 1).padStart(2, '0');
    if (activeTitle && title) activeTitle.textContent = title;

    links.forEach((link, idx) => {
      const active = idx === index;
      link.classList.toggle('bg-accent/10', active);
      link.classList.toggle('text-text-main', active);
      link.classList.toggle('font-medium', active);

      const numSpan = link.querySelector('.toc-mobile-item-num');
      numSpan?.classList.toggle('text-accent', active);
      numSpan?.classList.toggle('font-bold', active);

      const textSpan = link.querySelector('.toc-mobile-item-text');
      textSpan?.classList.toggle('text-text-main', active);
      textSpan?.classList.toggle('font-serif', active);
      textSpan?.classList.toggle('italic', active);
    });

    if (isOpen && links[index]) {
      links[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  return { setOpen, updateActive };
}
