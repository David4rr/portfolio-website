import anime from 'animejs';

export function optimizeImageUrl(url?: string, width = 1200): string {
  if (!url) return '';
  if (url.includes('googleusercontent.com') || url.includes('blogger.com')) {
    if (/\/(s\d+|w\d+|s\d+-c)\//.test(url)) {
      return url.replace(/\/(s\d+|w\d+|s\d+-c)\//, `/w${width}-rw/`);
    }
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp`;
  }
  if (url.startsWith('http')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp`;
  }
  return url;
}

export function resolveReturnLink(
  searchParams: URLSearchParams,
  defaultHref: '/#projects' | '/#writing'
): { returnHref: string; returnLabel: string } {
  const fromExplore = searchParams.get('from') === 'explore';
  const origin = searchParams.get('origin');
  const returnHref = fromExplore
    ? origin === 'writing'
      ? '/explore?from=writing'
      : '/explore'
    : defaultHref;
  const returnLabel = fromExplore ? 'Return to Gallery' : 'Return';
  return { returnHref, returnLabel };
}

export function setupDetailBackButton(defaultHref: '/#projects' | '/#writing'): void {
  const params = new URLSearchParams(window.location.search);
  const fromParam = params.get('from');
  let originParam = params.get('origin');

  const historyState = window.history.state || {};
  let isFromExplore = false;

  if (fromParam === 'explore') {
    isFromExplore = true;
    try {
      sessionStorage.setItem('explore_item', window.location.pathname);
      if (originParam) {
        sessionStorage.setItem('explore_origin', originParam);
      } else {
        sessionStorage.removeItem('explore_origin');
      }
    } catch {}
  } else if (
    historyState.fromExplore === true ||
    (typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem('explore_item') === window.location.pathname)
  ) {
    isFromExplore = true;
    if (!originParam && historyState.exploreOrigin) {
      originParam = historyState.exploreOrigin;
    } else if (!originParam) {
      try {
        originParam = sessionStorage.getItem('explore_origin');
      } catch {}
    }
  } else {
    try {
      sessionStorage.removeItem('explore_item');
      sessionStorage.removeItem('explore_origin');
      sessionStorage.removeItem('nav_from');
    } catch {}
  }

  const btn = document.getElementById('magnetic-area') as HTMLAnchorElement | null;
  const text = document.getElementById('back-text');
  if (btn && text) {
    if (isFromExplore) {
      btn.href = originParam === 'writing' ? '/explore?from=writing' : '/explore';
      btn.setAttribute('data-astro-reload', '');
      text.innerText = 'Return to Gallery';
    } else {
      btn.href = defaultHref;
      btn.removeAttribute('data-astro-reload');
      text.innerText = 'Return';
    }
  }

  if (fromParam || params.has('origin')) {
    try {
      window.history.replaceState(
        { ...historyState, fromExplore: isFromExplore, exploreOrigin: originParam },
        '',
        window.location.pathname
      );
    } catch {}
  }

  if (window.matchMedia('(hover: none)').matches || window.innerWidth < 768) {
    return;
  }

  const magneticArea = document.getElementById('magnetic-area');
  const returnBtn = document.getElementById('back-button');
  const leftLine = document.querySelector('.return-line-left');
  const rightLine = document.querySelector('.return-line-right');

  if (magneticArea && returnBtn && leftLine && rightLine) {
    let idleAnim = anime({
      targets: [leftLine, rightLine],
      width: ['12px', '28px'],
      duration: 1800,
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
    });

    magneticArea.addEventListener('mousemove', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      const rect = magneticArea.getBoundingClientRect();
      const x = mouseEvent.clientX - rect.left - rect.width / 2;
      const y = mouseEvent.clientY - rect.top - rect.height / 2;

      anime({
        targets: returnBtn,
        translateX: x * 0.4,
        translateY: y * 0.4,
        duration: 0,
        easing: 'linear',
      });
    });

    magneticArea.addEventListener('mouseenter', () => {
      idleAnim.pause();

      anime({
        targets: leftLine,
        width: '40px',
        translateX: -6,
        duration: 600,
        easing: 'easeOutElastic(1, .5)',
      });

      anime({
        targets: rightLine,
        width: '40px',
        translateX: 6,
        duration: 600,
        easing: 'easeOutElastic(1, .5)',
      });

      anime({
        targets: returnBtn,
        letterSpacing: '0.5em',
        duration: 400,
        easing: 'easeOutExpo',
      });
    });

    magneticArea.addEventListener('mouseleave', () => {
      anime({
        targets: returnBtn,
        translateX: 0,
        translateY: 0,
        letterSpacing: '0.3em',
        duration: 800,
        easing: 'easeOutElastic(1, .5)',
      });

      anime({
        targets: [leftLine, rightLine],
        width: '12px',
        translateX: 0,
        duration: 400,
        easing: 'easeOutQuad',
        complete: () => {
          idleAnim = anime({
            targets: [leftLine, rightLine],
            width: ['12px', '28px'],
            duration: 1800,
            direction: 'alternate',
            loop: true,
            easing: 'easeInOutSine',
          });
        },
      });
    });
  }
}

export function formatPoetryTitle(title: string): string {
  const words = title.split(' ');
  if (words.length > 1) {
    const last = words.pop();
    return `${words.join(' ')} <span class="italic font-light pr-1">${last}</span>`;
  }

  const camelMatch = title.match(/^([A-Z]?[a-z]+)([A-Z][a-z]+)$/);
  if (camelMatch) {
    return `${camelMatch[1]}<span class="italic font-light pr-1">${camelMatch[2]}</span>`;
  }

  if (title.toLowerCase() === 'budgetmify') {
    return `Budget<span class="italic font-light pr-1">${'mify'}</span>`;
  }

  const mid = Math.ceil(title.length / 2);
  return `${title.slice(0, mid)}<span class="italic font-light pr-1">${title.slice(mid)}</span>`;
}

export function isMobileProject(project?: { type?: string; techStack?: string[] }): boolean {
  if (!project) return false;
  const typeStr = (project.type || '').toLowerCase();
  const techStr = (project.techStack || []).join(' ').toLowerCase();

  if (/\b(mobile|ios|android|phone|smartphone)\b/i.test(typeStr)) return true;

  const hasMobileTech = /\b(react\s*native|flutter|swiftui|swift|kotlin|expo|capacitor|ionic)\b/i.test(techStr);
  const isExplicitWeb = /\b(website|web\s*app|web)\b/i.test(typeStr) && !/\bmobile\b/i.test(typeStr);

  return hasMobileTech && !isExplicitWeb;
}
