import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import anime from 'animejs/lib/anime.es.js';
export interface Project {
  id: string;
  title: string;
  description: string;
  image: string;
  type: 'mobile' | 'web' | 'center';
  isReal: boolean;
}

interface PlacedProject extends Project {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function InfiniteCanvas({ projects }: { projects: Project[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // Center of viewport
  const [viewport, setViewport] = useState({ w: 1000, h: 1000 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // 1. Calculate Layout (Dense Grid Oval Packing)
  const laidOutProjects = useMemo(() => {
    const CELL = 280;
    const GAP = 8; // Very tight, elegant gap

    // Generate grid coordinates and sort by oval distance
    const coords: { x: number, y: number }[] = [];
    const radius = 40;
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        coords.push({ x, y });
      }
    }
    coords.sort((a, b) => {
      // Use 2.0 multiplier for X to create a much more pronounced eclipse/oval shape
      const distA = Math.pow(a.x / 2.0, 2) + Math.pow(a.y, 2);
      const distB = Math.pow(b.x / 2.0, 2) + Math.pow(b.y, 2);
      return distA - distB;
    });

    const occupied = new Set<string>();
    const isFree = (x: number, y: number, w: number, h: number) => {
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          if (occupied.has(`${x + i},${y + j}`)) return false;
        }
      }
      return true;
    };
    const markOccupied = (x: number, y: number, w: number, h: number) => {
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          occupied.add(`${x + i},${y + j}`);
        }
      }
    };

    const result: PlacedProject[] = [];

    projects.forEach((p, i) => {
      // Determine grid spans based on project type
      let gw = 1;
      let gh = 1;
      
      if (p.type === 'mobile') {
        gw = 1;
        gh = 2; // Tall
      } else if (p.type === 'web') {
        gw = 2;
        gh = 1; // Wide
      } else if (p.type === 'center') {
        gw = 2;
        gh = 2; // Large square for the center
      }
      
      // Randomly make some concepts 2x2 for dramatic scale
      if (!p.isReal && i % 11 === 0) {
        gw = 2;
        gh = 2;
      }

      // Find first free coordinate closest to center
      for (const coord of coords) {
        if (isFree(coord.x, coord.y, gw, gh)) {
          markOccupied(coord.x, coord.y, gw, gh);
          
          const px = coord.x * (CELL + GAP);
          const py = coord.y * (CELL + GAP);
          const pw = gw * CELL + (gw - 1) * GAP;
          const ph = gh * CELL + (gh - 1) * GAP;
          
          // Convert top-left to center for translate3d
          const centerX = px + pw / 2;
          const centerY = py + ph / 2;
          
          result.push({ ...p, x: centerX, y: centerY, w: pw, h: ph });
          break;
        }
      }
    });
    
    return result;
  }, [projects]);

  // 2. Setup initial position and window size
  useEffect(() => {
    const updateSize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    
    updateSize();
    setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 3. Pan and Drag Logic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerDown = (e: PointerEvent) => {
      setIsDragging(true);
      hasDraggedRef.current = false;
      lastPos.current = { x: e.clientX, y: e.clientY };
      startPos.current = { x: e.clientX, y: e.clientY };
      // Do NOT capture pointer here, let click bubble if no drag occurs
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      
      const totalDx = Math.abs(e.clientX - startPos.current.x);
      const totalDy = Math.abs(e.clientY - startPos.current.y);
      if (!hasDraggedRef.current && (totalDx > 3 || totalDy > 3)) {
        hasDraggedRef.current = true;
        // Only capture the pointer once the user is explicitly dragging
        container.setPointerCapture(e.pointerId);
      }
      
      setPos(p => ({ x: p.x + dx, y: p.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      setIsDragging(false);
      if (hasDraggedRef.current) {
        container.releasePointerCapture(e.pointerId);
      }
    };

    const onWheel = (e: WheelEvent) => {
      setPos(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    };

    const onClick = (e: MouseEvent) => {
      if (hasDraggedRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: true });
    container.addEventListener('click', onClick, { capture: true });

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick, { capture: true });
    };
  }, [isDragging]);

  // 4. Virtualization
  const visibleProjects = laidOutProjects.filter(p => {
    const viewMinX = -pos.x;
    const viewMaxX = -pos.x + viewport.w;
    const viewMinY = -pos.y;
    const viewMaxY = -pos.y + viewport.h;
    
    const buffer = 400; // Render slightly outside viewport for smooth dragging
    
    return !(
      p.x + p.w/2 < viewMinX - buffer ||
      p.x - p.w/2 > viewMaxX + buffer ||
      p.y + p.h/2 < viewMinY - buffer ||
      p.y - p.h/2 > viewMaxY + buffer
    );
  });

  // 5. Flip State & Anime.js Sequences
  const animMap = useRef(new Map<string, any>());
  const stateMap = useRef(new Map<string, any>());
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      animMap.current.forEach(anim => anim.pause());
      animMap.current.clear();
      stateMap.current.clear();
    };
  }, []);

  const playFlipForward = (p: PlacedProject) => {
    const id = p.id;
    if (animMap.current.has(id)) animMap.current.get(id).pause();

    const state = stateMap.current.get(id) || { rotateY: 0, lift: 0 };
    stateMap.current.set(id, state);

    const containerEl = document.getElementById(`card-inner-${id}`);
    const frontEl = document.getElementById(`card-front-${id}`);
    const backEl = document.getElementById(`card-back-${id}`);
    
    if (containerEl && frontEl && backEl) {
      const timeline = anime.timeline({ autoplay: true });

      timeline.add({
        targets: state,
        rotateY: Math.PI,
        lift: [
          { value: 1, duration: 400, easing: 'easeOutQuad' },
          { value: 0, duration: 600, easing: 'easeInQuad' }
        ],
        duration: 1000,
        easing: 'easeOutCubic',
        update: () => {
          const ty = state.lift * -30;
          const scale = 1 + (state.lift * 0.05);
          containerEl.style.transform = `translateY(${ty}px) scale(${scale}) rotateY(${state.rotateY}rad)`;
          
          if (state.rotateY >= Math.PI / 2) {
             frontEl.style.opacity = '0';
             backEl.style.opacity = '1';
          } else {
             frontEl.style.opacity = '1';
             backEl.style.opacity = '0';
          }
        }
      }, 0);
      
      animMap.current.set(id, timeline);
    }
  };

  const playFlipBack = (p: PlacedProject) => {
    const id = p.id;
    if (animMap.current.has(id)) animMap.current.get(id).pause();

    const state = stateMap.current.get(id) || { rotateY: Math.PI, lift: 0 };
    const containerEl = document.getElementById(`card-inner-${id}`);
    const frontEl = document.getElementById(`card-front-${id}`);
    const backEl = document.getElementById(`card-back-${id}`);
    
    if (containerEl && frontEl && backEl) {
      const timeline = anime.timeline({ autoplay: true });

      timeline.add({
        targets: state,
        rotateY: 0,
        lift: [
          { value: 1, duration: 300, easing: 'easeOutQuad' },
          { value: 0, duration: 500, easing: 'easeInQuad' }
        ],
        duration: 800,
        easing: 'easeOutCubic',
        update: () => {
          const ty = state.lift * -30;
          const scale = 1 + (state.lift * 0.05);
          containerEl.style.transform = `translateY(${ty}px) scale(${scale}) rotateY(${state.rotateY}rad)`;
          
          if (state.rotateY >= Math.PI / 2) {
             frontEl.style.opacity = '0';
             backEl.style.opacity = '1';
          } else {
             frontEl.style.opacity = '1';
             backEl.style.opacity = '0';
          }
        }
      }, 0);

      animMap.current.set(id, timeline);
    }
  };

  const handleCardClick = (e: MouseEvent, p: PlacedProject) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      return;
    }

    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
        playFlipBack(p);
      } else {
        next.add(p.id);
        playFlipForward(p);
      }
      return next;
    });
  };

  return (
    <div 
      ref={containerRef}
      class="w-full h-full cursor-grab active:cursor-grabbing touch-none overflow-hidden bg-bg"
    >
      <div 
        class="absolute top-0 left-0 will-change-transform"
        style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      >
        {visibleProjects.map(p => {
          if (p.type === 'center') {
            return (
              <div
                key={p.id}
                class="absolute flex flex-col items-center justify-center p-8 md:p-12 text-center border border-border-subtle/20 bg-bg-elevated/10 z-0"
                style={{ 
                  width: `${p.w}px`, 
                  height: `${p.h}px`,
                  transform: `translate3d(${p.x - p.w/2}px, ${p.y - p.h/2}px, 0)` 
                }}
              >
                <div class="absolute inset-4 md:inset-8 border border-border-subtle/40 pointer-events-none"></div>
                <h2 class="font-serif text-3xl md:text-5xl text-text-main mb-8 md:mb-12 leading-relaxed italic">
                  "A culmination of thought,<br/>forged into reality."
                </h2>
                <div class="w-16 h-[1px] bg-accent/40 mb-8 md:mb-12"></div>
                <p class="text-text-muted font-sans text-[10px] md:text-[12px] tracking-[0.25em] uppercase leading-loose">
                  Pan, drag, and click<br/>to explore the archive.
                </p>
              </div>
            );
          }

          const firstReal = projects.find(r => r.isReal)?.id || 'hello-world';
          const targetHref = p.isReal ? `/projects/${p.id}?from=explore` : `/projects/${firstReal}?from=explore`;
          
          return (
          <div
            key={p.id}
            class={`absolute will-change-transform ${flippedCards.has(p.id) ? 'z-50' : 'z-0 hover:z-10'} [perspective:1500px]`}
            style={{ 
              width: `${p.w}px`, 
              height: `${p.h}px`,
              transform: `translate3d(${p.x - p.w/2}px, ${p.y - p.h/2}px, 0)` 
            }}
          >
            <div
              class="block w-full h-full relative cursor-pointer group"
              onClick={(e) => handleCardClick(e, p)}
            >
              <div 
                id={`card-inner-${p.id}`} 
                class="w-full h-full relative" 
                style={{ 
                  transformStyle: 'preserve-3d', 
                  WebkitTransformStyle: 'preserve-3d'
                }}
              >
                {/* FRONT FACE (DOM Image - acts as placeholder when WebGL is active) */}
                <div id={`card-front-${p.id}`} class="absolute inset-0 w-full h-full overflow-hidden bg-bg border border-border-subtle opacity-100" style={{ transform: 'rotateY(0deg) translateZ(1px)' }}>
                  <img 
                    src={p.image} 
                    alt={p.title}
                    class="w-full h-full object-cover pointer-events-none brightness-[0.95]"
                    loading="lazy"
                    draggable={false}
                  />
                </div>

                {/* BACK FACE (Poetry / Details) */}
                <div id={`card-back-${p.id}`} class="absolute inset-0 w-full h-full overflow-hidden bg-bg-elevated border border-accent flex flex-col items-center justify-center p-8 text-center opacity-0" style={{ transform: 'rotateY(180deg) translateZ(1px)' }}>
                  
                  {/* Inner Manuscript Border */}
                  <div class="absolute inset-3 border border-border-subtle/50 pointer-events-none"></div>
                  
                  <h3 class="font-serif text-[clamp(1.1rem,1.5vw,1.8rem)] leading-tight font-normal text-text-main mb-4">
                    {p.title}
                  </h3>
                  
                  <div class="w-8 h-[1px] bg-accent/40 mb-5"></div>
                  
                  <p class="text-text-muted text-[13px] font-sans tracking-wide leading-relaxed line-clamp-4 italic mb-8 pointer-events-none">
                    "{p.description}"
                  </p>

                  <a href={targetHref} onClick={(e) => e.stopPropagation()} class="inline-flex items-center gap-3 border border-text-main/20 text-text-main font-sans uppercase tracking-[0.2em] text-[10px] px-8 py-3 rounded-full hover:bg-text-main hover:text-bg transition-all duration-500 cursor-pointer">
                    View Details
                  </a>

                  {/* Footnote */}
                  {!p.isReal && (
                    <div class="absolute top-5 right-6 text-accent/40 font-serif text-2xl pointer-events-none" aria-label="Concept Note">
                      *
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
