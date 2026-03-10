import { useState, useEffect, useRef, useCallback } from 'react';

/*
 * Mascot — animated walking monkey
 * States: sitting → walking → eating → walking → ...
 * Click to scare it off screen; it returns from the other side.
 */

const WALK_SPEED   = 90;   // px/s
const SCREEN_PAD   = 80;   // px from edge before turning
const EAT_DURATION = 3500; // ms spent eating
const SIT_DURATION = 2500; // ms sitting before walking
const FLEE_SPEED   = 400;  // px/s when scared

// States
const S = {
  SITTING:  'sitting',
  WALKING:  'walking',
  EATING:   'eating',
  FLEEING:  'fleeing',
  HIDDEN:   'hidden',
  ENTERING: 'entering',
};

export default function Mascot() {
  const [x, setX]           = useState(() => window.innerWidth - 120);
  const [facingRight, setFacingRight] = useState(false);
  const [state, setState]   = useState(S.SITTING);
  const [eatFrame, setEatFrame] = useState(0); // 0-2 banana bite frames
  const [walkFrame, setWalkFrame] = useState(0); // leg phase

  const stateRef    = useRef(S.SITTING);
  const xRef        = useRef(window.innerWidth - 120);
  const dirRef      = useRef(-1); // -1 = left, 1 = right
  const timersRef   = useRef([]);
  const rafRef      = useRef(null);
  const lastTimeRef = useRef(null);

  const addTimer = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Walk loop via requestAnimationFrame
  const startWalking = useCallback((toX) => {
    clearTimers();
    setState(S.WALKING);
    stateRef.current = S.WALKING;

    const dir = toX > xRef.current ? 1 : -1;
    dirRef.current = dir;
    setFacingRight(dir === 1);

    let frame = 0;
    let legTimer = 0;

    const loop = (now) => {
      if (stateRef.current !== S.WALKING) return;
      const dt = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = now;

      // Move
      const next = xRef.current + dir * WALK_SPEED * dt;
      const arrived = dir === 1 ? next >= toX : next <= toX;
      const clampedX = arrived ? toX : next;
      xRef.current = clampedX;
      setX(clampedX);

      // Walk leg frame toggle ~8fps
      legTimer += dt;
      if (legTimer > 0.12) { legTimer = 0; frame = (frame + 1) % 4; setWalkFrame(frame); }

      if (arrived) {
        lastTimeRef.current = null;
        // Decide: eat or turn around
        const roll = Math.random();
        if (roll < 0.6) {
          // Eat!
          setState(S.EATING);
          stateRef.current = S.EATING;
          let bite = 0;
          const biteInterval = setInterval(() => { bite = (bite + 1) % 3; setEatFrame(bite); }, 400);
          timersRef.current.push(biteInterval);
          addTimer(() => {
            clearInterval(biteInterval);
            scheduleNextWalk();
          }, EAT_DURATION);
        } else {
          // Sit briefly then walk
          setState(S.SITTING);
          stateRef.current = S.SITTING;
          addTimer(() => scheduleNextWalk(), SIT_DURATION);
        }
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(loop);
  }, [clearTimers]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleNextWalk = useCallback(() => {
    if (stateRef.current === S.FLEEING || stateRef.current === S.HIDDEN || stateRef.current === S.ENTERING) return;
    const W = window.innerWidth;
    // Pick a random x destination staying away from edges
    const targetX = SCREEN_PAD + Math.random() * (W - SCREEN_PAD * 3);
    addTimer(() => startWalking(targetX), 300);
  }, [startWalking]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial: sit a moment then start roaming
  useEffect(() => {
    addTimer(() => scheduleNextWalk(), SIT_DURATION);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = useCallback(() => {
    if (stateRef.current === S.FLEEING || stateRef.current === S.HIDDEN || stateRef.current === S.ENTERING) return;
    clearTimers();
    stateRef.current = S.FLEEING;
    setState(S.FLEEING);

    // Flee right off screen
    setFacingRight(true);
    dirRef.current = 1;

    const W = window.innerWidth;
    let last = null;
    const flee = (now) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      const next = xRef.current + FLEE_SPEED * dt;
      xRef.current = next;
      setX(next);
      if (next < W + 100) {
        rafRef.current = requestAnimationFrame(flee);
      } else {
        // Hidden off screen
        stateRef.current = S.HIDDEN;
        setState(S.HIDDEN);
        // Re-enter from left after 4s
        addTimer(() => {
          xRef.current = -100;
          setX(-100);
          setFacingRight(true);
          dirRef.current = 1;
          stateRef.current = S.ENTERING;
          setState(S.ENTERING);
          // Walk in from left
          const entryTarget = 80 + Math.random() * (W / 2);
          startWalking(entryTarget);
        }, 4000);
      }
    };
    rafRef.current = requestAnimationFrame(flee);
  }, [clearTimers, startWalking]);

  if (state === S.HIDDEN) return null;

  const bottom = state === S.WALKING ? [0, 3, 0, -3][walkFrame] : 0; // subtle bounce when walking

  return (
    <div
      className="mascot"
      style={{
        left: x,
        right: 'auto',
        bottom: `${20 + bottom}px`,
        transform: `scaleX(${facingRight ? 1 : -1})`,
        transition: state === S.FLEEING ? 'none' : 'bottom 0.1s ease',
        cursor: state === S.FLEEING || state === S.ENTERING ? 'default' : 'pointer',
      }}
      onClick={handleClick}
      role="img"
      aria-label="Mascot monkey"
    >
      <span className="mascot__tooltip" style={{ transform: `scaleX(${facingRight ? 1 : -1})` }}>
        {state === S.EATING ? 'Yum! 🍌' : state === S.SITTING ? 'Pet me! 🐾' : ''}
      </span>
      <MonkeySVG state={state} walkFrame={walkFrame} eatFrame={eatFrame} />
    </div>
  );
}

/* ─── SVG Monkey Character ─── */
function MonkeySVG({ state, walkFrame, eatFrame }) {
  const isWalking = state === S.WALKING || state === S.FLEEING || state === S.ENTERING;
  const isEating  = state === S.EATING;

  // Leg angles for walking cycle
  const legAngles = [
    [20, -20, -20, 20],   // frame 0: L-fwd, R-back
    [10, -10, -10, 10],   // frame 1
    [-20, 20, 20, -20],   // frame 2: L-back, R-fwd
    [-10, 10, 10, -10],   // frame 3
  ];
  const [lf, rf, lb, rb] = isWalking ? legAngles[walkFrame] : [0, 0, 0, 0];

  // Arm angles
  const armL = isWalking ? -lf * 0.6 : isEating ? -40 : 10;
  const armR = isWalking ?  lf * 0.6 : isEating ?  20 : 10;

  // Banana position (when eating, held up to mouth)
  const bananaY = isEating ? 18 + Math.sin(eatFrame * 1.5) * 4 : 30;
  const bananaVisible = isEating || state === S.SITTING;

  return (
    <svg
      width="70"
      height="80"
      viewBox="0 0 70 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/* === TAIL === */}
      <path
        d="M46 62 Q58 56 56 44 Q54 35 46 39"
        stroke="#8B4513"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        style={{
          transformOrigin: '46px 62px',
          animation: isWalking
            ? 'tailWalk 0.5s ease-in-out infinite alternate'
            : 'tailIdle 2s ease-in-out infinite',
        }}
      />

      {/* === BACK LEGS (behind body) === */}
      {/* Left back leg */}
      <g style={{ transformOrigin: '28px 57px', transform: `rotate(${lb}deg)` }}>
        <rect x="24" y="57" width="8" height="16" rx="4" fill="#A0522D"/>
        <ellipse cx="28" cy="74" rx="6" ry="4" fill="#8B4513"/>
      </g>
      {/* Right back leg */}
      <g style={{ transformOrigin: '42px 57px', transform: `rotate(${rb}deg)` }}>
        <rect x="38" y="57" width="8" height="16" rx="4" fill="#A0522D"/>
        <ellipse cx="42" cy="74" rx="6" ry="4" fill="#8B4513"/>
      </g>

      {/* === BODY === */}
      <ellipse cx="35" cy="52" rx="17" ry="15" fill="#C8874A"/>
      {/* Belly */}
      <ellipse cx="35" cy="55" rx="10" ry="9" fill="#E8B07A"/>

      {/* === LEFT ARM === */}
      <g style={{ transformOrigin: '18px 44px', transform: `rotate(${armL}deg)` }}>
        <path d="M18 44 Q10 54 12 62" stroke="#C8874A" strokeWidth="6" strokeLinecap="round" fill="none"/>
        {/* Left hand */}
        <circle cx="12" cy="62" r="5" fill="#C8874A"/>
      </g>

      {/* === RIGHT ARM + BANANA === */}
      <g style={{ transformOrigin: '52px 44px', transform: `rotate(${armR}deg)` }}>
        <path d="M52 44 Q60 52 58 60" stroke="#C8874A" strokeWidth="6" strokeLinecap="round" fill="none"/>
        <circle cx="58" cy="60" r="5" fill="#C8874A"/>
        {/* Banana in right hand */}
        {bananaVisible && (
          <g transform={`translate(52, ${bananaY}) rotate(-40)`}>
            <path
              d="M0 0 Q10 -3 14 5 Q10 13 0 10 Q-2 5 0 0 Z"
              fill="#FFE135"
              stroke="#C8A800"
              strokeWidth="0.5"
            />
            <path d="M0 0 Q-1 5 0 10" stroke="#C8A800" strokeWidth="0.7" fill="none"/>
            {/* Bite mark when eating */}
            {isEating && eatFrame > 0 && (
              <ellipse cx="6" cy="5" rx="3" ry="2" fill="#C8874A" opacity="0.6"/>
            )}
          </g>
        )}
      </g>

      {/* === HEAD === */}
      <circle cx="35" cy="28" r="20" fill="#C8874A"/>
      {/* Left ear */}
      <circle cx="15" cy="28" r="7" fill="#C8874A"/>
      <circle cx="15" cy="28" r="4" fill="#E8A07A"/>
      {/* Right ear */}
      <circle cx="55" cy="28" r="7" fill="#C8874A"/>
      <circle cx="55" cy="28" r="4" fill="#E8A07A"/>
      {/* Face muzzle */}
      <ellipse cx="35" cy="32" rx="13" ry="10" fill="#E8B07A"/>

      {/* === EYES === */}
      {state === S.FLEEING ? (
        /* Scared O_O eyes */
        <>
          <circle cx="28" cy="25" r="5" fill="white"/>
          <circle cx="42" cy="25" r="5" fill="white"/>
          <circle cx="29" cy="26" r="3" fill="#1A0A00"/>
          <circle cx="43" cy="26" r="3" fill="#1A0A00"/>
          <circle cx="30" cy="24.5" r="1.2" fill="white"/>
          <circle cx="44" cy="24.5" r="1.2" fill="white"/>
        </>
      ) : isEating ? (
        /* Happy squint eyes ^^ */
        <>
          <path d="M24 25 Q28 21 32 25" stroke="#2D1B00" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <path d="M38 25 Q42 21 46 25" stroke="#2D1B00" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </>
      ) : (
        /* Normal eyes */
        <>
          <circle cx="28" cy="25" r="4" fill="#2D1B00"/>
          <circle cx="42" cy="25" r="4" fill="#2D1B00"/>
          <circle cx="29.5" cy="23.5" r="1.3" fill="white"/>
          <circle cx="43.5" cy="23.5" r="1.3" fill="white"/>
        </>
      )}

      {/* === NOSE === */}
      <ellipse cx="35" cy="32" rx="3.5" ry="2.5" fill="#8B4513"/>
      <circle cx="33.5" cy="32" r="0.9" fill="#5C2D0A"/>
      <circle cx="36.5" cy="32" r="0.9" fill="#5C2D0A"/>

      {/* === MOUTH === */}
      {state === S.FLEEING ? (
        <path d="M29 38 Q35 34 41 38" stroke="#5C2D0A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      ) : isEating ? (
        /* Chewing mouth — open slightly */
        <>
          <path d="M29 37 Q35 42 41 37" stroke="#5C2D0A" strokeWidth="1.5" fill="#5C2D0A" fillOpacity="0.2" strokeLinecap="round"/>
          {eatFrame > 0 && <ellipse cx="35" cy="38" rx="3" ry="2" fill="#5C2D0A" opacity="0.3"/>}
        </>
      ) : (
        <path d="M29 37 Q35 42 41 37" stroke="#5C2D0A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      )}

      {/* === FRONT LEGS (in front of body) === */}
      {/* Left front leg */}
      <g style={{ transformOrigin: '28px 60px', transform: `rotate(${lf}deg)` }}>
        <rect x="24" y="60" width="8" height="15" rx="4" fill="#B8723A"/>
        <ellipse cx="28" cy="76" rx="6" ry="4" fill="#9A5C2A"/>
      </g>
      {/* Right front leg */}
      <g style={{ transformOrigin: '42px 60px', transform: `rotate(${rf}deg)` }}>
        <rect x="38" y="60" width="8" height="15" rx="4" fill="#B8723A"/>
        <ellipse cx="42" cy="76" rx="6" ry="4" fill="#9A5C2A"/>
      </g>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes tailIdle {
          0%, 100% { transform: rotate(0deg); }
          40%       { transform: rotate(18deg); }
          70%       { transform: rotate(-10deg); }
        }
        @keyframes tailWalk {
          from { transform: rotate(-20deg); }
          to   { transform: rotate(20deg); }
        }
      `}</style>
    </svg>
  );
}
