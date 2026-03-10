import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * ThemeTransition — renders a full-screen overlay that animates
 * like a sunrise (dark→light) or sunset (light→dark) when the theme changes.
 */
export default function ThemeTransition() {
  const { theme } = useTheme();
  const prevTheme = useRef(theme);
  const [anim, setAnim] = useState(null); // 'to-light' | 'to-dark' | null

  useEffect(() => {
    if (prevTheme.current === theme) return;
    const direction = theme === 'light' ? 'to-light' : 'to-dark';
    prevTheme.current = theme;
    setAnim(direction);
    const id = setTimeout(() => setAnim(null), 900);
    return () => clearTimeout(id);
  }, [theme]);

  if (!anim) return null;

  return (
    <div
      className={`theme-transition-overlay theme-transition-overlay--${anim}`}
      aria-hidden="true"
    />
  );
}
