import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Reveal, StaggerItem } from '@/components/motion';
import { OptionSheet, Sheet, SelectTrigger } from '@/components/sheet';
import { useToast } from '@/components/toast';
import {
  Banner,
  Button,
  Card,
  ChipRow,
  Divider,
  EmptyState,
  ErrorState,
  FactList,
  Field,
  Input,
  LoadingState,
  SectionLabel,
  StatusPill,
  Textarea,
} from '@/components/ui';
import { useAuth } from '@/context/auth';
import { REWORK_STATUSES, type ReworkStatus } from '@/lib/enums';
import type { Paginated, ReworkRow } from '@/lib/types';
import { useApiMutation, useApiQuery } from '@/lib/use-api';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import type { InspectorScreenProps } from '@/navigation/types';
import {
  Refresher,
  Screen,
  ScreenHeader,
  formatDate,
  formatMoney,
  relativeDay,
  screenStyles,
} from '@/screens/shared';
import { humanise, spacing, typography } from '@/theme';

type ReworkFilter = 'OPEN' | 'ISSUED' | 'IN_PROGRESS' | 'READY_FOR_REINSPECTION' | 'CLOSED';

interface ReworkStatusBody {
  status: ReworkStatus;
  completedQuantity?: number;
  scrappedQuantity?: number;
  actualCost?: number;
  remarks?: string;
}

const CLOSED_STATUSES = ['COMPLETED', 'SCRAPPED'];

/** Rework orders across the inspector's plant, filtered by where they sit. */
export function ReworkListScreen({ navigation }: InspectorScreenProps<'ReworkList'>): React.JSX.Element {
  const [filter, setFilter] = useState<ReworkFilter>('OPEN');
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<ReworkRow>>(
    '/quality/rework?pageSize=100',
  );
  useFocusRefresh(refresh);

  const rows = useMemo(() => data?.data ?? [], [data]);
  const visible = useMemo(() => {
    switch (filter) {
      case 'OPEN':
        return rows.filter((row) => !CLOSED_STATUSES.includes(row.status));
      case 'CLOSED':
        return rows.filter((row) => CLOSED_STATUSES.includes(row.status));
      default:
        return rows.filter((row) => row.status === filter);
    }
  }, [filter, rows]);

  if (loading && !data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Rework" />
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

  return (
    <Screen>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={screenStyles.list}
        refreshControl={<Refresher refreshing={refreshing} onRefresh={refresh} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title="Rework" subtitle="Work sent back for correction" />
            <ChipRow
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'OPEN', label: 'Open', count: rows.filter((r) => !CLOSED_STATUSES.includes(r.status)).length },
                { value: 'ISSUED', label: 'Issued' },
                { value: 'IN_PROGRESS', label: 'In progress' },
                { value: 'READY_FOR_REINSPECTION', label: 'Re-inspect' },
                { value: 'CLOSED', label: 'Closed' },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="repeat-outline"
            title="No rework"
            description="Rework orders appear here when an inspection sends a batch back."
          />
        }
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <Card
              onPress={() =>
                navigation.navigate('ReworkDetail', { id: item.id, reworkNumber: item.reworkNumber })
              }
            >
              <View style={screenStyles.rowTop}>
                <View style={styles.head}>
                  <Text style={typography.cardTitle}>{item.reworkNumber}</Text>
                  <Text style={typography.caption} numberOfLines={1}>
                    {item.job?.component?.name ?? item.job?.jobNumber ?? '—'}
                  </Text>
                </View>
                <StatusPill status={item.status} />
              </View>
              <Text style={[typography.small, styles.body]} numberOfLines={2}>
                {item.instructions}
              </Text>
              <View style={screenStyles.rowMeta}>
                <Text style={typography.caption}>{item.quantity} pieces</Text>
                <Text style={typography.caption}>
                  {item.dueDate ? `Due ${relativeDay(item.dueDate)}` : relativeDay(item.issuedAt)}
                </Text>
              </View>
            </Card>
          </StaggerItem>
        )}
      />
    </Screen>
  );
}

/** Rework detail with the status advance an inspector is allowed to make. */
export function ReworkDetailScreen({ route }: InspectorScreenProps<'ReworkDetail'>): React.JSX.Element {
  const { id } = route.params;
  const { user } = useAuth();
  // There is no single-rework endpoint; the list is the source of truth.
  const { data: page, loading, refreshing, error, refresh } = useApiQuery<Paginated<ReworkRow>>(
    '/quality/rework?pageSize=100',
  );
  const [open, setOpen] = useState(false);
  useFocusRefresh(refresh);

  const data = page?.data.find((row) => row.id === id) ?? null;

  if (loading && !page) {
    return (
      <Screen edges={[]}>
        <LoadingState />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen edges={[]}>
        <ErrorState message={error ?? 'Rework order not found'} onRetry={refresh} />
      </Screen>
    );
  }

  const canManage = user?.permissions.includes('rework:manage') ?? false;

  return (
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={screenStyles.list}
        refreshControl={<Refresher refreshing={refreshing} onRefresh={refresh} />}
      >
        <Reveal>
          <Card>
            <View style={screenStyles.rowTop}>
              <View style={styles.head}>
                <Text style={typography.title}>{data.reworkNumber}</Text>
                <Text style={typography.caption}>{data.job?.jobNumber ?? '—'}</Text>
              </View>
              <StatusPill status={data.status} />
            </View>
            <Divider />
            <FactList
              facts={[
                { label: 'Quantity', value: `${data.quantity}` },
                { label: 'Completed', value: `${data.completedQuantity}` },
                { label: 'Scrapped', value: `${data.scrappedQuantity}`, tone: data.scrappedQuantity > 0 ? 'destructive' : undefined },
                { label: 'Estimated cost', value: formatMoney(data.estimatedCost) },
                { label: 'Actual cost', value: formatMoney(data.actualCost) },
                { label: 'Charged to', value: data.chargeToPartner ? 'Partner' : 'OSWAR' },
                { label: 'Issued', value: formatDate(data.issuedAt) },
                { label: 'Due', value: formatDate(data.dueDate) },
              ]}
            />
          </Card>
        </Reveal>

        <View style={screenStyles.section}>
          <SectionLabel>Instructions</SectionLabel>
          <Card>
            <Text style={typography.body}>{data.instructions}</Text>
          </Card>
        </View>

        {canManage && !CLOSED_STATUSES.includes(data.status) ? (
          <View style={screenStyles.section}>
            <Button title="Update status" icon="swap-vertical-outline" onPress={() => setOpen(true)} />
          </View>
        ) : null}
      </ScrollView>

      <ReworkStatusSheet
        visible={open}
        rework={data}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          refresh();
        }}
      />
    </Screen>
  );
}

function ReworkStatusSheet({
  visible,
  rework,
  onClose,
  onDone,
}: {
  visible: boolean;
  rework: ReworkRow;
  onClose: () => void;
  onDone: () => void;
}): React.JSX.Element {
  const toast = useToast();
  const [status, setStatus] = useState<ReworkStatus | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [completed, setCompleted] = useState(String(rework.completedQuantity || ''));
  const [scrapped, setScrapped] = useState(String(rework.scrappedQuantity || ''));
  const [cost, setCost] = useState(String(rework.actualCost || ''));
  const [remarks, setRemarks] = useState('');

  const mutation = useApiMutation<ReworkStatusBody>('PATCH', `/quality/rework/${rework.id}`, {
    onSuccess: () => {
      toast.show('Rework updated');
      onDone();
    },
  });

  const submit = (): void => {
    if (!status) return;
    void mutation.submit({
      status,
      completedQuantity: completed.trim() === '' ? undefined : Number(completed),
      scrappedQuantity: scrapped.trim() === '' ? undefined : Number(scrapped),
      actualCost: cost.trim() === '' ? undefined : Number(cost),
      remarks: remarks.trim() || undefined,
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Update rework"
      subtitle={rework.reworkNumber}
      footer={
        <Button title="Save" loading={mutation.submitting} disabled={!status} onPress={submit} />
      }
    >
      {mutation.error ? <Banner tone="destructive" message={mutation.error} /> : null}
      <Field label="Status">
        <SelectTrigger
          placeholder="Select a status"
          label={status ? humanise(status) : null}
          onPress={() => setStatusOpen(true)}
        />
      </Field>
      <View style={styles.row}>
        <View style={styles.cell}>
          <Field label="Completed">
            <Input keyboardType="numeric" value={completed} onChangeText={setCompleted} placeholder="0" />
          </Field>
        </View>
        <View style={styles.cell}>
          <Field label="Scrapped">
            <Input keyboardType="numeric" value={scrapped} onChangeText={setScrapped} placeholder="0" />
          </Field>
        </View>
      </View>
      <Field label="Actual cost" hint="Rupees, optional">
        <Input keyboardType="numeric" value={cost} onChangeText={setCost} placeholder="0" />
      </Field>
      <Field label="Remarks">
        <Textarea value={remarks} onChangeText={setRemarks} placeholder="What was done" />
      </Field>

      <OptionSheet
        visible={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Rework status"
        value={status}
        onSelect={setStatus}
        options={REWORK_STATUSES.map((value) => ({ value, label: humanise(value) }))}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, marginBottom: spacing.lg },
  head: { flex: 1, gap: 2 },
  body: { marginTop: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  cell: { flex: 1 },
});
