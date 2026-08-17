import type { Metadata } from 'next';
import { KeyRound, Lock, ScrollText, ServerCog, ShieldCheck, UserCog } from 'lucide-react';

import { SectionHeading } from '@/components/marketing/section';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Security' };

const controls = [
  {
    icon: UserCog,
    title: 'Role-based access control',
    points: [
      'Thirteen roles from Group Admin to Partner Worker.',
      'Every endpoint is permission-guarded, not screen-hidden.',
      'Partner users only ever see their own unit&apos;s data.',
    ],
  },
  {
    icon: KeyRound,
    title: 'Authentication',
    points: [
      'Argon2id password hashing.',
      'Short-lived access tokens with rotating refresh tokens.',
      'OTP sign-in for partner phones and 2FA for senior roles.',
    ],
  },
  {
    icon: Lock,
    title: 'Drawing protection',
    points: [
      'Only released revisions are accessible.',
      'Time-bound, job-scoped, revocable access grants.',
      'Watermarked view-only mode and a complete access log.',
    ],
  },
  {
    icon: ScrollText,
    title: 'Audit trail',
    points: [
      'Immutable audit log of every state change.',
      'Quality and financial records are never silently deleted.',
      'Who did what, when, from which device and IP.',
    ],
  },
  {
    icon: ServerCog,
    title: 'Infrastructure',
    points: [
      'PostgreSQL with daily backups and a tested restore path.',
      'Object storage with versioning and signed, expiring URLs.',
      'Structured logs and error monitoring in production.',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Data boundaries',
    points: [
      'Multi-company and multi-plant separation.',
      'IMS remains the owner of internal inventory and manufacturing.',
      'GRID-X owns the external distributed manufacturing record.',
    ],
  },
];

export default function SecurityPage(): React.JSX.Element {
  return (
    <div className="container space-y-14 py-20">
      <SectionHeading
        label="Security"
        title="Controlled access to drawings, quality and money"
        description="GRID-X handles intellectual property, quality decisions and payments. Every one of those is protected by design, not by convention."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {controls.map((control) => (
          <Card key={control.title}>
            <CardContent className="space-y-3 p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <control.icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold">{control.title}</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {control.points.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
