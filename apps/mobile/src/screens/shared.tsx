import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { colors, spacing, typography, humanise } from '@/theme';

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatMoney(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }): React.JSX.Element {
  return (
    <View style={headerStyles.container}>
      <Text style={typography.title}>{title}</Text>
      {subtitle ? <Text style={typography.caption}>{subtitle}</Text> : null}
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: { gap: 4, marginBottom: spacing.lg },
});

export function ProfileScreen(): React.JSX.Element {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={profileStyles.safe} edges={['top']}>
      <View style={profileStyles.container}>
        <ScreenHeader title="Profile" />
        <Card>
          <Text style={typography.heading}>{user?.name}</Text>
          <Text style={[typography.caption, { marginTop: 4 }]}>
            {user?.email ?? user?.phone ?? ''}
          </Text>
          <View style={profileStyles.roleRow}>
            <Text style={typography.caption}>Role</Text>
            <Text style={typography.body}>{humanise(user?.roleCode ?? '')}</Text>
          </View>
          {user?.partnerName ? (
            <View style={profileStyles.roleRow}>
              <Text style={typography.caption}>Unit</Text>
              <Text style={typography.body}>{user.partnerName}</Text>
            </View>
          ) : null}
        </Card>
        <View style={{ marginTop: spacing.xl }}>
          <Button title="Sign out" variant="destructive" onPress={() => void logout()} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const profileStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
});
