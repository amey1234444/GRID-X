import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Reveal } from '@/components/motion';
import { PhotoPicker, type Attachment } from '@/components/photo-picker';
import { OptionSheet, Sheet, SelectTrigger } from '@/components/sheet';
import { useToast } from '@/components/toast';
import {
  Banner,
  Button,
  Card,
  Divider,
  ErrorState,
  FactList,
  Field,
  Input,
  LoadingState,
  SectionLabel,
  StatusPill,
  Textarea,
} from '@/components/ui';
import {
  DECISIONS_NEEDING_DEFECT,
  DEFECT_TYPES,
  INSPECTION_DECISIONS,
  INSPECTION_DECISION_LABELS,
  INSPECTION_TYPE_LABELS,
  RESPONSIBLE_PARTIES,
  type DefectType,
  type InspectionDecision,
  type InspectionType,
  type ResponsibleParty,
} from '@/lib/enums';
import type { InspectionDetail } from '@/lib/types';
import { useApiMutation, useApiQuery } from '@/lib/use-api';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import type { InspectorScreenProps } from '@/navigation/types';
import {
  Refresher,
  Screen,
  formatDateTime,
  relativeDay,
  screenStyles,
} from '@/screens/shared';
import { colors, humanise, spacing, typography } from '@/theme';

interface CompleteBody {
  decision: InspectionDecision;
  acceptedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  remarks?: string;
  photographFileIds: string[];
  defectType?: DefectType;
  probableCause?: string;
  responsibility?: ResponsibleParty;
  reworkInstructions?: string;
  deviationNote?: string;
}

/**
 * Inspection detail — the inspector's working document. Start, record results,
 * then close it out with a decision; each write posts to the same endpoint the
 * web app uses, so the server keeps owning the workflow rules.
 */
export function InspectionDetailScreen({
  navigation,
  route,
}: InspectorScreenProps<'InspectionDetail'>): React.JSX.Element {
  const { id } = route.params;
  const { data, loading, refreshing, error, refresh } = useApiQuery<InspectionDetail>(
    `/quality/inspections/${id}`,
  );
  useFocusRefresh(refresh);
  const toast = useToast();
  const [completeOpen, setCompleteOpen] = useState(false);

  const start = useApiMutation('POST', `/quality/inspections/${id}/start`, {
    onSuccess: () => {
      toast.show('Inspection started');
      refresh();
    },
  });

  const failedResults = useMemo(
    () => (data?.results ?? []).filter((result) => result.verdict === 'FAIL'),
    [data],
  );

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
        <ErrorState message={error ?? 'Inspection not found'} onRetry={refresh} />
      </Screen>
    );
  }

  const canStart = data.status === 'REQUESTED' || data.status === 'ASSIGNED';
  const canRecord = data.status === 'IN_PROGRESS';
  const closed = data.status === 'COMPLETED';

  return (
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={screenStyles.list}
        refreshControl={<Refresher refreshing={refreshing} onRefresh={refresh} />}
      >
        <Reveal>
          <Card>
            <View style={screenStyles.rowTop}>
              <View style={styles.titleWrap}>
                <Text style={typography.title}>{data.inspectionNumber}</Text>
                <Text style={typography.caption}>
                  {INSPECTION_TYPE_LABELS[data.type as InspectionType] ?? data.type} ·{' '}
                  {data.job?.jobNumber ?? '—'}
                </Text>
              </View>
              <StatusPill status={data.decision ?? data.status} />
            </View>
            <Divider />
            <FactList
              facts={[
                { label: 'Component', value: data.job?.component?.name ?? '—' },
                { label: 'Drawing code', value: data.job?.component?.componentCode ?? '—' },
                { label: 'Criticality', value: humanise(data.job?.component?.criticality ?? '—') },
                { label: 'Partner', value: data.partner?.businessName ?? 'OSWAR plant' },
                { label: 'Location', value: data.partner?.city ?? '—' },
                { label: 'Offered', value: `${data.offeredQuantity}` },
                { label: 'Inspected', value: `${data.inspectedQuantity}` },
                { label: 'Due', value: data.dueAt ? relativeDay(data.dueAt) : '—' },
              ]}
            />
          </Card>
        </Reveal>

        {failedResults.length > 0 && !closed ? (
          <View style={styles.spaced}>
            <Banner
              tone="warning"
              message={`${failedResults.length} characteristic${failedResults.length === 1 ? '' : 's'} failed. A rejection or rework decision needs a defect type.`}
            />
          </View>
        ) : null}

        {closed ? (
          <View style={styles.spaced}>
            <Card>
              <SectionLabel>Outcome</SectionLabel>
              <FactList
                facts={[
                  {
                    label: 'Decision',
                    value: INSPECTION_DECISION_LABELS[data.decision as InspectionDecision] ?? '—',
                  },
                  { label: 'Accepted', value: `${data.acceptedQuantity}`, tone: 'success' },
                  { label: 'Rejected', value: `${data.rejectedQuantity}`, tone: 'destructive' },
                  { label: 'Rework', value: `${data.reworkQuantity}`, tone: 'warning' },
                  { label: 'Closed', value: formatDateTime(data.completedAt) },
                ]}
              />
              {data.remarks ? <Text style={[typography.small, styles.remarks]}>{data.remarks}</Text> : null}
            </Card>
          </View>
        ) : (
          <View style={[styles.spaced, screenStyles.gap]}>
            {canStart ? (
              <Button
                title="Start inspection"
                icon="play"
                loading={start.submitting}
                onPress={() => void start.submit()}
              />
            ) : null}
            {canRecord ? (
              <>
                <Button
                  title={data.results.length > 0 ? 'Update measurements' : 'Record measurements'}
                  icon="create-outline"
                  onPress={() =>
                    navigation.navigate('InspectionResults', {
                      id: data.id,
                      inspectionNumber: data.inspectionNumber,
                    })
                  }
                />
                <Button
                  title="Close out inspection"
                  variant="outline"
                  icon="checkmark-done-outline"
                  onPress={() => setCompleteOpen(true)}
                />
              </>
            ) : null}
            {start.error ? <Banner tone="destructive" message={start.error} /> : null}
          </View>
        )}

        <View style={screenStyles.section}>
          <SectionLabel>
            {`Measurements${data.results.length > 0 ? ` · ${data.results.length}` : ''}`}
          </SectionLabel>
          <Card>
            {data.results.length === 0 ? (
              <Text style={typography.small}>
                No measurement recorded yet. Values entered here become the inspection record.
              </Text>
            ) : (
              data.results.map((result, index) => (
                <View key={result.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={screenStyles.rowTop}>
                    <View style={styles.titleWrap}>
                      <Text style={typography.cardTitle}>{result.characteristicName}</Text>
                      <Text style={typography.caption}>
                        {result.specification ?? 'No specification'}
                        {result.tolerance ? ` (${result.tolerance})` : ''}
                      </Text>
                    </View>
                    <StatusPill
                      status={result.verdict}
                      tone={
                        result.verdict === 'FAIL'
                          ? 'destructive'
                          : result.verdict === 'PASS'
                            ? 'success'
                            : 'muted'
                      }
                    />
                  </View>
                  <Text style={[typography.body, styles.measured]}>
                    {result.actualValue ?? result.numericValue ?? '—'}
                    {result.measuringInstrument ? `  ·  ${result.measuringInstrument}` : ''}
                  </Text>
                  {result.remarks ? <Text style={typography.caption}>{result.remarks}</Text> : null}
                </View>
              ))
            )}
          </Card>
        </View>

        {data.inspectionPlan ? (
          <View style={screenStyles.section}>
            <SectionLabel>{`Plan · ${data.inspectionPlan.name}`}</SectionLabel>
            <Card>
              {data.inspectionPlan.characteristics.map((characteristic, index) => (
                <View key={characteristic.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={screenStyles.rowTop}>
                    <View style={styles.titleWrap}>
                      <Text style={typography.body}>{characteristic.characteristic}</Text>
                      <Text style={typography.caption}>
                        {characteristic.specification}
                        {characteristic.unit ? ` ${characteristic.unit}` : ''}
                        {characteristic.measuringInstrument ? ` · ${characteristic.measuringInstrument}` : ''}
                      </Text>
                    </View>
                    {characteristic.isCritical ? <StatusPill status="CRITICAL" tone="destructive" /> : null}
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {data.photographs.length > 0 ? (
          <View style={screenStyles.section}>
            <SectionLabel>Evidence</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={screenStyles.gap}>
              {data.photographs.map((photo) => (
                <Image key={photo.id} source={{ uri: photo.url }} style={styles.photo} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {data.nonConformances.length > 0 ? (
          <View style={screenStyles.section}>
            <SectionLabel>Non-conformances</SectionLabel>
            <Card>
              {data.nonConformances.map((nc, index) => (
                <View key={nc.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={screenStyles.rowTop}>
                    <Text style={typography.cardTitle}>{nc.ncNumber}</Text>
                    <StatusPill status={nc.defectType} tone="destructive" />
                  </View>
                  <Text style={typography.caption}>{nc.quantityAffected} affected</Text>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {data.reworkOrders.length > 0 ? (
          <View style={screenStyles.section}>
            <SectionLabel>Rework</SectionLabel>
            <Card>
              {data.reworkOrders.map((rework, index) => (
                <View key={rework.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={screenStyles.rowTop}>
                    <Text style={typography.cardTitle}>{rework.reworkNumber}</Text>
                    <StatusPill status={rework.status} />
                  </View>
                  <Text style={typography.caption}>{rework.quantity} pieces</Text>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>

      <CompleteSheet
        visible={completeOpen}
        inspection={data}
        onClose={() => setCompleteOpen(false)}
        onDone={() => {
          setCompleteOpen(false);
          toast.show('Inspection closed');
          refresh();
        }}
      />
    </Screen>
  );
}

/** Decision sheet. Quantities are typed by the inspector; the server validates the split. */
function CompleteSheet({
  visible,
  inspection,
  onClose,
  onDone,
}: {
  visible: boolean;
  inspection: InspectionDetail;
  onClose: () => void;
  onDone: () => void;
}): React.JSX.Element {
  const [decision, setDecision] = useState<InspectionDecision | null>(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [defect, setDefect] = useState<DefectType | null>(null);
  const [defectOpen, setDefectOpen] = useState(false);
  const [responsibility, setResponsibility] = useState<ResponsibleParty | null>(null);
  const [responsibilityOpen, setResponsibilityOpen] = useState(false);
  const [accepted, setAccepted] = useState(String(inspection.offeredQuantity));
  const [rejected, setRejected] = useState('0');
  const [rework, setRework] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [cause, setCause] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deviation, setDeviation] = useState('');
  const [photos, setPhotos] = useState<Attachment[]>([]);

  const mutation = useApiMutation<CompleteBody>('POST', `/quality/inspections/${inspection.id}/complete`, {
    onSuccess: onDone,
  });

  const needsDefect = decision !== null && DECISIONS_NEEDING_DEFECT.includes(decision);
  const needsDeviation = decision === 'ACCEPTED_WITH_DEVIATION';

  const submit = (): void => {
    if (!decision) return;
    void mutation.submit({
      decision,
      acceptedQuantity: Number(accepted) || 0,
      rejectedQuantity: Number(rejected) || 0,
      reworkQuantity: Number(rework) || 0,
      remarks: remarks.trim() || undefined,
      photographFileIds: photos.map((photo) => photo.fileId),
      defectType: needsDefect && defect ? defect : undefined,
      probableCause: needsDefect ? cause.trim() || undefined : undefined,
      responsibility: needsDefect && responsibility ? responsibility : undefined,
      reworkInstructions: decision === 'REWORK_REQUIRED' ? instructions.trim() || undefined : undefined,
      deviationNote: needsDeviation ? deviation.trim() || undefined : undefined,
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Close out inspection"
      subtitle={`${inspection.inspectionNumber} · ${inspection.offeredQuantity} offered`}
      footer={
        <Button
          title="Submit decision"
          loading={mutation.submitting}
          disabled={!decision}
          onPress={submit}
        />
      }
    >
      {mutation.error ? <Banner tone="destructive" message={mutation.error} /> : null}

      <Field label="Decision">
        <SelectTrigger
          placeholder="Select a decision"
          label={decision ? INSPECTION_DECISION_LABELS[decision] : null}
          onPress={() => setDecisionOpen(true)}
        />
      </Field>

      <View style={styles.quantityRow}>
        <View style={styles.quantityCell}>
          <Field label="Accepted">
            <Input keyboardType="numeric" value={accepted} onChangeText={setAccepted} />
          </Field>
        </View>
        <View style={styles.quantityCell}>
          <Field label="Rejected">
            <Input keyboardType="numeric" value={rejected} onChangeText={setRejected} />
          </Field>
        </View>
        <View style={styles.quantityCell}>
          <Field label="Rework">
            <Input keyboardType="numeric" value={rework} onChangeText={setRework} />
          </Field>
        </View>
      </View>

      {needsDefect ? (
        <>
          <Field label="Defect type">
            <SelectTrigger
              placeholder="Select a defect"
              label={defect ? humanise(defect) : null}
              onPress={() => setDefectOpen(true)}
            />
          </Field>
          <Field label="Responsibility">
            <SelectTrigger
              placeholder="Who is accountable"
              label={responsibility ? humanise(responsibility) : null}
              onPress={() => setResponsibilityOpen(true)}
            />
          </Field>
          <Field label="Probable cause" hint="Optional, feeds the corrective action">
            <Textarea value={cause} onChangeText={setCause} placeholder="What went wrong" />
          </Field>
        </>
      ) : null}

      {decision === 'REWORK_REQUIRED' ? (
        <Field label="Rework instructions">
          <Textarea
            value={instructions}
            onChangeText={setInstructions}
            placeholder="What the partner must redo"
          />
        </Field>
      ) : null}

      {needsDeviation ? (
        <Field label="Deviation note">
          <Textarea value={deviation} onChangeText={setDeviation} placeholder="Why the deviation is acceptable" />
        </Field>
      ) : null}

      <Field label="Remarks">
        <Textarea value={remarks} onChangeText={setRemarks} placeholder="Notes for the record" />
      </Field>

      <PhotoPicker category="INSPECTION" attachments={photos} onChange={setPhotos} />

      <OptionSheet
        visible={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        title="Decision"
        value={decision}
        onSelect={setDecision}
        options={INSPECTION_DECISIONS.map((value) => ({
          value,
          label: INSPECTION_DECISION_LABELS[value],
        }))}
      />
      <OptionSheet
        visible={defectOpen}
        onClose={() => setDefectOpen(false)}
        title="Defect type"
        value={defect}
        onSelect={setDefect}
        options={DEFECT_TYPES.map((value) => ({ value, label: humanise(value) }))}
      />
      <OptionSheet
        visible={responsibilityOpen}
        onClose={() => setResponsibilityOpen(false)}
        title="Responsibility"
        value={responsibility}
        onSelect={setResponsibility}
        options={RESPONSIBLE_PARTIES.map((value) => ({ value, label: humanise(value) }))}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  titleWrap: { flex: 1, gap: 2 },
  spaced: { marginTop: spacing.lg, gap: spacing.md },
  measured: { marginTop: spacing.sm, color: colors.foreground, fontVariant: ['tabular-nums'] },
  remarks: { marginTop: spacing.md },
  photo: { width: 96, height: 96, borderRadius: 12, backgroundColor: colors.surfaceElevated },
  quantityRow: { flexDirection: 'row', gap: spacing.md },
  quantityCell: { flex: 1 },
});
