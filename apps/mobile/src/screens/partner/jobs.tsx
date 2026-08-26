import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { StaggerItem } from '@/components/motion';
import {
  Card,
  ChipRow,
  EmptyState,
  ErrorState,
  LoadingState,
  ProgressBar,
  StatusPill,
} from '@/components/ui';
import type { JobRow, Paginated } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import type { PartnerScreenProps } from '@/navigation/types';
import { Refresher, Screen, ScreenHeader, formatMoney, relativeDay, screenStyles } from '@/screens/shared';
import { colors, humanise, spacing, typography } from '@/theme';

const NEW_STATUS = 'AWAITING_PARTNER_ACCEPTANCE';
const DONE_STATUSES = ['RECEIVED', 'CLOSED', 'CANCELLED'];

type JobFilter = 'NEW' | 'ACTIVE' | 'COMPLETED' | 'ALL';

/** Job card shared by the dashboard and the job list. */
export function JobCard({ job, onPress }: { job: JobRow; onPress: () => void }): React.JSX.Element {
  const produced = job.acceptedQuantity + job.rejectedQuantity;

  return (
    <Card onPress={onPress}>
      <View style={screenStyles.rowTop}>
        <View style={styles.head}>
          <Text style={typography.cardTitle}>{job.jobNumber}</Text>
          <Text style={typography.caption} numberOfLines={1}>
            {job.componentName} · {job.quantity} pcs
          </Text>
        </View>
        <StatusPill status={job.status} />
      </View>

      <View style={styles.progress}>
        <ProgressBar
          value={produced}
          total={job.quantity}
          tone={job.isOverdue ? 'destructive' : 'info'}
        />
        <View style={styles.progressMeta}>
          <Text style={typography.caption}>
            {job.acceptedQuantity} accepted
            {job.rejectedQuantity > 0 ? ` · ${job.rejectedQuantity} rejected` : ''}
          </Text>
          <Text style={typography.caption}>{formatMoney(job.value)}</Text>
        </View>
      </View>

      <View style={screenStyles.rowMeta}>
        <Text style={typography.caption} numberOfLines={1}>
          {job.latestMilestone ? humanise(job.latestMilestone) : humanise(job.priority) + ' priority'}
        </Text>
        <Text style={[typography.caption, job.isOverdue && { color: colors.destructive }]}>
          {job.isOverdue ? `${job.delayDays}d late` : `Due ${relativeDay(job.dueDate)}`}
        </Text>
      </View>
    </Card>
  );
}

/** Every job allocated to this partner. Server scopes the list; filters are display-only. */
export function PartnerJobsScreen({ navigation, route }: PartnerScreenProps<'PartnerJobs'>): React.JSX.Element {
  const [filter, setFilter] = useState<JobFilter>(route.params?.initialFilter ?? 'ACTIVE');
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<JobRow>>('/jobs?pageSize=100');
  useFocusRefresh(refresh);

  const rows = useMemo(() => data?.data ?? [], [data]);
  const counts = useMemo(
    () => ({
      NEW: rows.filter((row) => row.status === NEW_STATUS).length,
      ACTIVE: rows.filter((row) => row.status !== NEW_STATUS && !DONE_STATUSES.includes(row.status)).length,
      COMPLETED: rows.filter((row) => DONE_STATUSES.includes(row.status)).length,
      ALL: rows.length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    switch (filter) {
      case 'NEW':
        return rows.filter((row) => row.status === NEW_STATUS);
      case 'ACTIVE':
        return rows.filter((row) => row.status !== NEW_STATUS && !DONE_STATUSES.includes(row.status));
      case 'COMPLETED':
        return rows.filter((row) => DONE_STATUSES.includes(row.status));
      default:
        return rows;
    }
  }, [filter, rows]);

  if (loading && !data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Jobs" />
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

  return (
    <Screen>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={screenStyles.list}
        refreshControl={<Refresher refreshing={refreshing} onRefresh={refresh} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title="Jobs" subtitle="Work allocated to your workshop" />
            <ChipRow
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'NEW', label: 'New offers', count: counts.NEW },
                { value: 'ACTIVE', label: 'Active', count: counts.ACTIVE },
                { value: 'COMPLETED', label: 'Closed', count: counts.COMPLETED },
                { value: 'ALL', label: 'All', count: counts.ALL },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="briefcase-outline"
            title="No jobs here"
            description="Nothing matches this filter. New allocations arrive as alerts."
          />
        }
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <JobCard
              job={item}
              onPress={() =>
                navigation.navigate('PartnerJobDetail', { id: item.id, jobNumber: item.jobNumber })
              }
            />
          </StaggerItem>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, marginBottom: spacing.lg },
  head: { flex: 1, gap: 2 },
  progress: { marginTop: spacing.md, gap: spacing.sm },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
});
