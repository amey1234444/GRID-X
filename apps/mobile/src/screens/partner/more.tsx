import { ScrollView, View } from 'react-native';

import { Card, Divider, NavRow, SectionLabel } from '@/components/ui';
import type { NotificationPage } from '@/lib/types';
import { useApiQuery } from '@/lib/use-api';
import type { PartnerScreenProps } from '@/navigation/types';
import { Screen, ScreenHeader, screenStyles } from '@/screens/shared';

/** Everything that does not earn a tab of its own. */
export function PartnerMoreScreen({ navigation }: PartnerScreenProps<'PartnerMore'>): React.JSX.Element {
  const alerts = useApiQuery<NotificationPage>('/notifications?unread=true&pageSize=1');

  return (
    <Screen>
      <ScrollView contentContainerStyle={screenStyles.list}>
        <ScreenHeader title="More" />

        <Card>
          <NavRow
            title="Alerts"
            subtitle="Job offers, inspections, material"
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
            title="Rework"
            subtitle="Batches sent back for correction"
            icon="repeat-outline"
            onPress={() => navigation.navigate('PartnerRework')}
          />
        </Card>

        <View style={screenStyles.section}>
          <SectionLabel>Commercial</SectionLabel>
          <Card>
            <NavRow
              title="Payments"
              subtitle="Invoices and their approval stage"
              icon="receipt-outline"
              onPress={() => navigation.navigate('PartnerInvoices')}
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

        <View style={screenStyles.section}>
          <SectionLabel>Account</SectionLabel>
          <Card>
            <NavRow
              title="Profile and settings"
              subtitle="Server address, support, sign out"
              icon="person-outline"
              onPress={() => navigation.navigate('Profile')}
            />
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
