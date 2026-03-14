import { useState, useEffect, useMemo } from 'react';

const FLOAT_CSS = `
@keyframes floatUp {
  0%   { opacity: 0; transform: translateY(4vh) rotate(var(--rot-s, 0deg)); }
  5%   { opacity: 1; }
  78%  { opacity: 1; }
  90%  { opacity: 0; }
  100% { opacity: 0; transform: translateY(-104vh) rotate(var(--rot-e, 0deg)); }
}
.floating-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.floating-bg__icon {
  position: absolute;
  bottom: 0;
  color: var(--text-muted);
  opacity: 0.05;
  animation: floatUp var(--dur, 45s) linear var(--delay, 0s) infinite;
}
html.light .floating-bg__icon {
  opacity: 0.03;
}
`;

function BananaBunchSVG({ size }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* stem */}
      <path d="M23 3 C24 5 24 8 23 11" strokeWidth="2.2"/>
      {/* banana 1 – far left */}
      <path d="M23 11 C16 12 10 18 11 26 C12 32 17 35 21 33 C20 29 19 21 20 15 C21 12 22 11 23 11"/>
      {/* banana 2 */}
      <path d="M23 11 C18 14 15 21 17 29 C19 35 24 37 27 35 C25 31 24 23 24 17 C23 13 23 11 23 11"/>
      {/* banana 3 */}
      <path d="M23 11 C21 15 21 23 24 30 C26 36 31 37 33 35 C31 31 29 22 28 16 C27 12 25 11 23 11"/>
      {/* banana 4 – far right */}
      <path d="M23 11 C25 15 28 22 31 28 C34 33 38 34 39 31 C37 27 34 19 31 14 C29 11 26 10 23 11"/>
    </svg>
  );
}

function MonkeyFaceSVG({ size }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="20" r="11" />
      <circle cx="9" cy="20" r="4" />
      <circle cx="31" cy="20" r="4" />
      <circle cx="16" cy="17" r="1.8" />
      <circle cx="24" cy="17" r="1.8" />
      <ellipse cx="20" cy="24" rx="5.5" ry="3.5" />
      <path d="M16.5 25.5 Q20 28 23.5 25.5" />
    </svg>
  );
}

const ROWS = 42;
const DUR = 200;

function getBreakpoint(w) {
  if (w < 480)  return { cols: 8,  iconSize: 20 };
  if (w < 640)  return { cols: 12, iconSize: 20 };
  if (w < 1024) return { cols: 24, iconSize: 22 };
  return            { cols: 44, iconSize: 24 };
}

function seed(n) {
  const x = Math.sin(n + 1) * 10000;
  return x - Math.floor(x);
}

export default function FloatingBackground() {
  const [visible, setVisible] = useState(
    () => localStorage.getItem('aita-floating-bg') !== '0'
  );

  const [bp, setBp] = useState(() => getBreakpoint(window.innerWidth));

  useEffect(() => {
    const sync = () => setVisible(localStorage.getItem('aita-floating-bg') !== '0');
    window.addEventListener('aita-prefs-change', sync);
    return () => window.removeEventListener('aita-prefs-change', sync);
  }, []);

  useEffect(() => {
    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setBp(getBreakpoint(window.innerWidth)), 150);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, []);

  const iconsConfig = useMemo(() => {
    const { cols } = bp;
    const colW = 100 / cols;
    return Array.from({ length: cols * ROWS }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const sf = (row + 0.5) / ROWS;
      const stagger = (row % 2) * (colW * 0.5);
      const left = `${col * colW + stagger}%`;
      const rs = Math.round((seed(i * 11) * 20) - 10);
      const re = Math.round((seed(i * 17) * 20) - 10);
      const t = (col + row) % 2;
      return {
        t,
        left,
        delay: `${-(sf * DUR).toFixed(2)}s`,
        rs: `${rs}deg`,
        re: `${re}deg`,
      };
    });
  }, [bp]);

  if (!visible) return null;

  return (
    <>
      <style>{FLOAT_CSS}</style>
      <div className="floating-bg" aria-hidden="true">
        {iconsConfig.map((cfg, i) => (
          <div
            key={i}
            className="floating-bg__icon"
            style={{
              left: cfg.left,
              width: `${bp.iconSize}px`,
              height: `${bp.iconSize}px`,
              '--dur': `${DUR}s`,
              '--delay': cfg.delay,
              '--rot-s': cfg.rs,
              '--rot-e': cfg.re,
            }}
          >
            {cfg.t === 0
              ? <BananaBunchSVG size={bp.iconSize} />
              : <MonkeyFaceSVG size={bp.iconSize} />}
          </div>
        ))}
      </div>
    </>
  );
}
