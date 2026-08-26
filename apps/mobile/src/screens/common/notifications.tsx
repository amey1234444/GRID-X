import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { StaggerItem } from '@/components/motion';
import { useToast } from '@/components/toast';
import { Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { api } from '@/lib/api';
import { useApiQuery } from '@/lib/use-api';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import type { NotificationPage, NotificationRow } from '@/lib/types';
import { Refresher, Screen, ScreenHeader, relativeDay, screenStyles } from '@/screens/shared';
import { colors, humanise, spacing, typography } from '@/theme';

/**
 * In-app notification feed. Tapping a row marks it read locally *and* on the
 * server; there is no deep link because the record it points at is always one
 * of the lists in the tab bar.
 */
export function NotificationsScreen(): React.JSX.Element {
  const { data, loading, refreshing, error, refresh } = useApiQuery<NotificationPage>(
    '/notifications?pageSize=50',
  );
  const toast = useToast();
  useFocusRefresh(refresh);

  const markRead = useCallback(
    async (notification: NotificationRow) => {
      if (notification.readAt) return;
      await api.post(`/notifications/${notification.id}/read`, {});
      refresh();
    },
    [refresh],
  );

  const markAll = useCallback(async () => {
    await api.post('/notifications/read-all', {});
    toast.show('All notifications marked read');
    refresh();
  }, [refresh, toast]);

  if (loading && !data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Alerts" />
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
        ListHeaderComponent={
          <ScreenHeader
            title="Alerts"
            subtitle={
              data && data.unreadCount > 0 ? `${data.unreadCount} unread` : 'Everything has been read'
            }
            right={
              data && data.unreadCount > 0 ? (
                <Button title="Mark all" size="small" variant="outline" onPress={() => void markAll()} />
              ) : undefined
            }
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="No alerts"
            description="Job allocations, inspection outcomes and material challans appear here."
          />
        }
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <Card onPress={() => void markRead(item)}>
              <View style={styles.row}>
                <View style={[styles.dot, item.readAt ? styles.dotRead : styles.dotUnread]} />
                <View style={styles.body}>
                  <Text style={typography.cardTitle}>{item.title}</Text>
                  {item.body ? <Text style={typography.small}>{item.body}</Text> : null}
                  <View style={styles.meta}>
                    <Text style={typography.caption}>{humanise(item.event)}</Text>
                    <Text style={typography.caption}>{relativeDay(item.createdAt)}</Text>
                  </View>
                </View>
                {item.readAt ? null : <Ionicons name="ellipse" size={8} color={colors.primary} />}
              </View>
            </Card>
          </StaggerItem>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  dotUnread: { backgroundColor: colors.primary },
  dotRead: { backgroundColor: colors.borderStrong },
  body: { flex: 1, gap: 4 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
});
