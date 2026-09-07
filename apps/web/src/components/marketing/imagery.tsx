import Image from 'next/image';

export type ImageKind = 'network' | 'workshop' | 'precision';
export const marketingImages = {
  network: {
    src: '/media/marketing/network-sculpture.webp',
    alt: 'Sculptural silver modules joined by blue glass and copper connections.',
  },
  workshop: {
    src: '/media/marketing/partner-workshop.webp',
    alt: 'Illustrative workshop scene with a manufacturing partner reviewing a tablet beside a CNC machine.',
  },
  precision: {
    src: '/media/marketing/precision-detail.webp',
    alt: 'Precision machined components and a caliper on a light workbench.',
  },
};

export function MarketingImage({
  kind,
  priority = false,
  caption,
  className = '',
}: {
  kind: ImageKind;
  priority?: boolean;
  caption?: string;
  className?: string;
}): React.JSX.Element {
  const asset = marketingImages[kind];
  return (
    <figure className={`m-photograph m-photograph-${kind} ${className}`}>
      <Image
        src={asset.src}
        alt={asset.alt}
        width={1536}
        height={1024}
        priority={priority}
        sizes="(max-width: 760px) 100vw, (max-width: 1100px) 55vw, 640px"
      />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
