import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Card, EmptyState, ErrorState, LoadingState, StatTile, StatusPill } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useApiQuery } from '@/lib/use-api';
import type { InvoiceRow, JobRow, Paginated, PartnerDashboard } from '@/lib/types';
import { colors, spacing, typography, humanise } from '@/theme';
import { formatDate, formatMoney, ScreenHeader } from './shared';

export type PartnerStackParamList = {
  PartnerJobs: undefined;
  PartnerJobDetail: { id: string; jobNumber: string };
};

function JobCard({ job, onPress }: { job: JobRow; onPress?: () => void }): React.JSX.Element {
  return (
    <Card onPress={onPress}>
      <View style={styles.rowTop}>
        <Text style={typography.heading} numberOfLines={1}>
          {job.jobNumber}
        </Text>
        <StatusPill status={job.isOverdue ? 'OVERDUE' : job.status} />
      </View>
      <Text style={[typography.caption, { marginTop: 4 }]} numberOfLines={1}>
        {job.componentCode} · {job.componentName}
      </Text>
      <View style={styles.rowMeta}>
        <Text style={typography.caption}>Qty {job.quantity}</Text>
        <Text style={typography.caption}>Due {formatDate(job.dueDate)}</Text>
        <Text style={typography.caption}>{formatMoney(job.value)}</Text>
      </View>
    </Card>
  );
}

export function PartnerHomeScreen(): React.JSX.Element {
  const { user } = useAuth();
  const { data, loading, refreshing, error, refresh } = useApiQuery<PartnerDashboard>('/dashboards/partner');

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? 'Could not load'} onRetry={refresh} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <ScreenHeader
          title={data.businessName || user?.partnerName || 'Your unit'}
          subtitle={`Category ${data.category}${data.score !== null ? ` · Score ${data.score}` : ''}`}
        />
        <View style={styles.statGrid}>
          <StatTile label="New jobs" value={data.newJobs} tone={data.newJobs > 0 ? 'warning' : 'default'} />
          <StatTile label="Active jobs" value={data.activeJobs} />
          <StatTile
            label="Material to acknowledge"
            value={data.awaitingMaterialAck}
            tone={data.awaitingMaterialAck > 0 ? 'warning' : 'default'}
          />
          <StatTile label="Pending inspections" value={data.pendingInspections} />
          <StatTile label="Rework open" value={data.reworkOpen} tone={data.reworkOpen > 0 ? 'destructive' : 'default'} />
          <StatTile label="Invoices pending" value={data.invoicesPending} />
        </View>
        <Text style={[typography.heading, { marginTop: spacing.lg, marginBottom: spacing.md }]}>
          Current jobs
        </Text>
        {data.jobs.length === 0 ? (
          <EmptyState title="No jobs yet" description="Jobs allocated to your unit appear here." />
        ) : (
          <View style={{ gap: spacing.md }}>
            {data.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function PartnerJobsScreen({
  navigation,
}: NativeStackScreenProps<PartnerStackParamList, 'PartnerJobs'>): React.JSX.Element {
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<JobRow>>(
    '/jobs?page=1&pageSize=50',
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={data?.data ?? []}
        keyExtractor={(row) => row.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={<ScreenHeader title="Jobs" subtitle="Work allocated to your unit" />}
        ListEmptyComponent={<EmptyState title="No jobs" description="Jobs allocated to your unit appear here." />}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => navigation.navigate('PartnerJobDetail', { id: item.id, jobNumber: item.jobNumber })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </SafeAreaView>
  );
}

export function PartnerJobDetailScreen({
  route,
}: NativeStackScreenProps<PartnerStackParamList, 'PartnerJobDetail'>): React.JSX.Element {
  const { data, loading, error, refresh } = useApiQuery<JobRow>(`/jobs/${route.params.id}`);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? 'Not found'} onRetry={refresh} />;

  const facts: { label: string; value: string }[] = [
    { label: 'Component', value: `${data.componentCode} · ${data.componentName}` },
    { label: 'Quantity', value: String(data.quantity) },
    { label: 'Accepted', value: String(data.acceptedQuantity) },
    { label: 'Rejected', value: String(data.rejectedQuantity) },
    { label: 'Priority', value: humanise(data.priority) },
    { label: 'Criticality', value: humanise(data.criticality) },
    { label: 'Due date', value: formatDate(data.dueDate) },
    { label: 'Rate', value: formatMoney(data.rate) },
    { label: 'Value', value: formatMoney(data.value) },
    { label: 'Latest milestone', value: data.latestMilestone ? humanise(data.latestMilestone) : '—' },
  ];

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.list}>
      <View style={styles.rowTop}>
        <Text style={typography.title}>{data.jobNumber}</Text>
        <StatusPill status={data.isOverdue ? 'OVERDUE' : data.status} />
      </View>
      {data.delayDays > 0 ? (
        <Card style={{ marginTop: spacing.lg, borderColor: colors.destructive }}>
          <Text style={[typography.heading, { color: colors.destructive }]}>
            {data.delayDays} day{data.delayDays === 1 ? '' : 's'} delayed
          </Text>
        </Card>
      ) : null}
      <Card style={{ marginTop: spacing.lg }}>
        {facts.map((fact, index) => (
          <View key={fact.label} style={[styles.factRow, index > 0 && styles.factRowBorder]}>
            <Text style={typography.caption}>{fact.label}</Text>
            <Text style={[typography.body, { flexShrink: 1, textAlign: 'right' }]} numberOfLines={2}>
              {fact.value}
            </Text>
          </View>
        ))}
      </Card>
      <Text style={[typography.caption, { marginTop: spacing.lg, textAlign: 'center' }]}>
        Update milestones and upload evidence from the partner web app.
      </Text>
    </ScrollView>
  );
}

export function PartnerInvoicesScreen(): React.JSX.Element {
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<InvoiceRow>>(
    '/commercials/invoices?page=1&pageSize=50',
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={data?.data ?? []}
        keyExtractor={(row) => row.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={<ScreenHeader title="Invoices" subtitle="Billing and payment status" />}
        ListEmptyComponent={
          <EmptyState title="No invoices" description="Invoices raised for accepted work appear here." />
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.rowTop}>
              <Text style={typography.heading}>{item.invoiceNumber}</Text>
              <StatusPill status={item.status} />
            </View>
            <View style={styles.rowMeta}>
              <Text style={typography.caption}>{formatDate(item.invoiceDate)}</Text>
              <Text style={typography.body}>{formatMoney(item.netAmount)}</Text>
            </View>
            {item.holdReason ? (
              <Text style={[typography.caption, { color: colors.warning, marginTop: spacing.sm }]}>
                On hold: {item.holdReason}
              </Text>
            ) : null}
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg, paddingVertical: spacing.md },
  factRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
});
