import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Global animations
const initAnimations = () => {
  let mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    
    if (document.querySelector('.hero-anim')) {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
      tl.fromTo('.hero-anim', 
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.2 }
      );
    }

    if (document.querySelectorAll('.scroll-reveal').length > 0) {
      ScrollTrigger.batch('.scroll-reveal', {
        start: 'top 85%',
        onEnter: (elements) => {
          gsap.fromTo(elements, 
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power2.out', overwrite: true }
          );
        }
      });
    }
  });
};

// Theme toggle via Event Delegation (View Transitions API with randomized edges)
document.addEventListener('click', (e) => {
  const btn = (e.target as Element).closest('#theme-toggle');
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

  // Calculate starting X based on button position
  const rect = btn.getBoundingClientRect();
  const startX = ((rect.left + rect.right) / 2 / window.innerWidth) * 100;

  // Generate dynamic CSS keyframes for the jet-split tear
  const numPoints = 25;
  const jitters: number[] = [];
  for (let i = 0; i <= numPoints; i++) {
    // Generate static jitters so the edge retains its unique shape as it spreads
    jitters.push((Math.random() - 0.5) * (Math.random() > 0.7 ? 15 : 6));
  }

  const generatePolygon = (p: number) => {
    const spread_rate = 200; // How fast the cloud spreads
    const leftPts = [];
    const rightPts = [];

    for (let i = 0; i <= numPoints; i++) {
      const y = (i / numPoints) * 100;
      const t_passed = y / 300; // Jet travels 0 to 300%
      
      let width = 0;
      if (p > t_passed) {
        width = spread_rate * (p - t_passed);
      }
      const jitter = width > 0 ? jitters[i] : 0;
      
      const x_left = startX - width + jitter;
      const x_right = startX + width + jitter + 0.1; // +0.1 prevents clipping bugs at p=0
      
      leftPts.push(`${x_left}% ${y}%`);
      rightPts.push(`${x_right}% ${y}%`);
    }

    // Polygon with a hole for the old view to tear apart
    // Cuts in from top-left boundary down to the tear, traces down the left edge, up the right edge, and backs out.
    return `polygon(
      -20% -20%, 
      120% -20%, 
      120% 120%, 
      -20% 120%, 
      -20% -20%, 
      ${leftPts.join(', ')}, 
      ${rightPts.reverse().join(', ')}, 
      -20% -20%
    )`;
  };

  const numSteps = 20; // 5% increments
  let keyframes = '';
  for (let step = 0; step <= numSteps; step++) {
    const p = step / numSteps;
    keyframes += `${step * (100 / numSteps)}% { clip-path: ${generatePolygon(p)}; }\n`;
  }

  // Inject or update the dynamic stylesheet
  let styleEl = document.getElementById('dynamic-tear-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-tear-style';
    document.head.appendChild(styleEl);
  }
  
  styleEl.innerHTML = `
    .theme-transitioning::view-transition-new(root) {
      z-index: 1;
    }
    .theme-transitioning::view-transition-old(root) {
      z-index: 2;
      animation: dynamic-tear 1.5s cubic-bezier(0.25, 1, 0.3, 1) forwards;
      filter: drop-shadow(0 0 15px rgba(0, 0, 0, 0.6));
    }
    @keyframes dynamic-tear {
      ${keyframes}
    }
  `;

  document.documentElement.classList.add('theme-transitioning');
  // @ts-ignore
  const transition = document.startViewTransition(switchTheme);
  transition.finished.finally(() => {
    document.documentElement.classList.remove('theme-transitioning');
  });
});

// Initialize on load and on astro page swap
document.addEventListener('astro:page-load', () => {
  initAnimations();
});
