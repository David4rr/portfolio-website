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

// --- 2. Calendar Tear-Off scroll listener ---
let ticking = false;

// Pre-generate jagged edge patterns for a natural paper tear look
const jaggedPatterns = Array.from({ length: 10 }, () => {
  const points = [];
  const numPoints = 25; // Reduced from 60 to 25 for better performance
  for (let i = 0; i <= numPoints; i++) {
    const isDeep = Math.random() > 0.8;
    const depth = isDeep ? (Math.random() * 80 + 30) : (Math.random() * 15);
    points.push(depth);
  }
  return points;
});

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
  
  // Disable tear-off effect on mobile to prevent glitchy scrolling and resizing
  if (window.innerWidth < 768) {
    sectionData.forEach(({ el: sec }) => {
      sec.style = ''; // Reset all JS-applied inline styles
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

    // 3. Determine Pinning (Make next section stack statically behind instead of sliding up)
    const myTop = topOffset - scrollY;
    let ty = 0;
    if (i > 0 && myTop > 0 && myTop <= wh) {
      // Pin tall sections to the top (0), short sections to the bottom (wh - h)
      const pinTarget = h < wh ? wh - h : 0;
      ty = pinTarget - myTop;
    }

    // 4. Calculate progress of NEXT section tearing THIS section
    let progress = 0;
    const nextData = sectionData[i + 1];
    if (nextData) {
      const nextTop = nextData.topOffset - scrollY;
      const hNext = nextData.height;
      const maxScroll = Math.max(0, wh - hNext); // The minimum nextTop can reach natively
      
      if (nextTop <= maxScroll) {
        progress = 1;
      } else if (nextTop < wh) {
        // Map nextTop from `wh` (progress=0) down to `maxScroll` (progress=1)
        progress = 1 - ((nextTop - maxScroll) / (wh - maxScroll));
      }
    }

    if (progress === 0) {
      sec.style.clipPath = 'none';
      sec.style.transform = ty !== 0 ? `translateY(${ty}px)` : 'none';
      sec.style.opacity = '1';
      sec.style.filter = 'none';
      sec.style.pointerEvents = '';
    } else if (progress === 1) {
      sec.style.opacity = '0';
      sec.style.clipPath = 'none';
      sec.style.transform = 'none';
      sec.style.filter = 'none';
      sec.style.pointerEvents = 'none';
    } else {
      const topStickyOffset = parseFloat(sec.style.top) || 0;
      const visibleStart = (-topStickyOffset / h) * 100;
      const visibleEnd = ((-topStickyOffset + wh) / h) * 100;

      const tearY = visibleStart + progress * (visibleEnd - visibleStart) - 5;
      
      let rotateZ = 0;
      let rotateX = 0;
      let opacity = 1;

      if (progress > 0.15) {
        const fall = (progress - 0.15) / 0.85; 
        
        ty += Math.pow(fall, 1.5) * (wh * 1.8); 
        rotateZ = (i % 2 === 0 ? -1 : 1) * fall * 5; 
        rotateX = fall * -15; // Max 15 degree flip instead of 70
        
        if (fall > 0.8) {
          opacity = 1 - ((fall - 0.8) * 5); 
        }
      }

      const pattern = jaggedPatterns[i % jaggedPatterns.length];
      const points = [];
      const numPoints = pattern.length - 1;
      for (let j = 0; j <= numPoints; j++) {
        const x = (j / numPoints) * 100;
        const depthPx = pattern[j];
        const depthPct = (depthPx / h) * 100;
        points.push(`${x}% ${tearY - depthPct}%`);
      }
      
      sec.style.clipPath = `polygon(${points.join(', ')}, 100% 100%, 0% 100%)`;
      sec.style.transformOrigin = `50% ${tearY}%`;
      sec.style.transform = `perspective(1200px) translateY(${ty}px) rotateZ(${rotateZ}deg) rotateX(${rotateX}deg)`;
      sec.style.opacity = opacity.toString();
      
      if (progress > 0.15) {
        sec.style.filter = 'none';
      } else {
        sec.style.filter = `drop-shadow(0 -5px 15px rgba(0,0,0,0.3))`;
      }
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

  const navEl = document.getElementById('main-nav');
  if (navEl) {
    navEl.classList.remove('bg-bg/90', 'backdrop-blur-md');
    navEl.classList.add('bg-bg');
  }

  // @ts-ignore
  const transition = document.startViewTransition(switchTheme);
  transition.finished.finally(() => {
    document.documentElement.classList.remove('theme-transitioning');
    if (navEl) {
      navEl.classList.add('bg-bg/90', 'backdrop-blur-md');
      navEl.classList.remove('bg-bg');
    }
  });
});
