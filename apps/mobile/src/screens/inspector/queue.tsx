import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Reveal, StaggerItem } from '@/components/motion';
import {
  Card,
  ChipRow,
  EmptyState,
  ErrorState,
  LoadingState,
  NavRow,
  ProgressBar,
  SectionLabel,
  StatTile,
  StatusPill,
} from '@/components/ui';
import { useAuth } from '@/context/auth';
import { INSPECTION_TYPE_LABELS, type InspectionType } from '@/lib/enums';
import type { InspectionRow, Paginated, ReworkRow } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import type { InspectorScreenProps } from '@/navigation/types';
import { Refresher, Screen, ScreenHeader, isSameDay, relativeDay, screenStyles } from '@/screens/shared';
import { colors, spacing, typography } from '@/theme';

const OPEN_STATUSES = ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS'];

function typeLabel(type: string): string {
  return INSPECTION_TYPE_LABELS[type as InspectionType] ?? type;
}

/** Inspection card — the single row shape used by every inspector list. */
export function InspectionCard({
  inspection,
  onPress,
}: {
  inspection: InspectionRow;
  onPress: () => void;
}): React.JSX.Element {
  const overdue =
    inspection.dueAt !== null && new Date(inspection.dueAt) < new Date() && !inspection.completedAt;

  return (
    <Card onPress={onPress}>
      <View style={screenStyles.rowTop}>
        <View style={styles.cardTitleWrap}>
          <Text style={typography.cardTitle}>{inspection.inspectionNumber}</Text>
          <Text style={typography.caption} numberOfLines={1}>
            {inspection.job?.component?.name ?? 'Component'} · {typeLabel(inspection.type)}
          </Text>
        </View>
        <StatusPill status={inspection.decision ?? inspection.status} />
      </View>

      <View style={styles.quantities}>
        <Text style={typography.small}>
          {inspection.offeredQuantity} offered
          {inspection.completedAt
            ? ` · ${inspection.acceptedQuantity} accepted · ${inspection.rejectedQuantity} rejected`
            : ''}
        </Text>
        {inspection.status === 'IN_PROGRESS' ? (
          <ProgressBar value={inspection.inspectedQuantity} total={inspection.offeredQuantity} tone="info" />
        ) : null}
      </View>

      <View style={screenStyles.rowMeta}>
        <Text style={typography.caption} numberOfLines={1}>
          {inspection.partner?.businessName ?? 'OSWAR plant'}
        </Text>
        <Text style={[typography.caption, overdue && { color: colors.destructive }]}>
          {inspection.dueAt ? `Due ${relativeDay(inspection.dueAt)}` : relativeDay(inspection.requestedAt)}
        </Text>
      </View>
    </Card>
  );
}

/**
 * The inspector's landing screen: what is due today, what is stuck, and the
 * few shortcuts that matter. Counting happens here purely for display — the
 * server decides which inspections the user may see at all.
 */
export function InspectorTodayScreen({ navigation }: InspectorScreenProps<'InspectorToday'>): React.JSX.Element {
  const { user } = useAuth();
  const inspections = useApiQuery<Paginated<InspectionRow>>(
    user ? `/quality/inspections?pageSize=100&inspectorId=${user.id}` : null,
  );
  const rework = useApiQuery<Paginated<ReworkRow>>('/quality/rework?pageSize=50');
  useFocusRefresh(inspections.refresh);

  const rows = useMemo(() => inspections.data?.data ?? [], [inspections.data]);
  const summary = useMemo(() => {
    const open = rows.filter((row) => OPEN_STATUSES.includes(row.status));
    return {
      today: open.filter((row) => isSameDay(row.dueAt) || isSameDay(row.requestedAt)).length,
      open: open.length,
      inProgress: rows.filter((row) => row.status === 'IN_PROGRESS').length,
      overdue: open.filter((row) => row.dueAt !== null && new Date(row.dueAt) < new Date()).length,
      rejected: rows.filter((row) => row.decision === 'REJECTED').length,
      completedToday: rows.filter((row) => isSameDay(row.completedAt)).length,
    };
  }, [rows]);

  const nextUp = useMemo(
    () =>
      rows
        .filter((row) => OPEN_STATUSES.includes(row.status))
        .sort((a, b) => {
          const left = a.dueAt ?? a.requestedAt;
          const right = b.dueAt ?? b.requestedAt;
          return left.localeCompare(right);
        })
        .slice(0, 4),
    [rows],
  );

  if (inspections.loading && !inspections.data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Today" />
          <LoadingState />
        </View>
      </Screen>
    );
  }

  if (inspections.error && !inspections.data) {
    return (
      <Screen>
        <ErrorState message={inspections.error} onRetry={inspections.refresh} />
      </Screen>
    );
  }

  const openRework = (rework.data?.data ?? []).filter((row) => row.status !== 'COMPLETED').length;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={screenStyles.list}
        refreshControl={<Refresher refreshing={inspections.refreshing} onRefresh={inspections.refresh} />}
      >
        <ScreenHeader
          title={`Hello, ${user?.name.split(' ')[0] ?? 'Inspector'}`}
          subtitle={
            summary.open === 0
              ? 'Your queue is clear'
              : `${summary.open} inspection${summary.open === 1 ? '' : 's'} waiting on you`
          }
        />

        <Reveal>
          <View style={screenStyles.statGrid}>
            <StatTile
              label="Due today"
              value={summary.today}
              tone={summary.today > 0 ? 'info' : 'default'}
              onPress={() => navigation.navigate('InspectionQueue', { initialFilter: 'TODAY' })}
            />
            <StatTile
              label="In progress"
              value={summary.inProgress}
              onPress={() => navigation.navigate('InspectionQueue', { initialFilter: 'IN_PROGRESS' })}
            />
            <StatTile
              label="Overdue"
              value={summary.overdue}
              tone={summary.overdue > 0 ? 'destructive' : 'default'}
              onPress={() => navigation.navigate('InspectionQueue', { initialFilter: 'ASSIGNED' })}
            />
            <StatTile label="Closed today" value={summary.completedToday} tone="success" />
          </View>
        </Reveal>

        <View style={screenStyles.section}>
          <SectionLabel>Next up</SectionLabel>
          <View style={screenStyles.gap}>
            {nextUp.length === 0 ? (
              <Card>
                <Text style={typography.small}>Nothing is waiting. New offers arrive as alerts.</Text>
              </Card>
            ) : (
              nextUp.map((inspection, index) => (
                <StaggerItem index={index} key={inspection.id}>
                  <InspectionCard
                    inspection={inspection}
                    onPress={() =>
                      navigation.navigate('InspectionDetail', {
                        id: inspection.id,
                        inspectionNumber: inspection.inspectionNumber,
                      })
                    }
                  />
                </StaggerItem>
              ))
            )}
          </View>
        </View>

        <View style={screenStyles.section}>
          <SectionLabel>Quality</SectionLabel>
          <Card>
            <NavRow
              title="Full queue"
              subtitle="Every inspection assigned to you"
              icon="list-outline"
              badge={summary.open}
              onPress={() => navigation.navigate('InspectionQueue')}
            />
            <NavRow
              title="Non-conformances"
              subtitle="Defects raised from failed inspections"
              icon="warning-outline"
              badge={summary.rejected}
              onPress={() => navigation.navigate('NonConformances')}
            />
            <NavRow
              title="Rework orders"
              subtitle="Work sent back to partners"
              icon="repeat-outline"
              badge={openRework}
              onPress={() => navigation.navigate('ReworkList')}
            />
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

type QueueFilter = 'ALL' | 'TODAY' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

/** The full queue, filtered client-side so switching tabs never waits on a request. */
export function InspectionQueueScreen({
  navigation,
  route,
}: InspectorScreenProps<'InspectionQueue'>): React.JSX.Element {
  const { user } = useAuth();
  const [filter, setFilter] = useState<QueueFilter>(route.params?.initialFilter ?? 'ALL');
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<InspectionRow>>(
    user ? `/quality/inspections?pageSize=100&inspectorId=${user.id}` : null,
  );
  useFocusRefresh(refresh);

  const rows = useMemo(() => data?.data ?? [], [data]);
  const counts = useMemo(
    () => ({
      ALL: rows.length,
      TODAY: rows.filter(
        (row) => OPEN_STATUSES.includes(row.status) && (isSameDay(row.dueAt) || isSameDay(row.requestedAt)),
      ).length,
      ASSIGNED: rows.filter((row) => row.status === 'ASSIGNED' || row.status === 'REQUESTED').length,
      IN_PROGRESS: rows.filter((row) => row.status === 'IN_PROGRESS').length,
      COMPLETED: rows.filter((row) => row.status === 'COMPLETED').length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    switch (filter) {
      case 'TODAY':
        return rows.filter(
          (row) => OPEN_STATUSES.includes(row.status) && (isSameDay(row.dueAt) || isSameDay(row.requestedAt)),
        );
      case 'ASSIGNED':
        return rows.filter((row) => row.status === 'ASSIGNED' || row.status === 'REQUESTED');
      case 'IN_PROGRESS':
        return rows.filter((row) => row.status === 'IN_PROGRESS');
      case 'COMPLETED':
        return rows.filter((row) => row.status === 'COMPLETED');
      default:
        return rows;
    }
  }, [filter, rows]);

  if (loading && !data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Queue" />
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
          <View style={styles.queueHeader}>
            <ScreenHeader title="Queue" subtitle="Inspections assigned to you" />
            <ChipRow
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ALL', label: 'All', count: counts.ALL },
                { value: 'TODAY', label: 'Today', count: counts.TODAY },
                { value: 'ASSIGNED', label: 'To start', count: counts.ASSIGNED },
                { value: 'IN_PROGRESS', label: 'Open', count: counts.IN_PROGRESS },
                { value: 'COMPLETED', label: 'Done', count: counts.COMPLETED },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-done-outline"
            title="Nothing here"
            description="No inspection matches this filter right now."
          />
        }
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <InspectionCard
              inspection={item}
              onPress={() =>
                navigation.navigate('InspectionDetail', {
                  id: item.id,
                  inspectionNumber: item.inspectionNumber,
                })
              }
            />
          </StaggerItem>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitleWrap: { flex: 1, gap: 2 },
  quantities: { marginTop: spacing.md, gap: spacing.sm },
  queueHeader: { gap: spacing.md, marginBottom: spacing.lg },
});
