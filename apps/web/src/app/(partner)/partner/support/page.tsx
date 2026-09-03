import { CAPACITY_PERIOD_TYPES } from '@gridx/shared';

import { declareCapacityAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DetailList } from '@/components/app/detail-list';
import { optionsFrom } from '@/lib/options';
import { processOptions } from '@/lib/reference';
import { currentUser } from '@/lib/session';

export const metadata = { title: 'Support · GRID-X Partner' };

export default async function PartnerSupportPage(): Promise<React.JSX.Element> {
  const [user, processes] = await Promise.all([currentUser(), processOptions()]);
  const hindi = user?.language === 'HI';

  return (
    <div className="space-y-5">
      <PageHeader
        icon="LifeBuoy"
        title={hindi ? 'मदद' : 'Support'}
        description={
          hindi
            ? 'OSWAR टीम से संपर्क, क्षमता की जानकारी और ऐप के नियम।'
            : 'Reach the OSWAR team, declare your monthly capacity and review how the platform works.'
        }
        actions={
          <ActionDialog
            title={hindi ? 'क्षमता बताएं' : 'Declare capacity'}
            description={
              hindi
                ? 'हर महीने अपनी उपलब्ध क्षमता बताएं ताकि सही काम मिले।'
                : 'Declare available machine hours each month so OSWAR allocates work you can absorb.'
            }
            triggerLabel={hindi ? 'क्षमता बताएं' : 'Declare capacity'}
            submitLabel={hindi ? 'भेजें' : 'Submit'}
            action={declareCapacityAction}
            hidden={{ partnerId: user?.partnerId ?? undefined }}
            fields={[
              {
                name: 'processCode',
                label: hindi ? 'प्रक्रिया' : 'Process',
                type: 'select',
                required: true,
                options: processes,
                span: 2,
              },
              {
                name: 'periodType',
                label: hindi ? 'अवधि' : 'Period',
                type: 'select',
                options: optionsFrom(CAPACITY_PERIOD_TYPES),
                defaultValue: 'MONTHLY',
              },
              {
                name: 'availableHours',
                label: hindi ? 'उपलब्ध घंटे' : 'Available hours',
                type: 'number',
                required: true,
              },
              {
                name: 'periodStart',
                label: hindi ? 'शुरू' : 'Period start',
                type: 'date',
                required: true,
              },
              {
                name: 'periodEnd',
                label: hindi ? 'अंत' : 'Period end',
                type: 'date',
                required: true,
              },
              {
                name: 'availableWorkers',
                label: hindi ? 'कारीगर' : 'Available workers',
                type: 'number',
                defaultValue: '0',
              },
              {
                name: 'availableMachines',
                label: hindi ? 'मशीनें' : 'Available machines',
                type: 'number',
                defaultValue: '0',
              },
              {
                name: 'maintenanceShutdownHours',
                label: hindi ? 'मेंटेनेंस घंटे' : 'Maintenance shutdown (h)',
                type: 'number',
                defaultValue: '0',
              },
              {
                name: 'expectedBottleneck',
                label: hindi ? 'दिक्कत' : 'Expected bottleneck',
                type: 'textarea',
                span: 2,
              },
            ]}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{hindi ? 'आपका खाता' : 'Your account'}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList
            items={[
              { label: hindi ? 'नाम' : 'Name', value: user?.name ?? '—' },
              { label: hindi ? 'फ़र्म' : 'Firm', value: user?.partnerName ?? '—' },
              { label: hindi ? 'फ़ोन' : 'Phone', value: user?.phone ?? '—' },
              { label: hindi ? 'ईमेल' : 'Email', value: user?.email ?? '—' },
              { label: hindi ? 'भूमिका' : 'Role', value: user?.roleCode.replace(/_/g, ' ') ?? '—' },
              { label: hindi ? 'भाषा' : 'Language', value: user?.language === 'HI' ? 'हिन्दी' : 'English' },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{hindi ? 'ऐप कैसे चलता है' : 'How the app works'}</CardTitle>
          <CardDescription>
            {hindi ? 'कम नेटवर्क में भी काम करने के लिए बनाया गया।' : 'Built for low-bandwidth shop floors.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {hindi
              ? 'पहले खोले गए काम बिना नेटवर्क भी दिखते हैं और प्रगति अपडेट फ़ोन में सुरक्षित रहते हैं।'
              : 'Jobs you have already opened stay visible without a connection, and progress updates are stored on your phone.'}
          </p>
          <p>
            {hindi
              ? 'नेटवर्क आने पर अपडेट अपने आप भेजे जाते हैं — दो बार दर्ज नहीं होते।'
              : 'Queued updates sync automatically when the connection returns and are never recorded twice.'}
          </p>
          <p>
            {hindi
              ? 'ड्रॉइंग सिर्फ़ ऐप में देखी जा सकती है; हर बार देखने का रिकॉर्ड रखा जाता है।'
              : 'Drawings can only be opened inside the app and every access is logged for controlled-document compliance.'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{hindi ? 'संपर्क' : 'Contact OSWAR'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            {hindi ? 'काम से जुड़ा सवाल' : 'Job-specific question'} —{' '}
            {hindi
              ? 'काम की स्क्रीन पर "सवाल" बटन दबाएं, जवाब रिकॉर्ड के साथ मिलेगा।'
              : 'use “Ask a question” on the job so the answer is recorded against the job.'}
          </p>
          <p>partners@oswar.example · +91 20 0000 0000</p>
        </CardContent>
      </Card>
    </div>
  );
}
