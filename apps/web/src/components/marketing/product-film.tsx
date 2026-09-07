'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Pause, Play } from 'lucide-react';

export function ProductFilm({
  eyebrow,
  title,
  description,
  href = '/platform',
  linkLabel = 'Explore the platform',
  id,
  as: Heading = 'h2',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  compact?: boolean;
  id?: string;
  as?: 'h1' | 'h2';
}): React.JSX.Element {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const userPaused = useRef(false);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const reconcile = (): void => {
      if (!visible || document.hidden || motion.matches || userPaused.current) element.pause();
      else void element.play().catch(() => setPlaying(false));
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        reconcile();
      },
      { threshold: 0.2 },
    );
    observer.observe(element);
    document.addEventListener('visibilitychange', reconcile);
    motion.addEventListener('change', reconcile);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', reconcile);
      motion.removeEventListener('change', reconcile);
      element.pause();
    };
  }, []);
  const toggle = (): void => {
    const element = video.current;
    if (!element) return;
    if (element.paused) {
      userPaused.current = false;
      void element.play().catch(() => setPlaying(false));
    } else {
      userPaused.current = true;
      element.pause();
    }
  };
  return (
    <section className="m-section" id={id}>
      <div className="m-container m-film-layout">
        <div>
          <p className="m-eyebrow">{eyebrow}</p>
          <Heading>{title}</Heading>
          {description && <p>{description}</p>}
          <Link href={href} className="m-text-link">
            {linkLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <figure>
          <div className="m-film-frame">
            <video
              ref={video}
              muted
              loop
              playsInline
              preload="none"
              poster="/media/gridx-control-network-poster.webp?v=3"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setUnavailable(true)}
              aria-label="GRID-X manufacturing network illustration"
            >
              <source src="/media/gridx-control-network.mp4?v=3" type="video/mp4" />
            </video>
            {!unavailable && (
              <button
                className="m-film-control"
                type="button"
                onClick={toggle}
                aria-label={playing ? 'Pause network film' : 'Play network film'}
              >
                {playing ? (
                  <Pause size={15} aria-hidden="true" />
                ) : (
                  <Play size={15} aria-hidden="true" />
                )}
                {playing ? 'Pause' : 'Play'}
              </button>
            )}
          </div>
          <figcaption className="m-film-caption">
            <span>Allocation → engineering → material → quality → payment</span>
            <span>Product film</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
