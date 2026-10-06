// --- 1. IntersectionObserver for internal section reveals ---
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

// --- 2. Pure GPU Parallax Card Stack (Ultra-Lightweight 120 FPS) ---
let ticking = false;

// Cache section heights and offsets to avoid layout thrashing
let sectionData = [];
const updateSectionData = () => {
  const sections = document.querySelectorAll('[data-section]');
  let currentTop = 0;
  sectionData = Array.from(sections).map(sec => {
    const height = sec.offsetHeight;
    const data = { el: sec, height, topOffset: currentTop };
    currentTop += height;
    return data;
  });
};

const updateTearOff = () => {
  if (sectionData.length === 0) updateSectionData();
  
  // Disable on mobile to maintain 100% native smooth touch scrolling
  if (window.innerWidth < 768) {
    sectionData.forEach(({ el: sec }) => {
      sec.style = '';
    });
    return;
  }

  const wh = window.innerHeight;
  const scrollY = window.scrollY;

  sectionData.forEach((data, i) => {
    const { el: sec, height: h, topOffset } = data;
    
    if (h > wh) {
      sec.style.top = `${wh - h}px`;
    } else {
      sec.style.top = '0px';
    }

    // Pinned stacking behind incoming section
    const myTop = topOffset - scrollY;
    let ty = 0;
    if (i > 0 && myTop > 0 && myTop <= wh) {
      const pinTarget = h < wh ? wh - h : 0;
      ty = pinTarget - myTop;
    }

    // Progress of NEXT section overlapping THIS section (0 to 1)
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

    if (progress <= 0) {
      sec.style.clipPath = 'none';
      sec.style.filter = 'none';
      sec.style.transform = ty !== 0 ? `translate3d(0, ${ty}px, 0)` : 'none';
      sec.style.opacity = '1';
      sec.style.pointerEvents = '';
    } else if (progress >= 1) {
      sec.style.opacity = '0';
      sec.style.clipPath = 'none';
      sec.style.filter = 'none';
      sec.style.transform = 'none';
      sec.style.pointerEvents = 'none';
    } else {
      // Pure GPU Composite: subtle folio scale-down + upward parallax drift + smooth dissolve
      const scale = (1 - progress * 0.04).toFixed(4);
      const liftY = (ty - progress * (wh * 0.25)).toFixed(1);
      const opacity = Math.max(0, 1 - Math.pow(progress, 1.25)).toFixed(3);

      sec.style.clipPath = 'none';
      sec.style.filter = 'none';
      sec.style.transform = `translate3d(0, ${liftY}px, 0) scale(${scale})`;
      sec.style.opacity = opacity;
      sec.style.pointerEvents = progress > 0.6 ? 'none' : '';
    }
  });
};

const onScroll = () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateTearOff();
      ticking = false;
    });
    ticking = true;
  }
};

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => {
  sectionData = []; // clear cache to recalculate new layout heights
  requestAnimationFrame(updateTearOff);
}, { passive: true });

// Add ResizeObserver to catch height changes from lazy-loaded images or fonts
let layoutObserver = null;

// trigger on load and on Astro view transition navigation
document.addEventListener('astro:page-load', () => {
  sectionData = []; // clear old DOM nodes from previous page instance
  
  if (layoutObserver) {
    layoutObserver.disconnect();
  }
  
  layoutObserver = new ResizeObserver(() => {
    sectionData = [];
    requestAnimationFrame(updateTearOff);
  });
  
  const mainEl = document.querySelector('main');
  if (mainEl) {
    layoutObserver.observe(mainEl);
  }
  
  updateTearOff();
});

// --- 3. Theme Toggle ---
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
