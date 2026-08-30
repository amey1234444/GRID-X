import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Reveal, StaggerItem } from '@/components/motion';
import {
  Card,
  Divider,
  ErrorState,
  LoadingState,
  NavRow,
  SectionLabel,
  StatTile,
  StatusPill,
} from '@/components/ui';
import { useAuth } from '@/context/auth';
import type { NotificationPage, PartnerDashboard } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import type { PartnerScreenProps } from '@/navigation/types';
import { JobCard } from '@/screens/partner/jobs';
import { Refresher, Screen, ScreenHeader, formatMoney, screenStyles } from '@/screens/shared';
import { colors, spacing, typography } from '@/theme';

/**
 * Partner home. The counters mirror the partner web dashboard and come from the
 * same `/dashboards/partner` payload, so mobile never recomputes them.
 */
export function PartnerHomeScreen({ navigation }: PartnerScreenProps<'PartnerHome'>): React.JSX.Element {
  const { user } = useAuth();
  const { data, loading, refreshing, error, refresh } = useApiQuery<PartnerDashboard>('/dashboards/partner');
  const alerts = useApiQuery<NotificationPage>('/notifications?unread=true&pageSize=1');
  useFocusRefresh(refresh);

  if (loading && !data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Workshop" />
          <LoadingState />
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <ErrorState message={error ?? 'Dashboard unavailable'} onRetry={refresh} />
      </Screen>
    );
  }

  const openJobs = data.jobs.slice(0, 5);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={screenStyles.list}
        refreshControl={<Refresher refreshing={refreshing} onRefresh={refresh} />}
      >
        <ScreenHeader
          title={data.businessName}
          subtitle={user?.name ? `Signed in as ${user.name}` : undefined}
          right={<StatusPill status={data.category} />}
        />

        <Reveal>
          <Card>
            <View style={styles.scoreRow}>
              <View>
                <Text style={typography.label}>Partner score</Text>
                <Text style={styles.score}>{data.score === null ? '—' : data.score.toFixed(1)}</Text>
              </View>
              <View style={styles.scoreMeta}>
                <Text style={typography.caption}>Payments due</Text>
                <Text style={typography.cardTitle}>{formatMoney(data.paymentsDue)}</Text>
              </View>
            </View>
          </Card>
        </Reveal>

        <View style={screenStyles.section}>
          <View style={screenStyles.statGrid}>
            <StatTile
              label="New offers"
              value={data.newJobs}
              tone={data.newJobs > 0 ? 'info' : 'default'}
              onPress={() => navigation.navigate('PartnerJobs', { initialFilter: 'NEW' })}
            />
            <StatTile
              label="Active jobs"
              value={data.activeJobs}
              onPress={() => navigation.navigate('PartnerJobs', { initialFilter: 'ACTIVE' })}
            />
            <StatTile
              label="Material to accept"
              value={data.awaitingMaterialAck}
              tone={data.awaitingMaterialAck > 0 ? 'warning' : 'default'}
              onPress={() => navigation.navigate('PartnerMaterials')}
            />
            <StatTile
              label="Inspections open"
              value={data.pendingInspections}
              onPress={() => navigation.navigate('PartnerInspections')}
            />
            <StatTile
              label="Rework open"
              value={data.reworkOpen}
              tone={data.reworkOpen > 0 ? 'destructive' : 'default'}
              onPress={() => navigation.navigate('PartnerRework')}
            />
            <StatTile
              label="Invoices pending"
              value={data.invoicesPending}
              onPress={() => navigation.navigate('PartnerInvoices')}
            />
          </View>
        </View>

        <View style={screenStyles.section}>
          <SectionLabel>Live jobs</SectionLabel>
          <View style={screenStyles.gap}>
            {openJobs.length === 0 ? (
              <Card>
                <Text style={typography.small}>No open job right now. New offers arrive as alerts.</Text>
              </Card>
            ) : (
              openJobs.map((job, index) => (
                <StaggerItem index={index} key={job.id}>
                  <JobCard
                    job={job}
                    onPress={() =>
                      navigation.navigate('PartnerJobDetail', { id: job.id, jobNumber: job.jobNumber })
                    }
                  />
                </StaggerItem>
              ))
            )}
          </View>
        </View>

        <View style={screenStyles.section}>
          <SectionLabel>Shortcuts</SectionLabel>
          <Card>
            <NavRow
              title="Alerts"
              subtitle="Allocations, inspections, material"
              icon="notifications-outline"
              badge={alerts.data?.unreadCount}
              onPress={() => navigation.navigate('Notifications')}
            />
            <Divider />
            <NavRow
              title="Drawings"
              subtitle="Released revisions shared with you"
              icon="document-text-outline"
              onPress={() => navigation.navigate('PartnerDrawings')}
            />
            <Divider />
            <NavRow
              title="Scorecard"
              subtitle="Monthly quality and delivery rating"
              icon="stats-chart-outline"
              onPress={() => navigation.navigate('PartnerScorecard')}
            />
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  score: {
    fontSize: 40,
    fontWeight: '600',
    letterSpacing: -1.5,
    color: colors.foreground,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  scoreMeta: { alignItems: 'flex-end', gap: 2 },
});
