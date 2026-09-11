'use client';

import { useEffect, useRef } from 'react';

/** CSS motion stays asleep outside the viewport and in background tabs. */
export function AmbientField({ children }: { children: React.ReactNode }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let visible = false;
    const update = (): void => {
      element.dataset.running = String(visible && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <div ref={ref} className="ambient-field" data-running="false" aria-hidden="true">
      <div className="ambient-field__light ambient-field__light--one" />
      <div className="ambient-field__light ambient-field__light--two" />
      {children}
    </div>
  );
}
