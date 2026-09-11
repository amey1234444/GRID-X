'use client';

import Image from 'next/image';
import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const FILM = '/media/gridx-control-network.mp4?v=3';
const POSTER = '/media/gridx-control-network-poster.webp?v=3';

/** A real moving scene, with an always-present still behind the video. */
export function CinematicBackground({
  priority = false,
  composition = 'wide',
}: {
  priority?: boolean;
  composition?: 'wide' | 'detail';
}): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = root.current;
    const media = video.current;
    if (!element || !media) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    let inView = false;
    let active = true;

    const sync = (): void => {
      const allowed = !preference.matches && !connection?.saveData && !failed;
      setAvailable(allowed);
      if (!allowed || !inView || document.hidden || paused) {
        media.pause();
        element.dataset.running = 'false';
        if (!allowed) {
          setPlaying(false);
          // Stop both decoding and network activity when motion is disabled.
          if (media.hasAttribute('src')) {
            media.removeAttribute('src');
            media.load();
          }
        }
        return;
      }
      if (!media.hasAttribute('src')) media.src = FILM;
      void media.play().catch((error: DOMException) => {
        if (active && error.name !== 'AbortError') {
          setPaused(true);
          setPlaying(false);
        }
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0.05 },
    );
    observer.observe(element);
    preference.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      active = false;
      observer.disconnect();
      preference.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
      media.pause();
    };
  }, [paused, failed]);

  return (
    <div
      ref={root}
      className={`cinematic-background cinematic-background--${composition}`}
      data-running="false"
    >
      <div className="cinematic-background__scene" aria-hidden="true">
        <Image
          src={POSTER}
          alt=""
          fill
          priority={priority}
          sizes="100vw"
          className="cinematic-background__poster"
        />
        <video
          ref={video}
          className="cinematic-background__video"
          data-visible={playing}
          muted
          loop
          playsInline
          preload="none"
          tabIndex={-1}
          onPlaying={() => {
            setPlaying(true);
            if (root.current) root.current.dataset.running = 'true';
          }}
          onPause={() => {
            if (root.current) root.current.dataset.running = 'false';
          }}
          onError={() => {
            setFailed(true);
            setPlaying(false);
          }}
        />
        <div className="cinematic-background__veil" />
        <div className="cinematic-background__grain" />
        <div className="cinematic-background__light" />
      </div>
      {available && (
        <button
          type="button"
          className="cinematic-background__control"
          aria-label={paused ? 'Play background animation' : 'Pause background animation'}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
