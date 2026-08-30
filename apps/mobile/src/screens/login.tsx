import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Banner, Button, Field, Input } from '@/components/ui';
import { LogoTile } from '@/components/logo';
import { Reveal } from '@/components/motion';
import { ServerSheet } from '@/screens/server';
import { useAuth } from '@/context/auth';
import { ApiError, apiBaseUrl } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/theme';

type Mode = 'inspector' | 'partner';

export function LoginScreen(): React.JSX.Element {
  const { loginInternal, loginPartner } = useAuth();
  const [mode, setMode] = useState<Mode>('inspector');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverOpen, setServerOpen] = useState(false);
  const [server, setServer] = useState(apiBaseUrl());

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Reveal>
            <View style={styles.header}>
              <LogoTile size={58} />
              <Text style={styles.title}>GRID-X</Text>
              <Text style={[typography.caption, styles.centered]}>
                The operating system for distributed manufacturing
              </Text>
            </View>
          </Reveal>

          <Reveal delay={90}>
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
                  <Ionicons
                    name={value === 'inspector' ? 'shield-checkmark-outline' : 'business-outline'}
                    size={15}
                    color={mode === value ? colors.foreground : colors.mutedForeground}
                  />
                  <Text style={[styles.switchText, mode === value && styles.switchTextActive]}>
                    {value === 'inspector' ? 'OSWAR team' : 'Partner'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Reveal>

          <Reveal delay={150}>
            <View style={styles.form}>
              <Field label={mode === 'partner' ? 'Registered phone' : 'Work email'}>
                <Input
                  placeholder={mode === 'partner' ? '9876543210' : 'name@oswar.example'}
                  keyboardType={mode === 'partner' ? 'phone-pad' : 'email-address'}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoComplete={mode === 'partner' ? 'tel' : 'email'}
                />
              </Field>
              <Field label="Password">
                <View style={styles.passwordRow}>
                  <Input
                    placeholder="••••••••"
                    secureTextEntry={!reveal}
                    value={password}
                    onChangeText={setPassword}
                    style={styles.passwordInput}
                    onSubmitEditing={() => void submit()}
                    returnKeyType="go"
                  />
                  <Pressable style={styles.revealButton} onPress={() => setReveal((value) => !value)} hitSlop={8}>
                    <Ionicons
                      name={reveal ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>
              </Field>
              {error ? <Banner tone="destructive" message={error} /> : null}
              <Button title="Sign in" icon="log-in-outline" onPress={() => void submit()} loading={submitting} />
            </View>
          </Reveal>

          <Reveal delay={220}>
            <Pressable style={styles.serverRow} onPress={() => setServerOpen(true)}>
              <Ionicons name="server-outline" size={14} color={colors.subtleForeground} />
              <Text style={[typography.caption, styles.serverText]} numberOfLines={1}>
                {server}
              </Text>
              <Text style={[typography.caption, { color: colors.primary }]}>Change</Text>
            </Pressable>
            <Text style={[typography.caption, styles.footer]}>
              Protected by role-based access control and full audit logging.
            </Text>
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>

      <ServerSheet visible={serverOpen} onClose={() => setServerOpen(false)} onSaved={setServer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm },
  centered: { textAlign: 'center' },
  title: { ...typography.title, fontSize: 30 },
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
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchItemActive: { backgroundColor: colors.surfaceActive },
  switchText: { color: colors.mutedForeground, fontSize: 14, fontWeight: '500' },
  switchTextActive: { color: colors.foreground },
  form: { gap: spacing.lg },
  passwordRow: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 48 },
  revealButton: { position: 'absolute', right: spacing.lg },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  serverText: { flexShrink: 1 },
  footer: { textAlign: 'center', marginTop: spacing.sm },
});
