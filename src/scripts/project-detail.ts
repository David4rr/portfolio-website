import anime from 'animejs';
import { setupDetailBackButton } from '../lib/detail-helpers';

function splitTextToWords(el: HTMLElement): HTMLElement[] {
  if (el.dataset.splitWords) {
    return Array.from(el.querySelectorAll<HTMLElement>('.kinetic-word'));
  }
  el.dataset.splitWords = 'true';

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  const textNodes: Node[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && node.nodeValue.trim() !== '') {
      textNodes.push(node);
    }
  }

  const collectedWordEls: HTMLElement[] = [];

  textNodes.forEach((textNode) => {
    const rawVal = textNode.nodeValue || '';
    const fragment = document.createDocumentFragment();
    const tokens = rawVal.split(/(\s+)/);

    tokens.forEach((token) => {
      if (token.trim() === '') {
        fragment.appendChild(document.createTextNode(token));
      } else {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'kinetic-word inline-block will-change-transform';
        wordSpan.textContent = token;
        wordSpan.style.opacity = '0';
        wordSpan.style.transform = 'translateY(18px)';

        fragment.appendChild(wordSpan);
        collectedWordEls.push(wordSpan);
      }
    });

    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  return collectedWordEls;
}

function initProjectDetail() {
  setupDetailBackButton('/#projects');

  const timelineEl = document.getElementById('project-timeline');
  const titleEl = document.getElementById('project-title');
  const descEl = document.querySelector<HTMLElement>('.hero-desc-writing');
  const tagsEl = document.getElementById('project-tags');
  const mediaEl = document.getElementById('project-media');
  const proseElements = document.querySelectorAll<HTMLElement>('.prose > *');

  const titleWords = titleEl ? splitTextToWords(titleEl) : [];
  const descWords = descEl ? splitTextToWords(descEl) : [];
  const allHeroWords = [...titleWords, ...descWords];

  // Accessibility: instant display if prefers-reduced-motion is requested
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (timelineEl) timelineEl.style.opacity = '1';
    if (tagsEl) tagsEl.style.opacity = '1';
    if (mediaEl) mediaEl.style.opacity = '1';
    allHeroWords.forEach((w) => {
      w.style.opacity = '1';
      w.style.transform = 'none';
    });
    proseElements.forEach((p) => p.classList.add('optical-focus-in'));
  } else {
    // Unified, harmonic entrance timeline (Zero conflicting legacy animations)
    const entranceTimeline = anime.timeline({
      easing: 'easeOutQuart',
      complete: () => {
        // Enable hover transitions only after entrance completes to avoid frame contention
        allHeroWords.forEach((word) => {
          word.style.transition = 'color 0.2s ease, transform 0.2s ease';
        });

        const heroZone = document.getElementById('project-hero-zone');
        if (heroZone && allHeroWords.length > 0 && window.matchMedia('(pointer: fine)').matches) {
          let rafId: number | null = null;
          let lastX = 0;
          let lastY = 0;

          const onMouseMove = (e: MouseEvent) => {
            lastX = e.clientX;
            lastY = e.clientY;
            if (rafId !== null) return;

            rafId = requestAnimationFrame(() => {
              rafId = null;
              const radius = 90;
              allHeroWords.forEach((word) => {
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
            allHeroWords.forEach((word) => {
              word.style.transform = 'translateY(0px)';
              word.style.color = '';
            });
          };

          heroZone.addEventListener('mousemove', onMouseMove, { passive: true });
          heroZone.addEventListener('mouseleave', onMouseLeave);
        }
      },
    });

    if (timelineEl) {
      timelineEl.style.opacity = '0';
      entranceTimeline.add({
        targets: timelineEl,
        translateY: [15, 0],
        opacity: [0, 1],
        duration: 550,
      }, 0);
    }

    if (titleWords.length > 0) {
      entranceTimeline.add({
        targets: titleWords,
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 800,
        delay: anime.stagger(24),
      }, 100);
    }

    if (descWords.length > 0) {
      entranceTimeline.add({
        targets: descWords,
        translateY: [15, 0],
        opacity: [0, 1],
        duration: 700,
        delay: anime.stagger(12),
      }, 350);
    }

    if (tagsEl) {
      tagsEl.style.opacity = '0';
      entranceTimeline.add({
        targets: tagsEl,
        translateY: [12, 0],
        opacity: [0, 1],
        duration: 550,
      }, 500);
    }

    if (mediaEl) {
      mediaEl.style.opacity = '0';
      entranceTimeline.add({
        targets: mediaEl,
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 750,
      }, 600);
    }
  }

  // Optical Fog-to-Focus for Article Prose
  if (proseElements.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.classList.add('optical-focus-in');
            observer.unobserve(target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    proseElements.forEach((el) => {
      el.classList.add('optical-focus-ready');
      observer.observe(el);
    });
  }
  const container = document.querySelector('.card-stack-container');
  if (container) {
    const cards = Array.from(container.querySelectorAll('.card-stack-item')) as HTMLElement[];
    if (cards.length > 0) {
      cards.forEach((card, i) => {
        if (i > 0) {
          anime.set(card, {
            translateY: i * 12,
            translateX: i * 4,
            rotate: i % 2 === 0 ? i * 1.5 : -i * 1.5,
            scale: 1 - i * 0.05,
            opacity: 1,
          });
        }
      });

      const captionsAttr = container.getAttribute('data-captions');
      const captions: string[] = captionsAttr ? JSON.parse(captionsAttr) : [];
      const captionEl = document.getElementById('dynamic-caption');

      function prepareCaption(text: string) {
        if (!captionEl) return;
        captionEl.innerHTML = '';
        const words = text.replace(/\n/g, ' \n ').split(' ');
        words.forEach((word) => {
          if (word === '\n') {
            const br = document.createElement('div');
            br.className = 'w-full basis-full h-0 m-0 p-0';
            captionEl.appendChild(br);
          } else if (word.trim() !== '') {
            const span = document.createElement('span');
            span.className = 'caption-word inline-block mr-[0.25em] origin-center';
            span.textContent = word;
            captionEl.appendChild(span);
          }
        });
      }

      if (captionEl && captions.length > 0) {
        prepareCaption(captions[0] || 'Project Fragment');
      }

      let isAnimating = false;

      container.addEventListener('click', () => {
        if (cards.length <= 1 || isAnimating) return;
        isAnimating = true;

        const topCard = cards.shift()!;
        cards.push(topCard);

        if (captionEl && captions.length > 0) {
          const newIndexAttr = cards[0].getAttribute('data-index');
          if (newIndexAttr !== null) {
            const newIndex = parseInt(newIndexAttr, 10);
            const oldWords = captionEl.querySelectorAll('.caption-word');

            anime({
              targets: oldWords.length > 0 ? oldWords : captionEl,
              rotateX: [0, 90],
              opacity: [1, 0],
              duration: 150,
              delay: oldWords.length > 0 ? anime.stagger(20) : 0,
              easing: 'easeInSine',
              complete: () => {
                prepareCaption(captions[newIndex] || 'Project Fragment');
                const newWords = captionEl.querySelectorAll('.caption-word');

                anime({
                  targets: newWords,
                  rotateX: [-90, 0],
                  opacity: [0, 1],
                  duration: 250,
                  delay: anime.stagger(30),
                  easing: 'easeOutBack',
                });
              },
            });
          }
        }

        anime({
          targets: topCard,
          translateX: window.innerWidth < 768 ? 80 : 180,
          translateY: window.innerWidth < 768 ? -15 : -30,
          rotate: 15,
          scale: 0.9,
          opacity: 0,
          easing: 'easeInQuad',
          duration: 350,
          complete: () => {
            cards.forEach((c, index) => {
              c.style.zIndex = String(cards.length - index);
            });

            const newIndex = cards.length - 1;
            anime({
              targets: topCard,
              translateX: newIndex * 4,
              translateY: newIndex * 12,
              rotate: newIndex % 2 === 0 ? newIndex * 1.5 : -newIndex * 1.5,
              scale: 1 - newIndex * 0.05,
              opacity: 1,
              easing: 'easeOutQuint',
              duration: 600,
              complete: () => {
                isAnimating = false;
              },
            });
          },
        });

        cards.forEach((card, i) => {
          if (card === topCard) return;
          anime({
            targets: card,
            translateY: i * 12,
            translateX: i * 4,
            rotate: i % 2 === 0 ? i * 1.5 : -i * 1.5,
            scale: 1 - i * 0.05,
            opacity: 1,
            duration: 700,
            delay: i === 0 ? 100 : 0,
            easing: 'easeOutQuint',
          });
        });
      });
    }
  }
}

document.addEventListener('astro:page-load', initProjectDetail);
