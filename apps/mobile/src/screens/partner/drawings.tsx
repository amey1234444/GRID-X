import { useState } from 'react';
import { FlatList, Linking, StyleSheet, Text, View } from 'react-native';

import { StaggerItem } from '@/components/motion';
import { Sheet } from '@/components/sheet';
import { useToast } from '@/components/toast';
import {
  Banner,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  StatusPill,
  Textarea,
} from '@/components/ui';
import { api } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import type { DrawingRow, Paginated } from '@/lib/types';
import { useApiMutation, useApiQuery } from '@/lib/use-api';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import { Refresher, Screen, ScreenHeader, formatDate, screenStyles } from '@/screens/shared';
import { spacing, typography } from '@/theme';

const log = createLogger('drawings');

interface RevisionView {
  url: string;
  revisionCode: string;
  watermark: string;
  watermarked: boolean;
}

/**
 * Released revisions shared with this partner. Opening one is an audited event on
 * the server, so the URL is always fetched through /revisions/:id/view.
 */
export function PartnerDrawingsScreen(): React.JSX.Element {
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<DrawingRow>>(
    '/drawings?pageSize=100',
  );
  const [selected, setSelected] = useState<DrawingRow | null>(null);
  useFocusRefresh(refresh);

  if (loading && !data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Drawings" />
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
          <ScreenHeader title="Drawings" subtitle="Only released revisions shared with you" />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No drawing shared"
            description="Accept a job and engineering will release its drawing to you."
          />
        }
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <Card onPress={() => setSelected(item)}>
              <View style={screenStyles.rowTop}>
                <View style={styles.head}>
                  <Text style={typography.cardTitle}>{item.drawingNumber}</Text>
                  <Text style={typography.caption} numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>
                {item.currentRevisionCode ? (
                  <StatusPill status={`REV ${item.currentRevisionCode}`} tone="info" />
                ) : null}
              </View>
              <View style={screenStyles.rowMeta}>
                <Text style={typography.caption}>{item.componentCode ?? 'No component'}</Text>
                <Text style={typography.caption}>
                  {item.releasedAt ? `Released ${formatDate(item.releasedAt)}` : 'Not released'}
                </Text>
              </View>
            </Card>
          </StaggerItem>
        )}
      />

      {selected ? (
        <RevisionSheet
          drawing={selected}
          onClose={() => setSelected(null)}
          onAcknowledged={() => {
            setSelected(null);
            refresh();
          }}
        />
      ) : null}
    </Screen>
  );
}

function RevisionSheet({
  drawing,
  onClose,
  onAcknowledged,
}: {
  drawing: DrawingRow;
  onClose: () => void;
  onAcknowledged: () => void;
}): React.JSX.Element {
  const toast = useToast();
  const revisionId = drawing.currentRevisionId;
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');

  const acknowledge = useApiMutation<{ remarks?: string }>(
    'POST',
    `/drawings/revisions/${revisionId ?? 'unknown'}/acknowledge`,
    {
      onSuccess: () => {
        toast.show('Revision acknowledged');
        onAcknowledged();
      },
    },
  );

  const open = async (action: 'VIEW' | 'DOWNLOAD'): Promise<void> => {
    if (!revisionId) return;
    setOpening(true);
    setOpenError(null);
    try {
      const view = await api.get<RevisionView>(
        `/drawings/revisions/${revisionId}/view?action=${action}`,
      );
      await Linking.openURL(view.url);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not open the drawing';
      setOpenError(message);
      log.warn('revision open failed', { drawingId: drawing.id, action });
    } finally {
      setOpening(false);
    }
  };

  return (
    <Sheet visible onClose={onClose} title={drawing.drawingNumber} subtitle={drawing.title}>
      {openError ? <Banner tone="destructive" message={openError} /> : null}
      {acknowledge.error ? <Banner tone="destructive" message={acknowledge.error} /> : null}
      {revisionId ? (
        <>
          <Banner
            tone="info"
            message={`Revision ${drawing.currentRevisionCode ?? '—'} is the only one valid for production. Opening it is logged.`}
          />
          <Button title="Open drawing" icon="eye-outline" loading={opening} onPress={() => void open('VIEW')} />
          <Button
            title="Download"
            variant="outline"
            icon="download-outline"
            loading={opening}
            onPress={() => void open('DOWNLOAD')}
          />
          <Divider />
          <Field label="Acknowledgement remarks" hint="Optional">
            <Textarea value={remarks} onChangeText={setRemarks} placeholder="Read and understood" />
          </Field>
          <Button
            title="Acknowledge revision"
            variant="outline"
            loading={acknowledge.submitting}
            onPress={() => void acknowledge.submit({ remarks: remarks.trim() || undefined })}
          />
        </>
      ) : (
        <Text style={typography.small}>This drawing has no released revision yet.</Text>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flex: 1, gap: 2 },
});
