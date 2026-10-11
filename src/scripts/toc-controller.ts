import anime from 'animejs';

interface LenisInstance {
  scrollTo: (target: number, options?: { duration?: number; onComplete?: () => void }) => void;
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
}

declare global {
  interface Window {
    lenis?: LenisInstance;
  }
}

function toggleVisibilityPair(el: HTMLElement | null, visible: boolean) {
  if (!el) return;
  el.classList.toggle('opacity-100', visible);
  el.classList.toggle('pointer-events-auto', visible);
  el.classList.toggle('opacity-0', !visible);
  el.classList.toggle('pointer-events-none', !visible);
}

function toggleClasses(el: Element | null | undefined, classes: string[], active: boolean) {
  if (!el) return;
  for (const cls of classes) el.classList.toggle(cls, active);
}
function initTocScrollIndicator() {
  let railEntranceAnim: anime.AnimeInstance | null = null;
  let mobileEntranceAnim: anime.AnimeInstance | null = null;
  let isRailVisible = false;
  let isMobileVisible = false;
  let activeIndex = -1;

  const controller = new AbortController();
  const { signal } = controller;

  const inlineContainer = document.getElementById('toc-inline-container');
  const inlineHeader = document.getElementById('toc-inline-header');
  const inlineContent = document.getElementById('toc-inline-content');
  const inlineRows = document.querySelectorAll<HTMLElement>('.toc-inline-row');
  const toggleBtn = document.getElementById('toc-toggle-btn');
  const toggleText = document.getElementById('toc-toggle-text');
  const toggleIcon = document.getElementById('toc-toggle-icon');

  if (toggleBtn && inlineContent && inlineHeader && toggleText && toggleIcon) {
    let isExpanded = true;
    inlineContent.style.height = 'auto';
    toggleBtn.addEventListener('click', () => {
      isExpanded = !isExpanded;
      toggleBtn.setAttribute('aria-expanded', String(isExpanded));
      toggleText.textContent = isExpanded ? 'Collapse' : 'Expand';
      toggleIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
      if (isExpanded) {
        inlineHeader.style.borderBottomColor = '';
        inlineContent.style.display = 'block';
        anime({ targets: inlineContent, height: [0, inlineContent.scrollHeight], opacity: [0, 1], duration: 380, easing: 'easeOutCubic', complete: () => { inlineContent.style.height = 'auto'; } });
        anime({ targets: '.toc-inline-row', translateY: [8, 0], opacity: [0, 1], delay: anime.stagger(20), duration: 300, easing: 'easeOutQuad' });
      } else {
        anime({
          targets: inlineContent,
          height: [inlineContent.offsetHeight, 0],
          opacity: [1, 0],
          duration: 300,
          easing: 'easeInOutCubic',
          complete: () => {
            inlineContent.style.display = 'none';
            inlineHeader.style.borderBottomColor = 'transparent';
          },
        });
      }
    }, { signal });
  }

  const rail = document.getElementById('toc-floating-rail');
  const indicator = document.getElementById('toc-rail-indicator');
  const progressText = document.getElementById('toc-rail-progress');
  const railNodes = document.querySelectorAll<HTMLElement>('.toc-rail-node');
  const mobileContainer = document.getElementById('toc-mobile-container');
  const mobileScrim = document.getElementById('toc-mobile-scrim');
  const mobileHeader = document.getElementById('toc-mobile-header');
  const mobilePillBtn = document.getElementById('toc-mobile-pill-btn');
  const mobileExpandedHeader = document.getElementById('toc-mobile-expanded-header');
  const mobileCloseBtn = document.getElementById('toc-mobile-close-btn');
  const mobileBody = document.getElementById('toc-mobile-body');
  const mobileActiveNum = document.getElementById('toc-mobile-active-num');
  const mobileActiveTitle = document.getElementById('toc-mobile-active-title');
  const mobileLinks = document.querySelectorAll<HTMLElement>('.toc-mobile-link');
  const headings = Array.from(document.querySelectorAll<HTMLElement>('article h2, article h3, article h4')).filter((h) => h.id);
  if (!headings.length) return;

  let isMobileOpen = false;
  const setMobileTocOpen = (open: boolean) => {
    if (isMobileOpen === open || !mobileContainer) return;
    isMobileOpen = open;
    mobileScrim?.classList.toggle('pointer-events-none', !open);
    mobileScrim?.classList.toggle('opacity-100', open);

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

    mobileContainer.style.width = open ? (window.innerWidth >= 640 ? '380px' : 'calc(100vw - 2rem)') : '210px';
    mobileContainer.style.maxWidth = '380px';
    mobileContainer.style.height = open ? `${Math.min(window.innerHeight * 0.58, 420)}px` : '44px';
    mobileContainer.style.borderRadius = open ? '16px' : '9999px';
    if (mobileHeader) mobileHeader.style.borderBottomColor = open ? 'rgba(255, 255, 255, 0.08)' : 'transparent';
    mobilePillBtn?.classList.toggle('opacity-0', open);
    mobilePillBtn?.classList.toggle('pointer-events-none', open);
    mobilePillBtn?.setAttribute('aria-expanded', String(open));
    toggleVisibilityPair(mobileExpandedHeader, open);
    if (open) setTimeout(() => toggleVisibilityPair(mobileBody, true), 80);
    else toggleVisibilityPair(mobileBody, false);
  };
  mobilePillBtn?.addEventListener('click', () => setMobileTocOpen(true), { signal });
  mobileCloseBtn?.addEventListener('click', (e) => { e.stopPropagation(); setMobileTocOpen(false); }, { signal });
  mobileScrim?.addEventListener('click', () => setMobileTocOpen(false), { signal });
  document.addEventListener('click', (e: MouseEvent) => {
    if (!isMobileOpen || !mobileContainer) return;
    const target = e.target as Node;
    if (!mobileContainer.contains(target) && !mobileScrim?.contains(target)) setMobileTocOpen(false);
  }, { signal });
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isMobileOpen) setMobileTocOpen(false);
  }, { signal });

  const updateActiveIndicator = (newIndex: number) => {
    if (newIndex === activeIndex || newIndex < 0 || newIndex >= headings.length) return;
    activeIndex = newIndex;

    inlineRows.forEach((row, idx) => {
      const numSpan = row.querySelector('.toc-inline-num');
      const active = idx === newIndex;
      row.classList.toggle('is-active', active);
      toggleClasses(numSpan, ['text-accent', 'font-bold'], active);
      numSpan?.classList.toggle('text-accent/80', !active);
      toggleClasses(row.querySelector('.toc-inline-title'), ['text-text-main', 'font-medium'], active);
    });

    railNodes.forEach((node, idx) => {
      const numSpan = node.querySelector<HTMLElement>('.toc-rail-num');
      const titleSpan = node.querySelector<HTMLElement>('.toc-rail-title');
      const active = idx === newIndex;
      node.classList.toggle('is-active', active);
      toggleClasses(numSpan, ['text-accent', 'font-semibold', 'translate-x-1'], active);
      numSpan?.classList.toggle('text-text-muted/60', !active);
      toggleClasses(titleSpan, ['text-text-main', 'font-serif', 'italic', 'opacity-100'], active);
      titleSpan?.classList.toggle('opacity-70', !active);
      if (active) titleSpan?.classList.remove('text-accent');
    });

    if (indicator && railNodes[newIndex]) {
      indicator.style.top = `${railNodes[newIndex].offsetTop}px`;
      indicator.style.height = `${railNodes[newIndex].offsetHeight}px`;
    }

    if (headings[newIndex]) {
      if (mobileActiveNum) mobileActiveNum.textContent = String(newIndex + 1).padStart(2, '0');
      if (mobileActiveTitle) mobileActiveTitle.textContent = headings[newIndex].textContent?.trim() || '';
    }

    mobileLinks.forEach((link, idx) => {
      const active = idx === newIndex;
      toggleClasses(link, ['bg-accent/10', 'text-text-main', 'font-medium'], active);
      toggleClasses(link.querySelector('.toc-mobile-item-num'), ['text-accent', 'font-bold'], active);
      toggleClasses(link.querySelector('.toc-mobile-item-text'), ['text-text-main', 'font-serif', 'italic'], active);
    });
  };

  const findHeadingIndexForElement = (el: HTMLElement): number => {
    const directIdx = headings.indexOf(el);
    if (directIdx !== -1) return directIdx;
    let candidateIdx = -1;
    for (let i = 0; i < headings.length; i++) {
      if (el.compareDocumentPosition(headings[i]) & Node.DOCUMENT_POSITION_PRECEDING) candidateIdx = i;
    }
    if (candidateIdx !== -1) return candidateIdx;
    return el.compareDocumentPosition(headings[0]) & Node.DOCUMENT_POSITION_FOLLOWING ? 0 : headings.length - 1;
  };

  let isClickScrolling = false;
  let clickScrollTimer: number | undefined;

  const stopClickLock = () => {
    isClickScrolling = false;
    clearTimeout(clickScrollTimer);
  };
  window.addEventListener('wheel', stopClickLock, { passive: true, signal });
  window.addEventListener('touchmove', stopClickLock, { passive: true, signal });

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#' || !href.startsWith('#')) return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;

      e.preventDefault();
      setMobileTocOpen(false);

      const targetIdx = findHeadingIndexForElement(target);
      updateActiveIndicator(targetIdx);
      isClickScrolling = true;
      clearTimeout(clickScrollTimer);

      const targetRect = target.getBoundingClientRect();
      const clampedOffset = Math.max(0, window.scrollY + targetRect.top - window.innerHeight / 2 + targetRect.height / 2);
      const onScrollEnd = () => {
        updateActiveIndicator(targetIdx);
        clickScrollTimer = window.setTimeout(() => { isClickScrolling = false; }, 150);
      };

      if (window.lenis) {
        window.lenis.scrollTo(clampedOffset, { duration: 1.2, onComplete: onScrollEnd });
      } else {
        window.scrollTo({ top: clampedOffset, behavior: 'smooth' });
        onScrollEnd();
      }

      clickScrollTimer = window.setTimeout(() => { isClickScrolling = false; }, 1350);
      target.classList.remove('anchor-highlight');
      void target.offsetWidth;
      target.classList.add('anchor-highlight');
      setTimeout(() => target.classList.remove('anchor-highlight'), 2200);
      history.pushState(null, '', href);
    }, { signal });
  });

  const animateFloatingToc = (el: HTMLElement, visible: boolean, prevAnim: anime.AnimeInstance | null, withY: boolean) => {
    el.classList.toggle('pointer-events-none', !visible);
    prevAnim?.pause();
    return anime({
      targets: el,
      opacity: visible ? [0, 1] : [1, 0],
      ...(withY ? { translateY: visible ? [12, 0] : [0, 12] } : {}),
      duration: visible ? 400 : 300,
      easing: visible ? 'easeOutCubic' : 'easeInQuad',
    });
  };

  const onScroll = () => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const triggerThreshold = inlineContainer ? inlineContainer.offsetTop + inlineContainer.offsetHeight : 350;
    const pastThreshold = scrollY > triggerThreshold;

    if (rail && pastThreshold !== isRailVisible) {
      isRailVisible = pastThreshold;
      railEntranceAnim = animateFloatingToc(rail, pastThreshold, railEntranceAnim, false);
    }
    if (mobileContainer && pastThreshold !== isMobileVisible) {
      isMobileVisible = pastThreshold;
      if (!pastThreshold) setMobileTocOpen(false);
      mobileEntranceAnim = animateFloatingToc(mobileContainer, pastThreshold, mobileEntranceAnim, true);
    }
    if (progressText && docHeight > 0) {
      progressText.textContent = `${Math.min(100, Math.max(0, Math.round((scrollY / docHeight) * 100)))}%`;
    }
    if (isClickScrolling) return;

    const activationLine = window.innerHeight * 0.55;
    let currentIdx = 0;
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= activationLine) currentIdx = i;
      else break;
    }

    if (docHeight > 0 && scrollY >= docHeight - 40) {
      const lastHeading = headings[headings.length - 1];
      if (lastHeading && lastHeading.getBoundingClientRect().top <= window.innerHeight * 0.85) {
        currentIdx = headings.length - 1;
      }
    }
    updateActiveIndicator(currentIdx);
  };

  window.addEventListener('scroll', onScroll, { passive: true, signal });
  window.addEventListener('resize', onScroll, { passive: true, signal });
  window.lenis?.on('scroll', onScroll);
  onScroll();

  document.addEventListener('astro:before-swap', () => {
    controller.abort();
    window.lenis?.off('scroll', onScroll);
    railEntranceAnim?.pause();
    mobileEntranceAnim?.pause();
  }, { once: true });
}

document.addEventListener('astro:page-load', initTocScrollIndicator);
