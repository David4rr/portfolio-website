import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import anime from 'animejs/lib/anime.es.js';
import RocketLoader from './RocketLoader';
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

const ImageWithLoader = ({ src, alt }: { src: string, alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div class="relative w-full h-full bg-bg-elevated overflow-hidden">
      <div class={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${loaded ? 'opacity-0' : 'opacity-100'}`}>
         <div class="font-serif text-accent/40 text-xl animate-pulse">
           ✧
         </div>
      </div>
      <img 
        src={src} 
        alt={alt}
        onLoad={() => setLoaded(true)}
        class={`absolute inset-0 w-full h-full object-cover pointer-events-none brightness-[0.95] transition-opacity duration-[1500ms] ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </div>
  );
};

export default function InfiniteCanvas({ projects }: { projects: Project[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [sizesLoaded, setSizesLoaded] = useState(false);

  // Load image aspect ratios to make cards perfectly fit the uploaded images
  useEffect(() => {
    const ratios: Record<string, number> = {};
    let loadedCount = 0;
    const realProjects = projects.filter(p => p.isReal && p.image);
    
    if (realProjects.length === 0) {
      setSizesLoaded(true);
      return;
    }

    realProjects.forEach(p => {
      const img = new window.Image();
      img.onload = () => {
        ratios[p.id] = img.naturalWidth / img.naturalHeight;
        loadedCount++;
        if (loadedCount === realProjects.length) {
          setAspectRatios({...ratios});
          setSizesLoaded(true);
        }
      };
      img.onerror = () => {
        ratios[p.id] = 16/9; // fallback
        loadedCount++;
        if (loadedCount === realProjects.length) {
          setAspectRatios({...ratios});
          setSizesLoaded(true);
        }
      };
      img.src = p.image;
    });
  }, [projects]);

  // Artificial delay to show the loader
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2200); 
    return () => clearTimeout(timer);
  }, []);

  // 1. Calculate Layout (Dense Grid Oval Packing with Dynamic Irregular Aspect Ratios)
  const laidOutProjects = useMemo(() => {
    if (!sizesLoaded) return [];

    const CELL = 80;
    const GAP = 12; 

    // Generate grid coordinates and sort by oval distance
    const coords: { x: number, y: number }[] = [];
    const radius = 60; // Larger radius for finer grid
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        coords.push({ x, y });
      }
    }
    coords.sort((a, b) => {
      const distA = Math.sqrt(a.x * a.x + (a.y * 1.5) * (a.y * 1.5));
      const distB = Math.sqrt(b.x * b.x + (b.y * 1.5) * (b.y * 1.5));
      return distA - distB;
    });

    const result: PlacedProject[] = [];
    const occupied = new Set<string>();

    const checkFit = (startX: number, startY: number, w: number, h: number) => {
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          if (occupied.has(`${startX + x},${startY + y}`)) return false;
        }
      }
      return true;
    };

    const markOccupied = (startX: number, startY: number, w: number, h: number) => {
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          occupied.add(`${startX + x},${startY + y}`);
        }
      }
    };

    const sorted = [...projects].sort((a, b) => {
      if (a.id === 'center-poetry') return -1;
      if (b.id === 'center-poetry') return 1;
      return 0; 
    });

    sorted.forEach((p, index) => {
      let gw = 3;
      let gh = 3;
      let exactW = 0;
      let exactH = 0;
      
      if (p.type === 'center') {
        gw = 5;
        gh = 5; 
        exactW = gw * CELL + (gw - 1) * GAP;
        exactH = gh * CELL + (gh - 1) * GAP;
      } else if (!p.isReal) {
        gw = index % 3 === 0 ? 4 : 3;
        gh = gw === 4 ? 3 : 4;
        exactW = gw * CELL + (gw - 1) * GAP;
        exactH = gh * CELL + (gh - 1) * GAP;
      } else {
        const ratio = aspectRatios[p.id] || (p.type === 'mobile' ? 0.5 : 1.77);
        // Target an area of roughly 16-20 cells
        gh = Math.round(Math.sqrt(20 / ratio));
        gh = Math.max(2, Math.min(gh, 8));
        
        exactH = gh * CELL + (gh - 1) * GAP;
        exactW = exactH * ratio;
        
        // Calculate how many grid columns are needed to safely enclose this width
        gw = Math.ceil((exactW + GAP) / (CELL + GAP));
        gw = Math.max(2, Math.min(gw, 12));
      }

      for (const c of coords) {
        if (checkFit(c.x, c.y, gw, gh)) {
          markOccupied(c.x, c.y, gw, gh);
          result.push({
            ...p,
            // x and y represent the absolute center of the reserved grid space
            x: c.x * (CELL + GAP) + ((gw - 1) * (CELL + GAP)) / 2,
            y: c.y * (CELL + GAP) + ((gh - 1) * (CELL + GAP)) / 2,
            // The card itself gets the exact pixel dimensions to avoid any cropping!
            w: exactW,
            h: exactH,
          });
          break;
        }
      }
    });
    
    return result;
  }, [projects, sizesLoaded, aspectRatios]);

  const [pos, setPos] = useState(() => {
    const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
    const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 500;
    return { x: cx, y: cy }; 
  });
  
  const hasCentered = useRef(false);

  // Automatically center the canvas on the main 'center-poetry' node after layout
  useEffect(() => {
    if (laidOutProjects.length > 0 && !hasCentered.current && typeof window !== 'undefined') {
      const centerProj = laidOutProjects.find(p => p.id === 'center-poetry');
      if (centerProj) {
        setPos({
          x: window.innerWidth / 2 - centerProj.x,
          y: window.innerHeight / 2 - centerProj.y
        });
        hasCentered.current = true;
      }
    }
  }, [laidOutProjects]);

  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // 2. Setup initial window size
  const [viewport, setViewport] = useState({ w: 1000, h: 1000 });
  useEffect(() => {
    const updateSize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    
    updateSize();
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
  const visibleProjects = useMemo(() => {
    // Only render projects that are within or near the viewport
    const margin = 1500; // Render a bit outside to prevent pop-in
    
    // Viewport bounding box (in canvas coordinates) assuming wrapper is at center (top-1/2 left-1/2)
    const minX = -pos.x - viewport.w/2 - margin;
    const maxX = -pos.x + viewport.w/2 + margin;
    const minY = -pos.y - viewport.h/2 - margin;
    const maxY = -pos.y + viewport.h/2 + margin;

    return laidOutProjects.filter(p => {
      // Check if project overlaps with viewport bounding box
      return (p.x + p.w/2) > minX && (p.x - p.w/2) < maxX &&
             (p.y + p.h/2) > minY && (p.y - p.h/2) < maxY;
    });
  }, [laidOutProjects, pos, viewport]);

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
      class="w-full h-full cursor-grab active:cursor-grabbing touch-none overflow-hidden bg-bg relative"
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
                  <ImageWithLoader src={p.image} alt={p.title} />
                </div>

                {/* BACK FACE (Poetry / Details) */}
                <div id={`card-back-${p.id}`} class="absolute inset-0 w-full h-full overflow-hidden bg-bg-elevated border border-accent flex flex-col items-center justify-center p-8 text-center opacity-0" style={{ transform: 'rotateY(180deg) translateZ(1px)' }}>
                  
                  {/* Inner Manuscript Border */}
                  <div class="absolute inset-3 border border-border-subtle/50 pointer-events-none"></div>
                  
                  <h3 class="font-serif text-[clamp(1.1rem,1.5vw,1.8rem)] leading-tight font-normal text-text-main mb-4 flex-shrink-0 px-2">
                    {p.title}
                  </h3>
                  
                  <div class="w-8 h-[1px] bg-accent/40 mb-6 flex-shrink-0"></div>
                  
                  <div class="overflow-hidden flex-shrink-0 px-4">
                    <p class="text-text-muted text-[13px] font-serif tracking-wide leading-relaxed line-clamp-3 italic mb-8 pointer-events-none">
                      "{p.description}"
                    </p>
                  </div>

                  <a href={targetHref} onClick={(e) => e.stopPropagation()} class="inline-flex items-center gap-3 border border-text-main/20 text-text-main font-sans uppercase tracking-[0.2em] text-[10px] px-8 py-3 rounded-full hover:bg-text-main hover:text-bg transition-all duration-500 cursor-pointer flex-shrink-0">
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

      {/* Loading Overlay */}
      <div 
        class={`absolute inset-0 z-50 flex items-center justify-center bg-bg transition-opacity duration-1000 pointer-events-none ${isLoading ? 'opacity-100' : 'opacity-0'}`}
      >
        <RocketLoader />
      </div>
    </div>
  );
}
