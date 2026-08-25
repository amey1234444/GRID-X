import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Card, EmptyState, ErrorState, LoadingState, StatTile, StatusPill } from '@/components/ui';
import { useApiQuery } from '@/lib/use-api';
import type { InspectionRow, Paginated, ReworkRow } from '@/lib/types';
import { colors, spacing, typography, humanise } from '@/theme';
import { formatDate, ScreenHeader } from './shared';

export type InspectorStackParamList = {
  InspectionQueue: undefined;
  InspectionDetail: { id: string; inspectionNumber: string };
};

function InspectionCard({
  inspection,
  onPress,
}: {
  inspection: InspectionRow;
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <Card onPress={onPress} style={styles.rowCard}>
      <View style={styles.rowTop}>
        <Text style={typography.heading} numberOfLines={1}>
          {inspection.inspectionNumber}
        </Text>
        <StatusPill status={inspection.status} />
      </View>
      <Text style={[typography.caption, { marginTop: 4 }]} numberOfLines={1}>
        {humanise(inspection.type)} · {inspection.job?.jobNumber ?? 'No job'} ·{' '}
        {inspection.job?.component?.name ?? ''}
      </Text>
      <View style={styles.rowMeta}>
        <Text style={typography.caption}>{inspection.partner?.businessName ?? 'Unassigned partner'}</Text>
        <Text style={typography.caption}>
          Qty {inspection.offeredQuantity} · {formatDate(inspection.requestedAt)}
        </Text>
      </View>
    </Card>
  );
}

export function InspectionQueueScreen({
  navigation,
}: NativeStackScreenProps<InspectorStackParamList, 'InspectionQueue'>): React.JSX.Element {
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<InspectionRow>>(
    '/quality/inspections?page=1&pageSize=50',
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const rows = data?.data ?? [];
  const requested = rows.filter((row) => row.status === 'REQUESTED').length;
  const inProgress = rows.filter((row) => row.status === 'IN_PROGRESS').length;
  const firstArticles = rows.filter((row) => row.type === 'FIRST_ARTICLE').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            <ScreenHeader
              title="Inspection queue"
              subtitle="Batches offered by partners, waiting for inspection"
            />
            <View style={styles.statGrid}>
              <StatTile label="Queued" value={data?.total ?? 0} />
              <StatTile label="Awaiting start" value={requested} tone={requested > 0 ? 'warning' : 'default'} />
              <StatTile label="In progress" value={inProgress} />
              <StatTile label="First articles" value={firstArticles} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nothing in the queue"
            description="Inspections appear here as soon as a partner offers a batch."
          />
        }
        renderItem={({ item }) => (
          <InspectionCard
            inspection={item}
            onPress={() =>
              navigation.navigate('InspectionDetail', { id: item.id, inspectionNumber: item.inspectionNumber })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </SafeAreaView>
  );
}

export function InspectionDetailScreen({
  route,
}: NativeStackScreenProps<InspectorStackParamList, 'InspectionDetail'>): React.JSX.Element {
  const { data, loading, error, refresh } = useApiQuery<InspectionRow>(
    `/quality/inspections/${route.params.id}`,
  );

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? 'Not found'} onRetry={refresh} />;

  const facts: { label: string; value: string }[] = [
    { label: 'Type', value: humanise(data.type) },
    { label: 'Job', value: data.job?.jobNumber ?? '—' },
    { label: 'Component', value: data.job?.component?.name ?? '—' },
    { label: 'Partner', value: data.partner?.businessName ?? '—' },
    { label: 'Offered quantity', value: String(data.offeredQuantity) },
    { label: 'Inspected', value: String(data.inspectedQuantity) },
    { label: 'Accepted', value: String(data.acceptedQuantity) },
    { label: 'Rejected', value: String(data.rejectedQuantity) },
    { label: 'Rework', value: String(data.reworkQuantity) },
    { label: 'Requested', value: formatDate(data.requestedAt) },
    { label: 'Completed', value: formatDate(data.completedAt) },
  ];

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.list}>
      <View style={styles.rowTop}>
        <Text style={typography.title}>{data.inspectionNumber}</Text>
        <StatusPill status={data.status} />
      </View>
      {data.decision ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={typography.caption}>Decision</Text>
          <Text style={[typography.heading, { marginTop: 4 }]}>{humanise(data.decision)}</Text>
        </Card>
      ) : null}
      <Card style={{ marginTop: spacing.lg }}>
        {facts.map((fact, index) => (
          <View key={fact.label} style={[styles.factRow, index > 0 && styles.factRowBorder]}>
            <Text style={typography.caption}>{fact.label}</Text>
            <Text style={typography.body}>{fact.value}</Text>
          </View>
        ))}
      </Card>
      <Text style={[typography.caption, { marginTop: spacing.lg, textAlign: 'center' }]}>
        Record measured results from the inspection bench in GRID-X Control.
      </Text>
    </ScrollView>
  );
}

export function ReworkScreen(): React.JSX.Element {
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<ReworkRow>>(
    '/quality/rework?page=1&pageSize=50',
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
        ListHeaderComponent={
          <ScreenHeader title="Rework orders" subtitle="Rework raised from rejected inspections" />
        }
        ListEmptyComponent={
          <EmptyState title="No rework open" description="Rework orders appear here when rejections need correction." />
        }
        renderItem={({ item }) => (
          <Card style={styles.rowCard}>
            <View style={styles.rowTop}>
              <Text style={typography.heading}>{item.reworkNumber}</Text>
              <StatusPill status={item.status} />
            </View>
            <Text style={[typography.caption, { marginTop: 4 }]} numberOfLines={2}>
              {item.job?.jobNumber ?? ''} · {item.instructions}
            </Text>
            <View style={styles.rowMeta}>
              <Text style={typography.caption}>Qty {item.quantity}</Text>
              <Text style={typography.caption}>Due {formatDate(item.dueDate)}</Text>
            </View>
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
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  rowCard: {},
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  factRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
});
