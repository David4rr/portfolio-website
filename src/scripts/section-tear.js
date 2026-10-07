// Section reveal observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      el.classList.add('is-revealed-reduced');
    } else {
      el.classList.add('is-revealed');
    }
    
    observer.unobserve(el);
  });
}, { threshold: 0.1 });

document.addEventListener('astro:page-load', () => {
  document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
});

// GPU Parallax Card Stack
let sectionData = [];
let hasSections = false;
let isMobile = false;

const resetSectionStyles = (sections) => {
  sections.forEach(sec => {
    sec.style.clipPath = '';
    sec.style.filter = '';
    sec.style.transform = '';
    sec.style.opacity = '';
    sec.style.pointerEvents = '';
    sec.style.top = '';
  });
};

const updateSectionData = () => {
  isMobile = window.innerWidth < 768;
  const sections = document.querySelectorAll('[data-section]');
  
  if (sections.length === 0) {
    hasSections = false;
    sectionData = [];
    return;
  }

  if (isMobile) {
    hasSections = false;
    sectionData = [];
    resetSectionStyles(sections);
    return;
  }

  hasSections = true;
  let currentTop = 0;
  const wh = window.innerHeight;
  sectionData = Array.from(sections).map(sec => {
    const height = sec.offsetHeight;
    if (height > wh) {
      sec.style.top = `${wh - height}px`;
    } else {
      sec.style.top = '0px';
    }
    const data = {
      el: sec,
      height,
      topOffset: currentTop,
      lastTransform: '',
      lastOpacity: '',
      lastPointerEvents: '',
    };
    currentTop += height;
    return data;
  });
};

const updateTearOff = (e) => {
  if (!hasSections || isMobile || sectionData.length === 0) return;

  const wh = window.innerHeight;
  const scrollY = (e && typeof e.scroll === 'number')
    ? e.scroll
    : (window.lenis && typeof window.lenis.scroll === 'number'
      ? window.lenis.scroll
      : window.scrollY);
  sectionData.forEach((data, i) => {
    const { el: sec, height: h, topOffset } = data;

    const myTop = topOffset - scrollY;
    let ty = 0;
    if (i > 0 && myTop > 0 && myTop <= wh) {
      const pinTarget = h < wh ? wh - h : 0;
      ty = pinTarget - myTop;
    }

    let progress = 0;
    const nextData = sectionData[i + 1];
    if (nextData) {
      const nextTop = nextData.topOffset - scrollY;
      const hNext = nextData.height;
      const maxScroll = Math.max(0, wh - hNext);
      
      if (nextTop <= maxScroll) {
        progress = 1;
      } else if (nextTop < wh) {
        progress = 1 - ((nextTop - maxScroll) / (wh - maxScroll));
      }
    }

    let transform = 'none';
    let opacity = '1';
    let pointerEvents = '';

    if (progress <= 0) {
      transform = ty !== 0 ? `translate3d(0, ${ty.toFixed(2)}px, 0)` : 'none';
      opacity = '1';
      pointerEvents = '';
    } else if (progress >= 1) {
      transform = 'none';
      opacity = '0';
      pointerEvents = 'none';
    } else {
      const liftProgress = Math.pow(progress, 1.35);
      const liftY = (ty - liftProgress * (wh * 0.32)).toFixed(2);
      const scale = (1 - progress * 0.05).toFixed(4);
      opacity = Math.max(0, 1 - Math.pow(Math.min(1, progress * 1.04), 1.25)).toFixed(3);
      transform = `translate3d(0, ${liftY}px, 0) scale(${scale})`;
      pointerEvents = progress > 0.6 ? 'none' : '';
    }

    if (data.lastTransform !== transform) {
      sec.style.transform = transform;
      data.lastTransform = transform;
    }
    if (data.lastOpacity !== opacity) {
      sec.style.opacity = opacity;
      data.lastOpacity = opacity;
    }
    if (data.lastPointerEvents !== pointerEvents) {
      sec.style.pointerEvents = pointerEvents;
      data.lastPointerEvents = pointerEvents;
    }
  });
};

let lenisBound = false;
const attachLenis = () => {
  if (window.lenis && typeof window.lenis.on === 'function' && !lenisBound) {
    window.lenis.on('scroll', updateTearOff);
    lenisBound = true;
  }
};

const onScroll = () => {
  if (!hasSections || isMobile) return;
  if (!lenisBound) {
    attachLenis();
    updateTearOff();
  }
};

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => {
  updateSectionData();
  if (hasSections && !isMobile) {
    updateTearOff();
  }
}, { passive: true });

document.addEventListener('astro:page-load', () => {
  updateSectionData();
  attachLenis();
  if (hasSections && !isMobile) {
    updateTearOff();
  }
});

document.addEventListener('astro:before-swap', () => {
  if (window.lenis && typeof window.lenis.off === 'function' && lenisBound) {
    window.lenis.off('scroll', updateTearOff);
    lenisBound = false;
  }
});
if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    updateSectionData();
    if (hasSections && !isMobile) updateTearOff();
  });
}

window.addEventListener('load', () => {
  updateSectionData();
  if (hasSections && !isMobile) updateTearOff();
}, { once: true });
// Dynamic theme toggle
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#theme-toggle');
  if (!btn) return;
  if (document.documentElement.classList.contains('theme-transitioning')) return;

  const isLight = document.documentElement.classList.contains('light');
  const newTheme = isLight ? 'dark' : 'light';

  const switchTheme = () => {
    document.documentElement.classList.toggle('light');
    localStorage.setItem('theme', newTheme);
  };

  // @ts-ignore
  if (!document.startViewTransition) {
    switchTheme();
    return;
  }

  const rect = btn.getBoundingClientRect();
  const startX = ((rect.left + rect.right) / 2 / window.innerWidth) * 100;
  const numPoints = 25;
  const jitters = [];
  for (let i = 0; i <= numPoints; i++) {
    jitters.push((Math.random() - 0.5) * (Math.random() > 0.7 ? 15 : 6));
  }

  const generatePolygon = (p) => {
    const spread_rate = 200;
    const leftPts = [];
    const rightPts = [];

    for (let i = 0; i <= numPoints; i++) {
      const y = (i / numPoints) * 100;
      const t_passed = y / 300;
      let width = 0;
      if (p > t_passed) {
        width = spread_rate * (p - t_passed);
      }
      const jitter = width > 0 ? jitters[i] : 0;
      const x_left = startX - width + jitter;
      const x_right = startX + width + jitter + 0.1;
      leftPts.push(`${x_left}% ${y}%`);
      rightPts.push(`${x_right}% ${y}%`);
    }

    return `polygon(-20% -20%, 120% -20%, 120% 120%, -20% 120%, -20% -20%, ${leftPts.join(', ')}, ${rightPts.reverse().join(', ')}, -20% -20%)`;
  };

  const numSteps = 20;
  let keyframes = '';
  for (let step = 0; step <= numSteps; step++) {
    const p = step / numSteps;
    keyframes += `${step * (100 / numSteps)}% { clip-path: ${generatePolygon(p)}; }\n`;
  }

  let styleEl = document.getElementById('dynamic-tear-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-tear-style';
    document.head.appendChild(styleEl);
  }
  
  styleEl.innerHTML = `
    .theme-transitioning::view-transition-new(root) { z-index: 1; }
    .theme-transitioning::view-transition-old(root) {
      z-index: 2;
      animation: dynamic-tear 1.5s cubic-bezier(0.25, 1, 0.3, 1) forwards;
      filter: drop-shadow(0 0 15px rgba(0, 0, 0, 0.6));
    }
    @keyframes dynamic-tear { ${keyframes} }
  `;

  document.documentElement.classList.add('theme-transitioning');


  // @ts-ignore
  const transition = document.startViewTransition(switchTheme);
  transition.finished.finally(() => {
    document.documentElement.classList.remove('theme-transitioning');
  });
});
