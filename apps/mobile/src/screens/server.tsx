import { useState } from 'react';
import { Text, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Banner, Button, Field, Input } from '@/components/ui';
import { api, apiBaseUrl, isDefaultBaseUrl, normaliseBaseUrl, setBaseUrl } from '@/lib/api';
import { spacing, typography } from '@/theme';

/**
 * Server address editor.
 *
 * Signing in is useless if the app is pointed at the wrong host, so the address
 * is editable in the app and verified against /health before it is saved. That
 * is what lets one APK be handed to several people without a rebuild.
 */
export function ServerSheet({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved?: (url: string) => void;
}): React.JSX.Element {
  const [value, setValue] = useState(apiBaseUrl());
  const [state, setState] = useState<'idle' | 'checking'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    const normalised = normaliseBaseUrl(value);
    if (!normalised) {
      setError('Enter the GRID-X server address');
      return;
    }
    setState('checking');
    setError(null);
    setOk(null);
    const previous = isDefaultBaseUrl() ? null : apiBaseUrl();
    try {
      await setBaseUrl(normalised);
      // /health is public, so this proves reachability without a session.
      await api.get('/health');
      setOk(`Connected to ${normalised}`);
      onSaved?.(normalised);
    } catch {
      await setBaseUrl(previous);
      setError('No GRID-X server answered at that address');
    } finally {
      setState('idle');
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="GRID-X server"
      subtitle="The address of the backend this device talks to"
      footer={
        <>
          <Button
            title="Save and test"
            icon="checkmark-circle-outline"
            onPress={() => void save()}
            loading={state === 'checking'}
          />
          <Button title="Close" variant="ghost" onPress={onClose} />
        </>
      }
    >
      <Field
        label="Server address"
        hint="For example gridx.oswar.in or 192.168.1.20:4000 — /api is added automatically."
      >
        <Input
          value={value}
          onChangeText={setValue}
          placeholder="https://gridx.oswar.in"
          keyboardType="url"
          autoCorrect={false}
        />
      </Field>
      {error ? <Banner tone="destructive" message={error} /> : null}
      {ok ? <Banner tone="success" message={ok} /> : null}
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.label}>Currently using</Text>
        <Text style={typography.small}>{apiBaseUrl()}</Text>
      </View>
    </Sheet>
  );
}
