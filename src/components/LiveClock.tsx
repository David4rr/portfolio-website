import { useState, useEffect } from 'preact/hooks';

export default function LiveClock({ location = "Jakarta, ID", timeZone = "Asia/Jakarta" }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const str = new Intl.DateTimeFormat('en-US', {
          timeZone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }).format(new Date());
        setTimeStr(str);
      } catch (e) {
        // Fallback if timezone is invalid
        setTimeStr(new Date().toLocaleTimeString('en-US'));
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timeZone]);

  return (
    <div className="absolute bottom-8 right-8 text-right flex flex-col items-end gap-1 opacity-60 hover:opacity-100 transition-opacity z-20 pointer-events-auto hidden md:flex">
      <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-text-muted">{location}</p>
      <p className="font-serif text-sm text-text-main tabular-nums tracking-wider">{timeStr || '...'}</p>
    </div>
  );
}
