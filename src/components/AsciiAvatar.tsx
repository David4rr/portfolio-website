import { useState, useCallback, useRef } from 'preact/hooks';

interface AsciiAvatarProps {
  initialArt: string;
  framesData: string;
}

const charsArray = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`. '.split("");

export default function AsciiAvatar({ initialArt, framesData }: AsciiAvatarProps) {
  const [content, setContent] = useState(initialArt);
  const isAnimatingRef = useRef(false);
  const currentFrameRef = useRef(0);

  const handleClick = useCallback(() => {
    if (isAnimatingRef.current) return;
    
    let frames: string[][];
    try {
      frames = JSON.parse(framesData);
    } catch (e) {
      return;
    }

    if (frames.length < 2) return;
    isAnimatingRef.current = true;

    const targetFrame = currentFrameRef.current === 0 ? 1 : 0;
    const targetRows = frames[targetFrame];
    const currentRows = frames[currentFrameRef.current].slice();

    const rows = targetRows.length;
    const cols = targetRows[0].length;
    const totalChars = rows * cols;
    let charsResolved = 0;

    const resolved = Array.from({ length: rows }, () => Array(cols).fill(false));

    const interval = setInterval(() => {
      const swaps = Math.floor(totalChars * (0.05 + Math.random() * 0.05));

      for (let i = 0; i < swaps; i++) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);

        if (!resolved[r][c]) {
          if (Math.random() > 0.5) {
            const rowArr = currentRows[r].split("");
            rowArr[c] = charsArray[Math.floor(Math.random() * charsArray.length)];
            currentRows[r] = rowArr.join("");
          } else {
            const rowArr = currentRows[r].split("");
            rowArr[c] = targetRows[r][c];
            currentRows[r] = rowArr.join("");
            resolved[r][c] = true;
            charsResolved++;
          }
        }
      }

      setContent(currentRows.join("\n"));

      if (charsResolved > totalChars * 0.9) {
        clearInterval(interval);
        setContent(frames[targetFrame].join("\n"));
        currentFrameRef.current = targetFrame;
        isAnimatingRef.current = false;
      }
    }, 30);
  }, [framesData]);

  return (
    <pre
      id="ascii-avatar"
      class="font-mono text-[8px] leading-[0.55] text-accent select-none whitespace-pre overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
      onClick={handleClick}
    >
      {content}
    </pre>
  );
}
