import { MarketingFooter } from '@/components/marketing/footer';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingMotion } from '@/components/marketing/motion-lines';
import './marketing.css';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <MarketingMotion>
      <a href="#marketing-content" className="m-skip">
        Skip to content
      </a>
      <MarketingNav />
      <main id="marketing-content">{children}</main>
      <MarketingFooter />
    </MarketingMotion>
  );
}
