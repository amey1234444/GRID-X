import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { EmptyState } from '@/components/app/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CategoryBarChart } from '@/components/app/charts';
import { formatNumber, humanise } from '@/lib/format';
import { apiGet, currentUser } from '@/lib/session';
import type { ScorecardRow } from '@/lib/types';

export const metadata = { title: 'Scorecard · GRID-X Partner' };

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export default async function PartnerScorecardPage(): Promise<React.JSX.Element> {
  const user = await currentUser();
  const hindi = user?.language === 'HI';
  const scores = user?.partnerId
    ? await apiGet<ScorecardRow[]>(`/scorecards/partners/${user.partnerId}`, [])
    : [];

  const latest = scores[0];
  const trend = [...scores]
    .reverse()
    .map((score) => ({ label: `${MONTHS[score.periodMonth - 1]} ${String(score.periodYear).slice(2)}`, value: score.totalScore }));

  return (
    <div className="space-y-5">
      <PageHeader
        icon="Gauge"
        title={hindi ? 'स्कोरकार्ड' : 'Scorecard'}
        description={
          hindi
            ? 'हर महीने गुणवत्ता, समय, माल और सहयोग पर आपका स्कोर बनता है। ज़्यादा स्कोर पर ज़्यादा काम मिलता है।'
            : 'Your monthly score across quality, delivery, material discipline and responsiveness. Higher scores earn priority allocation.'
        }
        actions={
          latest ? (
            <Badge variant="secondary">
              {humanise(latest.category)} · {formatNumber(latest.totalScore, 1)}
            </Badge>
          ) : null
        }
      />

      {!latest ? (
        <EmptyState
          title={hindi ? 'स्कोर तैयार नहीं' : 'Scorecard not computed yet'}
          description={
            hindi
              ? 'पहला महीना पूरा होने पर स्कोर दिखेगा।'
              : 'Your scorecard appears once OSWAR computes the first monthly period.'
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={hindi ? 'कुल स्कोर' : 'Total score'} value={formatNumber(latest.totalScore, 1)} />
            <StatCard label={hindi ? 'श्रेणी' : 'Category'} value={humanise(latest.category)} />
            <StatCard label={hindi ? 'पूरे काम' : 'Jobs completed'} value={formatNumber(latest.jobsCompleted)} />
            <StatCard
              label={hindi ? 'समय पर' : 'On time'}
              value={`${formatNumber(latest.jobsOnTime)} / ${formatNumber(latest.jobsCompleted)}`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{hindi ? 'मापदंड' : 'KPI breakdown'}</CardTitle>
              <CardDescription>
                {hindi ? 'हर मापदंड का भार और आपका अंक।' : 'Weight and achieved value for every scoring parameter.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {latest.kpis.map((kpi) => (
                <div key={kpi.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{humanise(kpi.code)}</span>
                    <span className="text-muted-foreground">
                      {formatNumber(kpi.value, 1)} / {formatNumber(kpi.weight)} ({formatNumber(kpi.weighted, 1)})
                    </span>
                  </div>
                  <Progress value={kpi.weight === 0 ? 0 : Math.min(100, (kpi.weighted / kpi.weight) * 100)} />
                </div>
              ))}
            </CardContent>
          </Card>

          {trend.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>{hindi ? 'स्कोर का रुझान' : 'Score trend'}</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryBarChart data={trend} xKey="label" valueKey="value" label={hindi ? 'स्कोर' : 'Score'} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{hindi ? 'सिफ़ारिश' : 'Recommendation'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{humanise(latest.recommendation)}</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
