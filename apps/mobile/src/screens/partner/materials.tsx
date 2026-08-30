import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Reveal, StaggerItem } from '@/components/motion';
import { PhotoPicker, type Attachment } from '@/components/photo-picker';
import { Sheet } from '@/components/sheet';
import { useToast } from '@/components/toast';
import {
  Banner,
  Button,
  Card,
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
import type { MaterialIssueRow, Paginated } from '@/lib/types';
import { useApiMutation, useApiQuery } from '@/lib/use-api';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import type { PartnerScreenProps } from '@/navigation/types';
import {
  Refresher,
  Screen,
  ScreenHeader,
  formatDate,
  formatWeight,
  relativeDay,
  screenStyles,
} from '@/screens/shared';
import { spacing, typography } from '@/theme';

interface AcknowledgeBody {
  receivedWeightKg: number;
  shortageWeightKg: number;
  damageRemarks?: string;
  signatureName?: string;
  photographFileIds: string[];
}

/** Material challans issued to this partner. */
export function PartnerMaterialsScreen({
  navigation,
}: PartnerScreenProps<'PartnerMaterials'>): React.JSX.Element {
  const { data, loading, refreshing, error, refresh } = useApiQuery<Paginated<MaterialIssueRow>>(
    '/materials/issues?pageSize=100',
  );
  useFocusRefresh(refresh);

  if (loading && !data) {
    return (
      <Screen>
        <View style={screenStyles.list}>
          <ScreenHeader title="Material" />
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
  const pending = rows.filter((row) => row.acknowledgements.length === 0).length;

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
            title="Material"
            subtitle={pending > 0 ? `${pending} challan to acknowledge` : 'All challans acknowledged'}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="No challan yet"
            description="Material issued against your jobs will appear here with its challan."
          />
        }
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <Card
              onPress={() =>
                navigation.navigate('PartnerMaterialDetail', {
                  id: item.id,
                  challanNumber: item.challanNumber,
                })
              }
            >
              <View style={screenStyles.rowTop}>
                <View style={styles.head}>
                  <Text style={typography.cardTitle}>{item.challanNumber}</Text>
                  <Text style={typography.caption} numberOfLines={1}>
                    {item.job?.jobNumber ?? '—'} · {item.items.length} item
                    {item.items.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <StatusPill status={item.status} />
              </View>
              <View style={screenStyles.rowMeta}>
                <Text style={typography.caption}>{formatWeight(item.totalIssueWeightKg)}</Text>
                <Text style={typography.caption}>{relativeDay(item.issueDate)}</Text>
              </View>
            </Card>
          </StaggerItem>
        )}
      />
    </Screen>
  );
}

/** One challan, with the acknowledgement the partner owes on receipt. */
export function PartnerMaterialDetailScreen({
  route,
}: PartnerScreenProps<'PartnerMaterialDetail'>): React.JSX.Element {
  const { id } = route.params;
  const { user } = useAuth();
  const { data, loading, refreshing, error, refresh } = useApiQuery<MaterialIssueRow>(
    `/materials/issues/${id}`,
  );
  const [open, setOpen] = useState(false);
  useFocusRefresh(refresh);

  if (loading && !data) {
    return (
      <Screen edges={[]}>
        <LoadingState />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen edges={[]}>
        <ErrorState message={error ?? 'Challan not found'} onRetry={refresh} />
      </Screen>
    );
  }

  const acknowledged = data.acknowledgements.length > 0;
  const canAcknowledge = (user?.permissions.includes('material:acknowledge') ?? false) && !acknowledged;

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
                <Text style={typography.title}>{data.challanNumber}</Text>
                <Text style={typography.caption}>{data.job?.jobNumber ?? '—'}</Text>
              </View>
              <StatusPill status={data.status} />
            </View>
            <Divider />
            <FactList
              facts={[
                { label: 'Issued on', value: formatDate(data.issueDate) },
                { label: 'Total weight', value: formatWeight(data.totalIssueWeightKg) },
                { label: 'Expected return', value: formatDate(data.expectedReturnDate) },
                { label: 'Vehicle', value: data.vehicleNumber ?? '—' },
                { label: 'Driver', value: data.driverName ?? '—' },
                { label: 'Component', value: data.job?.component?.name ?? '—' },
              ]}
            />
          </Card>
        </Reveal>

        <View style={screenStyles.section}>
          <SectionLabel>Items</SectionLabel>
          <Card>
            {data.items.map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <Divider /> : null}
                <View style={screenStyles.rowTop}>
                  <View style={styles.head}>
                    <Text style={typography.body}>{item.item.name}</Text>
                    <Text style={typography.caption}>
                      {item.item.code}
                      {item.heatNumber ? ` · Heat ${item.heatNumber}` : ''}
                    </Text>
                  </View>
                  <View style={styles.itemMeta}>
                    <Text style={typography.body}>
                      {item.quantity} {item.uom.toLowerCase()}
                    </Text>
                    <Text style={typography.caption}>{formatWeight(item.issueWeightKg)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </View>

        {acknowledged ? (
          <View style={screenStyles.section}>
            <SectionLabel>Acknowledgement</SectionLabel>
            <Card>
              {data.acknowledgements.map((ack, index) => (
                <View key={ack.id}>
                  {index > 0 ? <Divider /> : null}
                  <FactList
                    facts={[
                      { label: 'Received', value: formatWeight(ack.receivedWeightKg) },
                      {
                        label: 'Shortage',
                        value: formatWeight(ack.shortageWeightKg),
                        tone: ack.shortageWeightKg > 0 ? 'destructive' : undefined,
                      },
                      { label: 'On', value: formatDate(ack.acknowledgedAt) },
                    ]}
                  />
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {canAcknowledge ? (
          <View style={screenStyles.section}>
            <Banner
              tone="warning"
              message="Weigh the material before you acknowledge. The received weight drives your reconciliation."
            />
            <View style={styles.cta}>
              <Button title="Acknowledge receipt" icon="checkmark-done-outline" onPress={() => setOpen(true)} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <AcknowledgeSheet
        visible={open}
        issue={data}
        defaultName={user?.name ?? ''}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          refresh();
        }}
      />
    </Screen>
  );
}

function AcknowledgeSheet({
  visible,
  issue,
  defaultName,
  onClose,
  onDone,
}: {
  visible: boolean;
  issue: MaterialIssueRow;
  defaultName: string;
  onClose: () => void;
  onDone: () => void;
}): React.JSX.Element {
  const toast = useToast();
  const [received, setReceived] = useState(String(issue.totalIssueWeightKg));
  const [shortage, setShortage] = useState('');
  const [damage, setDamage] = useState('');
  const [signature, setSignature] = useState(defaultName);
  const [photos, setPhotos] = useState<Attachment[]>([]);

  const mutation = useApiMutation<AcknowledgeBody>('POST', `/materials/issues/${issue.id}/acknowledge`, {
    onSuccess: () => {
      toast.show('Material acknowledged');
      onDone();
    },
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Acknowledge material"
      subtitle={issue.challanNumber}
      footer={
        <Button
          title="Acknowledge"
          disabled={received.trim() === ''}
          loading={mutation.submitting}
          onPress={() =>
            void mutation.submit({
              receivedWeightKg: Number(received) || 0,
              shortageWeightKg: Number(shortage) || 0,
              damageRemarks: damage.trim() || undefined,
              signatureName: signature.trim() || undefined,
              photographFileIds: photos.map((photo) => photo.fileId),
            })
          }
        />
      }
    >
      {mutation.error ? <Banner tone="destructive" message={mutation.error} /> : null}
      <Field label="Received weight (kg)" hint={`${issue.totalIssueWeightKg} kg on the challan`}>
        <Input keyboardType="decimal-pad" value={received} onChangeText={setReceived} />
      </Field>
      <Field label="Shortage (kg)">
        <Input keyboardType="decimal-pad" value={shortage} onChangeText={setShortage} placeholder="0" />
      </Field>
      <Field label="Damage remarks">
        <Textarea value={damage} onChangeText={setDamage} placeholder="Rust, bend, wrong grade…" />
      </Field>
      <Field label="Signed by">
        <Input value={signature} onChangeText={setSignature} placeholder="Name of the receiver" />
      </Field>
      <PhotoPicker category="MATERIAL" attachments={photos} onChange={setPhotos} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flex: 1, gap: 2 },
  itemMeta: { alignItems: 'flex-end', gap: 2 },
  cta: { marginTop: spacing.md },
});
