import { FlatList, StyleSheet, Text, View } from 'react-native';

import { StaggerItem } from '@/components/motion';
import { Card, EmptyState, ErrorState, LoadingState, StatusPill } from '@/components/ui';
import type { NonConformanceRow, Paginated } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import { Refresher, Screen, ScreenHeader, formatMoney, relativeDay, screenStyles } from '@/screens/shared';
import { humanise, spacing, typography } from '@/theme';

/** Defects raised from failed inspections, newest first. Read-only on mobile. */
export function NonConformancesScreen(): React.JSX.Element {
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<NonConformanceRow>>(
    '/quality/non-conformances?pageSize=50',
  );
  useFocusRefresh(refresh);

  if (loading && !data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Non-conformances" />
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
  const open = rows.filter((row) => row.closedAt === null).length;

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
            title="Non-conformances"
            subtitle={open > 0 ? `${open} still open` : 'Nothing open'}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="shield-checkmark-outline"
            title="No defects raised"
            description="Non-conformances appear here when an inspection is rejected or sent for rework."
          />
        }
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <Card>
              <View style={screenStyles.rowTop}>
                <View style={styles.head}>
                  <Text style={typography.cardTitle}>{item.ncNumber}</Text>
                  <Text style={typography.caption}>
                    {humanise(item.defectType)} · {item.job?.jobNumber ?? '—'}
                  </Text>
                </View>
                <StatusPill
                  status={item.closedAt ? 'CLOSED' : 'OPEN'}
                  tone={item.closedAt ? 'muted' : 'warning'}
                />
              </View>

              <Text style={[typography.small, styles.body]}>
                {item.quantityAffected} affected · {humanise(item.responsibility)} responsible
                {item.reworkCost > 0 ? ` · ${formatMoney(item.reworkCost)} rework` : ''}
              </Text>
              {item.probableCause ? (
                <Text style={typography.caption} numberOfLines={2}>
                  {item.probableCause}
                </Text>
              ) : null}

              <View style={screenStyles.rowMeta}>
                <Text style={typography.caption}>
                  {item.partner?.businessName ?? 'OSWAR plant'}
                </Text>
                <Text style={typography.caption}>{relativeDay(item.raisedAt)}</Text>
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
  body: { marginTop: spacing.md, marginBottom: 2 },
});
