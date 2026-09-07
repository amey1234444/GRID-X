import { MarketingImage, type ImageKind } from '@/components/marketing/imagery';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ClosingCTA, LinkCards, SectionHeading, TextLink } from '@/components/marketing/editorial';
import { getGuide, guides } from '@/components/marketing/guides';

export const dynamicParams = false;
export function generateStaticParams(): { slug: string }[] {
  return guides.map((guide) => ({ slug: guide.slug }));
}
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const guide = getGuide(params.slug);
  return guide
    ? { title: guide.title, description: guide.description }
    : { title: 'Guide not found' };
}
export default function GuidePage({ params }: { params: { slug: string } }): React.JSX.Element {
  const guide = getGuide(params.slug);
  if (!guide) notFound();
  return (
    <>
      <header className="m-hero">
        <div className="m-container">
          <div className="m-article-header">
            <p className="m-eyebrow">Field guide / {guide.category}</p>
            <h1>{guide.title}</h1>
            <p className="m-hero-description">{guide.description}</p>
            <div className="m-article-meta">
              <TextLink href="/resources">All guides</TextLink>
              <span>GRID-X · Practical workflow guide</span>
            </div>
          </div>
          <MarketingImage
            kind={
              guide.slug === 'partner-onboarding'
                ? 'workshop'
                : guide.slug === 'drawing-control'
                  ? 'precision'
                  : 'network'
            }
            priority
            className="m-article-cover"
          />
        </div>
      </header>
      <div className="m-section">
        <div className="m-container m-article-layout">
          <nav className="m-article-toc" aria-label="In this guide">
            <p className="m-eyebrow">In this guide</p>
            {guide.sections.map((section) => (
              <a href={`#${section.id}`} key={section.id}>
                {section.title}
              </a>
            ))}
          </nav>
          <article className="m-article-body">
            {guide.sections.map((section) => (
              <section id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.points && (
                  <ul>
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <div className="m-article-callout">
              <p>Explore this workflow in the product.</p>
              <TextLink href={guide.related}>See the related GRID-X capability</TextLink>
            </div>
          </article>
        </div>
      </div>
      <section className="m-section">
        <div className="m-container">
          <SectionHeading label="Keep reading" title="Follow the connected record." />
          <LinkCards
            items={guides
              .filter((item) => item.slug !== guide.slug)
              .map((item) => ({
                label: item.category,
                title: item.title,
                detail: item.description,
                href: `/resources/${item.slug}`,
                image: (item.slug === 'partner-onboarding'
                  ? 'workshop'
                  : item.slug === 'drawing-control'
                    ? 'precision'
                    : 'network') as ImageKind,
              }))}
          />
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
