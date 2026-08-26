import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Reveal, StaggerItem } from '@/components/motion';
import {
  Card,
  Divider,
  EmptyState,
  ErrorState,
  FactList,
  LoadingState,
  ProgressBar,
  SectionLabel,
  StatTile,
  StatusPill,
} from '@/components/ui';
import { useAuth } from '@/context/auth';
import type { InvoiceRow, Paginated, ScorecardRow } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import {
  Refresher,
  Screen,
  ScreenHeader,
  formatDate,
  formatMoney,
  screenStyles,
} from '@/screens/shared';
import { colors, humanise, spacing, typography } from '@/theme';

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

/** Invoice ledger with the payment stage each one sits in. */
export function PartnerInvoicesScreen(): React.JSX.Element {
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<InvoiceRow>>(
    '/commercials/invoices?pageSize=100',
  );
  useFocusRefresh(refresh);

  if (loading && !data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Payments" />
          <LoadingState />
        </View>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={refresh} />
      </Screen>
    );
  }

  const rows = data?.data ?? [];
  const outstanding = rows
    .filter((row) => row.paidAt === null)
    .reduce((total, row) => total + row.netAmount, 0);

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={screenStyles.list}
        refreshControl={<Refresher refreshing={refreshing} onRefresh={refresh} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <ScreenHeader title="Payments" subtitle={`${formatMoney(outstanding)} outstanding`} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No invoice yet"
            description="Invoices raised against your completed jobs appear here with their approval stage."
          />
        }
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <Card>
              <View style={screenStyles.rowTop}>
                <View style={styles.head}>
                  <Text style={typography.cardTitle}>{item.invoiceNumber}</Text>
                  <Text style={typography.caption}>
                    {item.partnerInvoiceNo ? `Your ref ${item.partnerInvoiceNo} · ` : ''}
                    {formatDate(item.invoiceDate)}
                  </Text>
                </View>
                <StatusPill status={item.status} />
              </View>
              <Divider />
              <FactList
                facts={[
                  { label: 'Basic', value: formatMoney(item.basicAmount) },
                  {
                    label: 'Deductions',
                    value: formatMoney(item.deductionAmount),
                    tone: item.deductionAmount > 0 ? 'destructive' : undefined,
                  },
                  { label: 'Net payable', value: formatMoney(item.netAmount) },
                  { label: 'Paid on', value: item.paidAt ? formatDate(item.paidAt) : 'Pending' },
                ]}
              />
              {item.holdReason ? (
                <Text style={[typography.small, styles.hold]}>On hold: {item.holdReason}</Text>
              ) : null}
            </Card>
          </StaggerItem>
        )}
      />
    </Screen>
  );
}

/** Monthly scorecard: the rating that decides how much work is allocated next. */
export function PartnerScorecardScreen(): React.JSX.Element {
  const { user } = useAuth();
  const partnerId = user?.partnerId ?? '';
  const { data, loading, refreshing, error, refresh } = useApiQuery<ScorecardRow[]>(
    partnerId ? `/scorecards/partners/${partnerId}` : null,
  );
  useFocusRefresh(refresh);

  if (loading && !data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Scorecard" />
          <LoadingState />
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <ErrorState message={error ?? 'Scorecard unavailable'} onRetry={refresh} />
      </Screen>
    );
  }

  const [latest, ...history] = data;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={screenStyles.list}
        refreshControl={<Refresher refreshing={refreshing} onRefresh={refresh} />}
      >
        <ScreenHeader title="Scorecard" subtitle="Rated monthly on quality, delivery and cost" />

        {!latest ? (
          <EmptyState
            icon="stats-chart-outline"
            title="No scorecard yet"
            description="Your first scorecard is computed after a month of completed jobs."
          />
        ) : (
          <>
            <Reveal>
              <Card>
                <View style={screenStyles.rowTop}>
                  <View style={styles.head}>
                    <Text style={typography.label}>
                      {MONTHS[latest.periodMonth - 1]} {latest.periodYear}
                    </Text>
                    <Text style={styles.score}>{latest.totalScore.toFixed(1)}</Text>
                  </View>
                  <StatusPill status={latest.category} />
                </View>
                <Divider />
                <Text style={typography.small}>{humanise(latest.recommendation)}</Text>
              </Card>
            </Reveal>

            <View style={screenStyles.section}>
              <View style={screenStyles.statGrid}>
                <StatTile label="Jobs completed" value={latest.jobsCompleted} />
                <StatTile label="On time" value={latest.jobsOnTime} tone="success" />
                <StatTile label="Accepted" value={latest.quantityAccepted} />
                <StatTile
                  label="Rejected"
                  value={latest.quantityRejected}
                  tone={latest.quantityRejected > 0 ? 'destructive' : 'default'}
                />
              </View>
            </View>

            <View style={screenStyles.section}>
              <SectionLabel>How it was scored</SectionLabel>
              <Card>
                {latest.kpis.map((kpi, index) => (
                  <View key={kpi.id}>
                    {index > 0 ? <Divider /> : null}
                    <View style={styles.kpi}>
                      <View style={screenStyles.rowTop}>
                        <Text style={typography.body}>{humanise(kpi.code)}</Text>
                        <Text style={typography.body}>{kpi.value.toFixed(1)}</Text>
                      </View>
                      <ProgressBar value={kpi.value} total={100} tone="info" />
                      <Text style={typography.caption}>
                        Weight {kpi.weight}% · contributes {kpi.weighted.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            </View>

            {history.length > 0 ? (
              <View style={screenStyles.section}>
                <SectionLabel>History</SectionLabel>
                <Card>
                  {history.map((row, index) => (
                    <View key={row.id}>
                      {index > 0 ? <Divider /> : null}
                      <View style={screenStyles.rowTop}>
                        <Text style={typography.body}>
                          {MONTHS[row.periodMonth - 1]} {row.periodYear}
                        </Text>
                        <View style={styles.historyMeta}>
                          <Text style={typography.body}>{row.totalScore.toFixed(1)}</Text>
                          <StatusPill status={row.category} />
                        </View>
                      </View>
                    </View>
                  ))}
                </Card>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flex: 1, gap: 2 },
  hold: { marginTop: spacing.md, color: colors.destructive },
  score: {
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: -1.5,
    color: colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  kpi: { gap: spacing.sm },
  historyMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
