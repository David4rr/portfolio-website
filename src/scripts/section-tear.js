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
}, { threshold: 0.02, rootMargin: '0px 0px -40px 0px' });

const initRevealObserver = () => {
  document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
};

document.addEventListener('astro:page-load', initRevealObserver);
if (document.readyState === 'complete') initRevealObserver();
else window.addEventListener('DOMContentLoaded', initRevealObserver);

document.addEventListener('astro:before-swap', () => {
  observer.disconnect();
});

// Dynamic theme toggle (Paper Tear Transition)
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
