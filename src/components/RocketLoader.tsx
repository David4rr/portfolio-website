import { h } from 'preact';

interface RocketLoaderProps {
  text?: string;
}

export default function RocketLoader({ text = "Igniting..." }: RocketLoaderProps) {
  return (
    <div class="flex flex-col items-center justify-center space-y-6">
      <svg 
        viewBox="-60 0 180 60" 
        class="w-64 h-24 overflow-visible animate-rocket-hover -rotate-12"
      >
        {/* Speed lines for dynamism */}
        <g class="stroke-text-muted/30 stroke-[1px]">
          <line x1="120" y1="10" x2="140" y2="10" class="animate-seq-speed" style={{ animationDelay: '1.2s' }} />
          <line x1="80" y1="50" x2="110" y2="50" class="animate-seq-speed" style={{ animationDelay: '1.25s' }} />
          <line x1="50" y1="60" x2="90" y2="60" class="animate-seq-speed" style={{ animationDelay: '1.3s' }} />
        </g>

        {/* Massive Layered Flames / Exhaust */}
        <g class="animate-seq-flame origin-[20px_30px]">
          {/* Outer massive glow flame */}
          <path d="M 16 12 L -50 30 L 16 48" class="fill-accent/30 stroke-none" />
          {/* Mid large flame */}
          <path d="M 16 18 L -25 30 L 16 42" class="fill-accent/60 stroke-none" />
          {/* Core intensely hot flame */}
          <path d="M 16 24 L -5 30 L 16 36" class="fill-bg-elevated stroke-none" />
        </g>

        {/* ========================================= */}
        {/* "AI" - CALLIGRAPHIC STRUCTURAL VESSEL       */}
        {/* ========================================= */}

        {/* The 'I' - Base Plate with elegant Serif "feet" */}
        <path d="M 12 6 Q 18 6 18 10 L 18 50 Q 18 54 12 54" class="stroke-text-main animate-seq-ai fill-none" stroke-width="4.5" stroke-linecap="round" />
        <path d="M 24 6 Q 18 6 18 10 M 24 54 Q 18 54 18 50" class="stroke-text-main animate-seq-ai fill-none" stroke-width="4.5" stroke-linecap="round" />

        {/* The 'A' - Sweeping, elegant calligraphic curves like a quill stroke */}
        <path d="M 28 10 Q 75 15 115 30 Q 75 45 28 50" class="stroke-text-main animate-seq-ai fill-none" stroke-width="4" stroke-linecap="round" />
        
        {/* Crossbar of the 'A' - Curving gently like a script letter */}
        <path d="M 50 14 Q 65 30 50 46" class="stroke-text-main animate-seq-ai fill-none" stroke-width="3" stroke-linecap="round" />

        {/* ========================================= */}
        {/* "ME" - THE GLOWING POETIC WIRING            */}
        {/* ========================================= */}

        {/* The 'M' - Smooth cursive/rounded arches */}
        <path d="M 36 40 Q 36 24 40 24 Q 44 24 44 32 Q 44 24 48 24 Q 52 24 52 40" class="stroke-accent fill-none animate-seq-me" stroke-width="2" stroke-linecap="round" />

        {/* The 'E' - Script-like flowing prongs fusing into the tip */}
        <path d="M 76 22 Q 68 30 76 38" class="stroke-accent fill-none animate-seq-me" stroke-width="2" stroke-linecap="round" /> {/* Elegant curved spine */}
        <path d="M 74 22 Q 95 25 115 30" class="stroke-accent fill-none animate-seq-me" stroke-width="2" stroke-linecap="round" /> {/* Top sweeping prong */}
        <path d="M 71 30 Q 85 30 95 30" class="stroke-accent fill-none animate-seq-me" stroke-width="2" stroke-linecap="round" /> {/* Middle prong */}
        <path d="M 74 38 Q 95 35 115 30" class="stroke-accent fill-none animate-seq-me" stroke-width="2" stroke-linecap="round" /> {/* Bottom sweeping prong */}
      </svg>
      {text && (
        <div class="font-serif italic text-text-muted text-sm md:text-base tracking-wide animate-pulse mt-4">
          {text}
        </div>
      )}
    </div>
  );
}
