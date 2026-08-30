import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

import { Reveal } from '@/components/motion';
import { Avatar, Button, Card, Divider, FactList, NavRow, SectionLabel } from '@/components/ui';
import { ServerSheet } from '@/screens/server';
import { useAuth } from '@/context/auth';
import { apiBaseUrl } from '@/lib/api';
import { Screen, ScreenHeader, screenStyles } from '@/screens/shared';
import { colors, humanise, spacing, typography } from '@/theme';

/**
 * Profile and device settings. The server address lives here rather than in a
 * developer menu: for a shared APK it is a first-class setting.
 */
export function ProfileScreen({
  onOpenNotifications,
}: {
  onOpenNotifications?: () => void;
}): React.JSX.Element {
  const { user, logout } = useAuth();
  const [serverOpen, setServerOpen] = useState(false);
  const [server, setServer] = useState(apiBaseUrl());

  const confirmLogout = (): void => {
    Alert.alert('Sign out', 'You will need your password to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  if (!user) return <Screen />;

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <ScrollView contentContainerStyle={screenStyles.list}>
        <ScreenHeader title="Profile" />

        <Reveal>
          <Card>
            <View style={styles.identity}>
              <Avatar name={user.name} size={52} />
              <View style={styles.identityText}>
                <Text style={typography.heading}>{user.name}</Text>
                <Text style={typography.caption}>{humanise(user.roleCode)}</Text>
              </View>
            </View>
            <Divider />
            <FactList
              facts={[
                { label: 'Organisation', value: user.partnerName ?? 'OSWAR' },
                { label: 'Email', value: user.email ?? '—' },
                { label: 'Phone', value: user.phone ?? '—' },
                { label: 'Permissions', value: `${user.permissions.length} granted` },
              ]}
            />
          </Card>
        </Reveal>

        <View style={screenStyles.section}>
          <SectionLabel>Device</SectionLabel>
          <Reveal delay={70}>
            <Card>
              <NavRow
                title="GRID-X server"
                subtitle={server}
                icon="server-outline"
                onPress={() => setServerOpen(true)}
              />
              {onOpenNotifications ? (
                <>
                  <Divider />
                  <NavRow
                    title="Alerts"
                    subtitle="Job, quality and material notifications"
                    icon="notifications-outline"
                    onPress={onOpenNotifications}
                  />
                </>
              ) : null}
              <Divider />
              <NavRow
                title="Support"
                subtitle="Contact the OSWAR coordination desk"
                icon="help-buoy-outline"
                onPress={() => void Linking.openURL('mailto:support@oswar.example')}
              />
            </Card>
          </Reveal>
        </View>

        <View style={screenStyles.section}>
          <Button title="Sign out" variant="outline" icon="log-out-outline" onPress={confirmLogout} />
          <Text style={[typography.caption, styles.version]}>
            GRID-X mobile {version} · {user.language ?? 'en'}
          </Text>
        </View>
      </ScrollView>

      <ServerSheet visible={serverOpen} onClose={() => setServerOpen(false)} onSaved={setServer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: 2 },
  version: { textAlign: 'center', marginTop: spacing.lg, color: colors.subtleForeground },
});
