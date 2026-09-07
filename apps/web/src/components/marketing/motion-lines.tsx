'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';

const MotionContext = createContext({ paused: false, reduced: false, toggle: () => {} });

export function MarketingMotion({ children }: { children: ReactNode }): React.JSX.Element {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return (
    <MotionContext.Provider value={{ paused, reduced, toggle: () => setPaused((value) => !value) }}>
      <div className="marketing-site" data-motion={paused || reduced ? 'paused' : 'running'}>
        {children}
      </div>
    </MotionContext.Provider>
  );
}

export function MotionControl(): React.JSX.Element {
  const { paused, reduced, toggle } = useContext(MotionContext);
  return (
    <button
      className="m-motion-control"
      onClick={toggle}
      disabled={reduced}
      aria-pressed={paused || reduced}
    >
      {paused || reduced ? (
        <Play size={14} aria-hidden="true" />
      ) : (
        <Pause size={14} aria-hidden="true" />
      )}
      {reduced
        ? 'Reduced motion enabled'
        : paused
          ? 'Play background motion'
          : 'Pause background motion'}
    </button>
  );
}

export function MotionLines(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (ref.current) observer.observe(ref.current);
    const update = () => setActiveTab(document.visibilityState === 'visible');
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return (
    <div
      ref={ref}
      className="m-motion-lines"
      data-visible={visible && activeTab}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1440 800" fill="none" preserveAspectRatio="xMidYMid slice">
        {[
          'M-120 640 H480 Q540 640 600 580 L1040 140 Q1100 80 1160 80 H1560',
          'M-120 680 H490 Q550 680 610 620 L1050 180 Q1110 120 1170 120 H1560',
          'M-120 720 H500 Q560 720 620 660 L1060 220 Q1120 160 1180 160 H1560',
          'M-120 760 H510 Q570 760 630 700 L1070 260 Q1130 200 1190 200 H1560',
        ].map((d, index) => (
          <g key={d} className={index % 2 ? 'm-line-copper' : 'm-line-blue'}>
            <path d={d} className="m-line-track" />
            <path
              d={d}
              className="m-line-signal"
              pathLength="100"
              style={{ animationDelay: `${index * -4}s` }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
