import { useEffect, useRef } from 'react';
import { Rive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

export default function RiveAvatar({ artboard, src = '/avatars/avatars.riv', size = 56 }) {
  const canvasRef = useRef(null);
  const riveRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const r = new Rive({
      src,
      canvas: canvasRef.current,
      artboard: artboard || undefined,
      autoplay: false,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onLoad: () => {
        const anim = r.animationNames.find(n => n.includes('_Anim')) ?? r.animationNames[0];
        r.play(anim);
      },
    });
    riveRef.current = r;

    return () => {
      r.cleanup();
      riveRef.current = null;
    };
  }, [artboard, src]);

  const dim = size === 'full' ? '100%' : (typeof size === 'number' ? `${size}px` : size);
  return (
    <div style={{ width: dim, height: dim, pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
