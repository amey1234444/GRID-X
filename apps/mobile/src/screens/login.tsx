import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { ApiError } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/theme';

type Mode = 'inspector' | 'partner';

export function LoginScreen(): React.JSX.Element {
  const { loginInternal, loginPartner } = useAuth();
  const [mode, setMode] = useState<Mode>('inspector');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (): Promise<void> => {
    if (!identifier || !password) {
      setError(mode === 'partner' ? 'Enter your phone number and password' : 'Enter your email and password');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'partner') await loginPartner(identifier.trim(), password);
      else await loginInternal(identifier.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>GX</Text>
          </View>
          <Text style={styles.title}>GRID-X</Text>
          <Text style={typography.caption}>The operating system for distributed manufacturing</Text>
        </View>

        <View style={styles.switcher}>
          {(['inspector', 'partner'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => {
                setMode(value);
                setError(null);
              }}
              style={[styles.switchItem, mode === value && styles.switchItemActive]}
            >
              <Text style={[styles.switchText, mode === value && styles.switchTextActive]}>
                {value === 'inspector' ? 'Inspector' : 'Partner'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          <Input
            placeholder={mode === 'partner' ? 'Phone number' : 'Work email'}
            keyboardType={mode === 'partner' ? 'phone-pad' : 'email-address'}
            value={identifier}
            onChangeText={setIdentifier}
          />
          <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Sign in" onPress={() => void submit()} loading={submitting} />
        </View>

        <Text style={[typography.caption, styles.footer]}>
          Protected by role-based access control and full audit logging.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoText: { color: colors.primaryForeground, fontSize: 20, fontWeight: '700' },
  title: { ...typography.title, fontSize: 28 },
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 4,
  },
  switchItem: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.control,
    alignItems: 'center',
  },
  switchItemActive: { backgroundColor: colors.surfaceActive },
  switchText: { color: colors.mutedForeground, fontSize: 14, fontWeight: '500' },
  switchTextActive: { color: colors.foreground },
  form: { gap: spacing.md },
  error: { color: colors.destructive, fontSize: 13 },
  footer: { textAlign: 'center' },
});
