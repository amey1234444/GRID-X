import { cn } from '@/lib/utils';

type AmbientLinesVariant = 'network' | 'routes' | 'contour';

/**
 * Slow, non-interactive line fields used to give each marketing section its
 * own spatial character. The motion is CSS-only and is disabled by the
 * global reduced-motion rule.
 */
export function AmbientLines({
  variant = 'network',
  className,
}: {
  variant?: AmbientLinesVariant;
  className?: string;
}): React.JSX.Element {
  if (variant === 'contour') {
    return (
      <div
        className={cn('ambient-contours pointer-events-none absolute inset-0', className)}
        aria-hidden
      />
    );
  }

  const paths =
    variant === 'routes'
      ? [
          'M-120 760 L300 340 L520 340 L880 -20',
          'M90 840 L430 500 L720 500 L1240 -20',
          'M520 880 L760 640 L1030 640 L1520 150',
          'M-80 470 H250 L420 300 H760 L930 130 H1520',
          'M-80 610 H360 L500 470 H900 L1080 290 H1520',
        ]
      : [
          'M-80 148 H285 L365 228 H680 L770 138 H1520',
          'M-80 520 H250 L330 440 H620 L710 530 H1040 L1120 450 H1520',
          'M210 -80 V190 L300 280 V880',
          'M620 -80 V210 L700 290 V610 L780 690 V880',
          'M1110 -80 V170 L1030 250 V560 L1115 645 V880',
          'M-80 336 H430 L500 266 H920 L1010 356 H1520',
        ];

  return (
    <svg
      viewBox="0 0 1440 800"
      preserveAspectRatio="none"
      className={cn('ambient-lines pointer-events-none absolute inset-0 h-full w-full', className)}
      aria-hidden
    >
      {paths.map((path, index) => (
        <path
          key={path}
          d={path}
          className={cn(
            'ambient-line',
            index === 1 && 'ambient-line--signal',
            index === 3 && 'ambient-line--reverse',
          )}
        />
      ))}
      <g className="ambient-nodes">
        <circle cx="300" cy="280" r="2.5" />
        <circle cx="700" cy="290" r="2.5" />
        <circle cx="1030" cy="250" r="2.5" />
        <circle cx="1115" cy="645" r="2.5" />
      </g>
    </svg>
  );
}
