import anime from 'animejs';

export function setupCardStack(
  container: HTMLElement,
  mediaEl: HTMLElement | null,
  signal: AbortSignal
): void {
  const isMobileAttr = container.getAttribute('data-is-mobile') === 'true';
  const enforceMobileLayout = () => {
    container.classList.add('mobile-stack-container');
    if (mediaEl) mediaEl.classList.add('mobile-media-container');
  };

  if (isMobileAttr) {
    enforceMobileLayout();
  } else {
    const firstImg = container.querySelector('img') as HTMLImageElement | null;
    if (firstImg) {
      const checkAspect = () => {
        if (firstImg.naturalWidth && firstImg.naturalHeight) {
          if (firstImg.naturalHeight > firstImg.naturalWidth * 1.15) {
            enforceMobileLayout();
          }
        }
      };
      if (firstImg.complete) {
        checkAspect();
      } else {
        firstImg.addEventListener('load', checkAspect, { once: true, signal });
      }
    }
  }

  const cards = Array.from(container.querySelectorAll('.card-stack-item')) as HTMLElement[];
  if (cards.length === 0) return;

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
  let captions: string[] = [];
  if (captionsAttr) {
    try {
      captions = JSON.parse(captionsAttr);
    } catch {
      captions = [];
    }
  }
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

  container.addEventListener(
    'click',
    () => {
      if (cards.length <= 1 || isAnimating || signal.aborted) return;
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
              if (signal.aborted) return;
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
          if (signal.aborted) return;
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
    },
    { signal }
  );
}

export function setupSingleCoverAspect(mediaEl: HTMLElement, signal: AbortSignal): void {
  const singleCoverImg = mediaEl.querySelector('img') as HTMLImageElement | null;
  if (!singleCoverImg || mediaEl.getAttribute('data-is-mobile') === 'true') return;

  const checkCoverAspect = () => {
    if (singleCoverImg.naturalWidth && singleCoverImg.naturalHeight) {
      if (singleCoverImg.naturalHeight > singleCoverImg.naturalWidth * 1.15) {
        mediaEl.classList.add('mobile-cover-container');
      }
    }
  };

  if (singleCoverImg.complete) {
    checkCoverAspect();
  } else {
    singleCoverImg.addEventListener('load', checkCoverAspect, { once: true, signal });
  }
}
