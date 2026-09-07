import Link from 'next/link';
import { MotionControl } from './motion-lines';
import { Wordmark } from '@/components/brand';

const columns = [
  {
    title: 'Platform',
    links: [
      ['Product overview', '/platform'],
      ['Solutions', '/solutions'],
      ['Integrations', '/integrations'],
      ['Security', '/security'],
    ],
  },
  {
    title: 'Network',
    links: [
      ['For partners', '/partners'],
      ['Onboarding', '/partners#onboarding'],
      ['Scorecards', '/partners#scorecards'],
      ['Rollout', '/pricing'],
    ],
  },
  {
    title: 'Resources',
    links: [
      ['All guides', '/resources'],
      ['Drawing control', '/resources/drawing-control'],
      ['Material reconciliation', '/resources/material-reconciliation'],
      ['Partner log in', '/partner/login'],
    ],
  },
];
export function MarketingFooter(): React.JSX.Element {
  return (
    <footer className="m-footer">
      <div className="m-container">
        <div className="m-footer-top">
          <div className="m-footer-brand">
            <Wordmark compact />
            <p>A shared operating record for distributed manufacturing.</p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="m-footer-bottom">
          <p>© {new Date().getFullYear()} OSWAR Rotocorp</p>
          <MotionControl />
        </div>
      </div>
    </footer>
  );
}
