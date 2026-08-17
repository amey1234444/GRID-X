import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';

import { SectionHeading } from '@/components/marketing/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Pricing' };

const tiers = [
  {
    name: 'Pilot',
    price: 'MVP rollout',
    description: 'One company, one plant and the first cohort of partner units.',
    features: [
      'Users, roles and partner onboarding',
      'Components, drawings and revision control',
      'Jobs, material issue and milestones',
      'Inspection, rework and job closure',
      'Basic invoice and payment status',
      'Partner scorecard and management dashboard',
    ],
  },
  {
    name: 'Network',
    price: 'Full platform',
    highlight: true,
    description: 'The complete blueprint across every module and every partner.',
    features: [
      'Everything in Pilot',
      'Capacity planning and allocation scoring',
      'Material reconciliation and deductions',
      'Logistics, shipments and proof of delivery',
      'Tooling, fixtures, gauges and calibration',
      'All seventeen standard reports with CSV export',
      'IMS integration boundary',
    ],
  },
  {
    name: 'Group',
    price: 'Multi-company',
    description: 'Oswal Engineers, OSWAR Rotocorp and future group companies together.',
    features: [
      'Everything in Network',
      'Multi-company and multi-plant separation',
      'Group-level management dashboards',
      'Consolidated partner concentration analysis',
      'Dedicated audit and retention configuration',
    ],
  },
];

export default function PricingPage(): React.JSX.Element {
  return (
    <div className="container space-y-14 py-20">
      <SectionHeading
        label="Rollout"
        title="Start with the MVP, scale to the whole group"
        description="The blueprint sequences delivery deliberately: prove the controlled flow first, then extend into capacity, logistics, tooling and integration."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={tier.highlight ? 'relative border-primary shadow-elevated' : 'relative'}
          >
            {tier.highlight ? (
              <Badge className="absolute right-6 top-6">Recommended</Badge>
            ) : null}
            <CardContent className="space-y-5 p-6">
              <div>
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{tier.price}</p>
                <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
              </div>
              <ul className="space-y-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={tier.highlight ? 'default' : 'outline'} asChild>
                <Link href="/login">Sign in to GRID-X</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
