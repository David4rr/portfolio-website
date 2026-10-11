import anime from 'animejs';
import { setupDetailBackButton } from '../lib/detail-helpers';

function splitTextToLetters(el: HTMLElement) {
  if (el.dataset.split) return;
  el.dataset.split = 'true';

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  const textNodes: Node[] = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && node.nodeValue.trim() !== '') textNodes.push(node);
  }

  textNodes.forEach((textNode) => {
    const fragment = document.createDocumentFragment();
    const words = textNode.nodeValue!.split(/(\s+)/);
    words.forEach((word) => {
      if (word.trim() === '') {
        fragment.appendChild(document.createTextNode(word));
      } else {
        const spanWrap = document.createElement('span');
        spanWrap.className = 'inline-block whitespace-nowrap';
        spanWrap.innerHTML = [...word]
          .map((l) => `<span class="letter inline-block opacity-0 origin-bottom-left">${l}</span>`)
          .join('');
        fragment.appendChild(spanWrap);
      }
    });
    textNode.parentNode?.replaceChild(fragment, textNode);
  });
}

function initProjectDetail() {
  setupDetailBackButton('/#projects');

  const revealElements = document.querySelectorAll('.premium-reveal');
  if (revealElements.length > 0) {
    anime({
      targets: revealElements,
      translateY: [40, 0],
      opacity: [0, 1],
      duration: 1400,
      delay: anime.stagger(200, { start: 100 }),
      easing: 'easeOutQuart',
    });
  }

  const descEl = document.querySelector<HTMLElement>('.hero-desc-writing');
  if (descEl) {
    splitTextToLetters(descEl);

    anime({
      targets: '.hero-desc-writing .letter',
      opacity: [0, 1],
      skewX: [30, 0],
      scaleY: [0.2, 1],
      translateY: [5, 0],
      duration: 500,
      easing: 'easeOutQuint',
      delay: anime.stagger(4, { start: 350 }),
    });

    anime({
      targets: descEl,
      opacity: [0, 1],
      duration: 100,
    });
  }

  const proseElements = document.querySelectorAll<HTMLElement>('.prose > *');
  if (proseElements.length > 0 && 'IntersectionObserver' in window) {
    proseElements.forEach((el) => {
      el.style.opacity = '0';
      splitTextToLetters(el);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.style.opacity = '1';

            const letters = target.querySelectorAll('.letter');
            if (letters.length > 0) {
              anime({
                targets: letters,
                opacity: [0, 1],
                skewX: [30, 0],
                scaleY: [0.2, 1],
                translateY: [5, 0],
                duration: 600,
                easing: 'easeOutQuint',
                delay: anime.stagger(6),
              });
            }

            const nonTextElements = target.querySelectorAll('img, video, hr, iframe');
            if (nonTextElements.length > 0 || letters.length === 0) {
              anime({
                targets: letters.length === 0 ? target : nonTextElements,
                translateY: [25, 0],
                opacity: [0, 1],
                duration: 1200,
                easing: 'easeOutCubic',
              });
            }

            observer.unobserve(target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    proseElements.forEach((el) => observer.observe(el));
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
