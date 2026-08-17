import { computeScorecardsAction } from '@/app/actions/control';
import { ActionDialog } from '@/components/app/action-dialog';
import { CategoryBarChart } from '@/components/app/charts';
import { DataTable } from '@/components/app/data-table';
import { PageHeader } from '@/components/app/page-header';
import { StatCard } from '@/components/app/stat-card';
import { StatusBadge } from '@/components/app/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, humanise } from '@/lib/format';
import { monthOptions, yearOptions } from '@/lib/options';
import { readParam, type SearchParams } from '@/lib/query';
import { partnerOptions } from '@/lib/reference';
import { apiGet } from '@/lib/session';
import type { LeaderboardResult } from '@/lib/types';

export const metadata = { title: 'Partner scorecards · GRID-X' };

export default async function ScorecardsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const now = new Date();
  const month = Number(readParam(searchParams, 'periodMonth') ?? now.getMonth() + 1);
  const year = Number(readParam(searchParams, 'periodYear') ?? now.getFullYear());

  const [leaderboard, partners] = await Promise.all([
    apiGet<LeaderboardResult>(`/scorecards/leaderboard?periodMonth=${month}&periodYear=${year}`, {
      weights: {},
      categoryMix: {},
      averageScore: 0,
      rows: [],
    }),
    partnerOptions(),
  ]);

  const chartData = leaderboard.rows
    .slice(0, 10)
    .map((row) => ({ partner: row.partnerName, score: row.totalScore }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner scorecards"
        description="Monthly scorecard across quality, delivery, quantity, material discipline, responsiveness and cost."
        actions={
          <ActionDialog
            title="Compute scorecards"
            description="Recomputes the monthly KPI set. Leave the partner blank to compute the whole network."
            triggerLabel="Compute scorecards"
            action={computeScorecardsAction}
            fields={[
              { name: 'periodMonth', label: 'Month', type: 'select', required: true, options: monthOptions(), defaultValue: String(month) },
              { name: 'periodYear', label: 'Year', type: 'select', required: true, options: yearOptions(), defaultValue: String(year) },
              { name: 'partnerId', label: 'Partner (optional)', type: 'select', options: partners, span: 2 },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Partners scored" value={formatNumber(leaderboard.rows.length)} />
        <StatCard label="Average score" value={formatNumber(leaderboard.averageScore, 1)} />
        <StatCard label="Category A" value={formatNumber(leaderboard.categoryMix.A ?? 0)} tone="success" />
        <StatCard
          label="Suspension candidates"
          value={formatNumber(leaderboard.rows.filter((row) => row.recommendation === 'SUSPEND').length)}
          tone="destructive"
        />
      </div>

      {chartData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Top partners</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBarChart data={chartData} xKey="partner" valueKey="score" label="Score" horizontal />
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        columns={[
          { key: 'rank', header: '#', render: (row: LeaderboardResult['rows'][number]) => formatNumber(row.rank) },
          {
            key: 'partner',
            header: 'Partner',
            render: (row: LeaderboardResult['rows'][number]) => (
              <span className="block">
                <span className="block font-medium">{row.partnerName}</span>
                <span className="block text-xs text-muted-foreground">{row.city}</span>
              </span>
            ),
          },
          {
            key: 'score',
            header: 'Score',
            align: 'right',
            render: (row: LeaderboardResult['rows'][number]) => formatNumber(row.totalScore, 1),
          },
          {
            key: 'category',
            header: 'Category',
            render: (row: LeaderboardResult['rows'][number]) => <Badge variant="outline">{row.category}</Badge>,
          },
          {
            key: 'recommendation',
            header: 'Recommendation',
            render: (row: LeaderboardResult['rows'][number]) => <StatusBadge status={row.recommendation} />,
          },
          {
            key: 'jobs',
            header: 'Jobs (on time)',
            align: 'right',
            render: (row: LeaderboardResult['rows'][number]) =>
              `${formatNumber(row.jobsCompleted)} (${formatNumber(row.jobsOnTime)})`,
          },
        ]}
        rows={leaderboard.rows}
        rowHref={(row) => `/app/partners/${row.partnerId}`}
        empty={{
          title: 'No scorecards for this period',
          description: 'Compute the scorecards once jobs have been completed in the period.',
        }}
        caption={`Weights: ${Object.entries(leaderboard.weights)
          .map(([code, weight]) => `${humanise(code)} ${weight}%`)
          .join(' · ')}`}
      />
    </div>
  );
}
