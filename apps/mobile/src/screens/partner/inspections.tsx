import { FlatList, StyleSheet, Text, View } from 'react-native';

import { StaggerItem } from '@/components/motion';
import { Card, EmptyState, ErrorState, LoadingState, StatusPill } from '@/components/ui';
import type { InspectionRow, Paginated, ReworkRow } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import { Refresher, Screen, ScreenHeader, relativeDay, screenStyles } from '@/screens/shared';
import { humanise, spacing, typography } from '@/theme';

/** Inspections raised on this partner's work, newest first. */
export function PartnerInspectionsScreen(): React.JSX.Element {
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<InspectionRow>>(
    '/quality/inspections?pageSize=100',
  );
  useFocusRefresh(refresh);

  if (loading && !data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Inspections" />
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
  const open = rows.filter((row) => row.status !== 'COMPLETED').length;

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={screenStyles.list}
        refreshControl={<Refresher refreshing={refreshing} onRefresh={refresh} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <ScreenHeader
            title="Inspections"
            subtitle={open > 0 ? `${open} awaiting a verdict` : 'All closed'}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="shield-checkmark-outline"
            title="No inspections yet"
            description="Offer a finished batch from the job screen to call an inspector."
          />
        }
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <Card>
              <View style={screenStyles.rowTop}>
                <View style={styles.head}>
                  <Text style={typography.cardTitle}>{item.inspectionNumber}</Text>
                  <Text style={typography.caption} numberOfLines={1}>
                    {item.job?.component?.name ?? item.job?.jobNumber ?? '—'} · {humanise(item.type)}
                  </Text>
                </View>
                <StatusPill status={item.decision ?? item.status} />
              </View>
              <Text style={[typography.small, styles.body]}>
                {item.offeredQuantity} offered
                {item.completedAt
                  ? ` · ${item.acceptedQuantity} accepted · ${item.rejectedQuantity} rejected`
                  : ''}
              </Text>
              <View style={screenStyles.rowMeta}>
                <Text style={typography.caption}>{item.inspector?.name ?? 'Inspector not assigned'}</Text>
                <Text style={typography.caption}>{relativeDay(item.completedAt ?? item.requestedAt)}</Text>
              </View>
            </Card>
          </StaggerItem>
        )}
      />
    </Screen>
  );
}

/** Rework raised against this partner. Read-only: only quality can move the status. */
export function PartnerReworkScreen(): React.JSX.Element {
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<ReworkRow>>(
    '/quality/rework?pageSize=100',
  );
  useFocusRefresh(refresh);

  if (loading && !data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Rework" />
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

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={screenStyles.list}
        refreshControl={<Refresher refreshing={refreshing} onRefresh={refresh} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={<ScreenHeader title="Rework" subtitle="Batches sent back for correction" />}
        ListEmptyComponent={
          <EmptyState icon="repeat-outline" title="No rework" description="Nothing has been sent back." />
        }
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <Card>
              <View style={screenStyles.rowTop}>
                <View style={styles.head}>
                  <Text style={typography.cardTitle}>{item.reworkNumber}</Text>
                  <Text style={typography.caption}>{item.job?.jobNumber ?? '—'}</Text>
                </View>
                <StatusPill status={item.status} />
              </View>
              <Text style={[typography.small, styles.body]}>{item.instructions}</Text>
              <View style={screenStyles.rowMeta}>
                <Text style={typography.caption}>
                  {item.quantity} pieces · {item.chargeToPartner ? 'Charged to you' : 'OSWAR cost'}
                </Text>
                <Text style={typography.caption}>
                  {item.dueDate ? `Due ${relativeDay(item.dueDate)}` : relativeDay(item.issuedAt)}
                </Text>
              </View>
            </Card>
          </StaggerItem>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flex: 1, gap: 2 },
  body: { marginTop: spacing.md },
});
