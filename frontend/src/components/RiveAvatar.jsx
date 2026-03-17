import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';

export default function RiveAvatar({ artboard, src = '/avatars/avatars.riv', size = 56 }) {
  const { RiveComponent } = useRive({
    src,
    artboard: artboard || undefined,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });

  return (
    <div style={{ width: size === 'full' ? '100%' : size, height: size === 'full' ? '100%' : size, pointerEvents: 'none' }}>
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
