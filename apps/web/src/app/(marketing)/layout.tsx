import { MarketingFooter } from '@/components/marketing/footer';
import { MarketingNav } from '@/components/marketing/nav';
import './marketing.css';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="marketing-shell flex min-h-screen flex-col bg-background">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
