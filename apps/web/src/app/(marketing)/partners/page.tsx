import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Smartphone, WifiOff, Wallet, Gauge } from 'lucide-react';

import { SectionHeading } from '@/components/marketing/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Partner network' };

const steps = [
  { title: 'Registration', detail: 'Business, Udyam, GST and bank details captured once.' },
  { title: 'Capability declaration', detail: 'Processes, sizes, tolerances, machines and manpower.' },
  { title: 'Audit', detail: 'Capability, quality system, safety and housekeeping assessment.' },
  { title: 'Trial order', detail: 'A first job with first article approval before scale-up.' },
  { title: 'Approval', detail: 'Trial approved, approved, certified or strategic status.' },
];

const benefits = [
  { icon: Smartphone, title: 'Runs on your phone', detail: 'Install the partner app from the browser — no store, no laptop.' },
  { icon: WifiOff, title: 'Works on weak signal', detail: 'Milestones save locally and sync when the network returns.' },
  { icon: Wallet, title: 'Clear payments', detail: 'See accepted quantity, deductions, invoice status and payment date.' },
  { icon: Gauge, title: 'Know your score', detail: 'Quality, delivery, material and responsiveness KPIs updated monthly.' },
];

export default function PartnersPage(): React.JSX.Element {
  return (
    <div className="space-y-20 py-20">
      <div className="container">
        <SectionHeading
          label="For partner units"
          title="More work, clearer instructions, faster payment"
          description="GRID-X gives every partner unit the same information the head office has: the right drawing, the exact quantity, the inspection result and the payment status."
        />
      </div>

      <div className="container grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((benefit) => (
          <Card key={benefit.title}>
            <CardContent className="space-y-3 p-6">
              <benefit.icon className="h-5 w-5 text-primary" />
              <p className="font-medium">{benefit.title}</p>
              <p className="text-sm text-muted-foreground">{benefit.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div id="onboarding" className="container scroll-mt-24 space-y-8">
        <SectionHeading align="left" title="How onboarding works" />
        <ol className="grid gap-4 md:grid-cols-5">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-xl border bg-card p-5 shadow-subtle">
              <p className="text-xs font-semibold text-primary">Step {index + 1}</p>
              <p className="mt-2 font-medium">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
            </li>
          ))}
        </ol>
      </div>

      <div id="scorecards" className="container scroll-mt-24">
        <div className="rounded-2xl border bg-secondary/40 p-8 text-center">
          <h3 className="text-2xl font-semibold tracking-tight">Already an OSWAR partner?</h3>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Sign in with your registered mobile number to see new jobs, drawings, material and payments.
          </p>
          <Button className="mt-6" size="lg" asChild>
            <Link href="/partner/login">
              Open the partner app <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
