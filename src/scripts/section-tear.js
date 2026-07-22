import anime from 'animejs';

// --- 1. IntersectionObserver for internal section reveals ---
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const type = el.dataset.reveal;
    
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      el.querySelectorAll('[data-animate], [data-word], [data-card]').forEach(e => {
        if(e) e.style.opacity = '1';
      });
      observer.unobserve(el);
      return;
    }
    
    if (type === 'ink-bloom') {
      const target = el.querySelector('[data-animate]');
      if (target) {
        const obj = { p: 0 };
        anime({
          targets: obj,
          p: [0, 140],
          duration: 1200,
          easing: 'easeOutExpo',
          update: () => {
            target.style.clipPath = `circle(${obj.p}% at 50% 50%)`;
          }
        });
        anime({
          targets: target,
          opacity: [0, 1],
          duration: 1200,
          easing: 'easeOutExpo',
        });
      }
    } else if (type === 'word-cascade') {
      const items = el.querySelectorAll('[data-word], [data-card]');
      if (items.length > 0) {
        anime({
          targets: items,
          opacity: [0, 1],
          translateY: [12, 0],
          delay: anime.stagger(60),
          duration: 800,
          easing: 'easeOutQuart'
        });
      }
    } else if (type === 'letter-unfold') {
      const target = el.querySelector('[data-animate]');
      if (target) {
        anime({
          targets: target,
          scaleY: [0, 1],
          opacity: [0, 1],
          duration: 1000,
          easing: 'easeOutQuint',
        });
      }
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
  const numPoints = 60; 
  for (let i = 0; i <= numPoints; i++) {
    const isDeep = Math.random() > 0.8;
    const depth = isDeep ? (Math.random() * 80 + 30) : (Math.random() * 15);
    points.push(depth);
  }
  return points;
});

const updateTearOff = () => {
  const sections = document.querySelectorAll('[data-section]');
  const wh = window.innerHeight;

  // 1. Temporarily remove transforms to get perfect native sticky positions
  // This completely eliminates bounding-box distortions caused by 3D rotateX!
  const oldTransforms = [];
  sections.forEach(sec => {
    oldTransforms.push(sec.style.transform);
    sec.style.transform = 'none';
  });

  const trueTops = Array.from(sections).map(sec => sec.getBoundingClientRect().top);

  sections.forEach((sec, i) => {
    // Restore transform immediately before we calculate the new one
    sec.style.transform = oldTransforms[i];

    // 2. Set dynamic sticky top for tall sections
    const h = sec.offsetHeight;
    if (h > wh) {
      sec.style.top = `${wh - h}px`;
    } else {
      sec.style.top = '0px';
    }

    // 3. Determine Pinning (Make next section stack statically behind instead of sliding up)
    let ty = 0;
    const myTop = trueTops[i]; // This is now exactly the native sticky position
    if (i > 0 && myTop > 0 && myTop <= wh) {
      ty = -myTop;
    }

    // 4. Calculate progress of NEXT section tearing THIS section
    let progress = 0;
    const nextTop = trueTops[i + 1];
    if (nextTop !== undefined) {
      if (nextTop < wh && nextTop > 0) {
        progress = 1 - (nextTop / wh);
      } else if (nextTop <= 0) {
        progress = 1;
      }
    }

    // 5. Apply tear & fall logic
    if (progress === 0) {
      sec.style.clipPath = 'none';
      sec.style.transform = ty !== 0 ? `translateY(${ty}px)` : 'none';
      sec.style.opacity = '1';
      sec.style.filter = 'none';
    } else if (progress === 1) {
      // Fully torn away
      sec.style.opacity = '0';
      sec.style.clipPath = 'none';
      sec.style.transform = 'none';
      sec.style.filter = 'none';
    } else {
      // Tearing in progress
      const topOffset = parseFloat(sec.style.top) || 0;
      const visibleStart = (-topOffset / h) * 100;
      const visibleEnd = ((-topOffset + wh) / h) * 100;

      // Sweep the tear line across the currently visible portion synchronously
      const tearY = visibleStart + progress * (visibleEnd - visibleStart) - 5;
      
      let rotateZ = 0;
      let rotateX = 0;
      let opacity = 1;

      // Start falling earlier so the paper drops completely off screen
      if (progress > 0.15) {
        const fall = (progress - 0.15) / 0.85; // 0 -> 1
        
        // Massive downward acceleration so it clears the viewport
        ty += Math.pow(fall, 1.2) * (wh * 1.8); 
        rotateZ = (i % 2 === 0 ? -1 : 1) * fall * 5; 
        rotateX = fall * -70; // Tilt heavily away
        
        if (fall > 0.8) {
          opacity = 1 - ((fall - 0.8) * 5); // Smooth fade at the very bottom
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
      // Hinge the 3D rotation exactly at the tear line for realistic peeling
      sec.style.transformOrigin = `50% ${tearY}%`;
      sec.style.transform = `perspective(1200px) translateY(${ty}px) rotateZ(${rotateZ}deg) rotateX(${rotateX}deg)`;
      sec.style.opacity = opacity.toString();
      
      if (progress > 0.15) {
        sec.style.filter = 'none';
      } else {
        sec.style.filter = `drop-shadow(0 -5px 15px rgba(0,0,0,0.3))`;
      }

      
      sec.dataset.ty = ty;
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
window.addEventListener('resize', () => requestAnimationFrame(updateTearOff), { passive: true });
// trigger once on load to set initial state
document.addEventListener('astro:page-load', () => {
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
