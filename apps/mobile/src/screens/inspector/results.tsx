import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Reveal } from '@/components/motion';
import { PhotoPicker, type Attachment } from '@/components/photo-picker';
import { useToast } from '@/components/toast';
import {
  Banner,
  Button,
  Card,
  Divider,
  ErrorState,
  Field,
  Input,
  LoadingState,
  SectionLabel,
  Segmented,
  Textarea,
} from '@/components/ui';
import { RESULT_VERDICTS, type ResultVerdict } from '@/lib/enums';
import type { InspectionDetail } from '@/lib/types';
import { useApiMutation, useApiQuery } from '@/lib/use-api';
import type { InspectorScreenProps } from '@/navigation/types';
import { Screen, screenStyles } from '@/screens/shared';
import { colors, spacing, typography } from '@/theme';

interface ResultDraft {
  key: string;
  characteristicId?: string;
  characteristicName: string;
  specification: string | null;
  tolerance: string | null;
  measuringInstrument: string | null;
  isCritical: boolean;
  actualValue: string;
  verdict: ResultVerdict;
  remarks: string;
}

interface ResultsBody {
  inspectedQuantity?: number;
  results: {
    characteristicId?: string;
    characteristicName: string;
    specification?: string;
    tolerance?: string;
    actualValue?: string;
    numericValue?: number;
    measuringInstrument?: string;
    verdict: ResultVerdict;
    sampleNumber: number;
    remarks?: string;
  }[];
  photographFileIds: string[];
}

const VERDICT_LABELS: Record<ResultVerdict, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  NOT_APPLICABLE: 'N/A',
};

/**
 * Measured-result entry. The plan's characteristics become the form; anything
 * already recorded is pre-filled so a partially inspected batch can be resumed
 * on the floor.
 */
export function InspectionResultsScreen({
  navigation,
  route,
}: InspectorScreenProps<'InspectionResults'>): React.JSX.Element {
  const { id } = route.params;
  const { data, loading, error, refresh } = useApiQuery<InspectionDetail>(`/quality/inspections/${id}`);
  const toast = useToast();
  const [drafts, setDrafts] = useState<ResultDraft[]>([]);
  const [inspected, setInspected] = useState('');
  const [photos, setPhotos] = useState<Attachment[]>([]);

  const seeded = useMemo<ResultDraft[]>(() => {
    if (!data) return [];
    const characteristics = data.inspectionPlan?.characteristics ?? [];
    if (characteristics.length > 0) {
      return characteristics.map((characteristic) => {
        const existing = data.results.find(
          (result) =>
            result.characteristicId === characteristic.id ||
            result.characteristicName === characteristic.characteristic,
        );
        return {
          key: characteristic.id,
          characteristicId: characteristic.id,
          characteristicName: characteristic.characteristic,
          specification: characteristic.specification,
          tolerance: null,
          measuringInstrument: characteristic.measuringInstrument,
          isCritical: characteristic.isCritical,
          actualValue: existing?.actualValue ?? (existing?.numericValue?.toString() ?? ''),
          verdict: (existing?.verdict as ResultVerdict | undefined) ?? 'PASS',
          remarks: existing?.remarks ?? '',
        };
      });
    }
    // No plan attached: fall back to whatever was already recorded, or one blank row.
    if (data.results.length > 0) {
      return data.results.map((result) => ({
        key: result.id,
        characteristicId: result.characteristicId ?? undefined,
        characteristicName: result.characteristicName,
        specification: result.specification,
        tolerance: result.tolerance,
        measuringInstrument: result.measuringInstrument,
        isCritical: false,
        actualValue: result.actualValue ?? result.numericValue?.toString() ?? '',
        verdict: (result.verdict as ResultVerdict) ?? 'PASS',
        remarks: result.remarks ?? '',
      }));
    }
    return [
      {
        key: 'adhoc-1',
        characteristicName: 'Visual and dimensional check',
        specification: null,
        tolerance: null,
        measuringInstrument: null,
        isCritical: false,
        actualValue: '',
        verdict: 'PASS',
        remarks: '',
      },
    ];
  }, [data]);

  useEffect(() => {
    setDrafts(seeded);
    if (data) setInspected(String(data.inspectedQuantity || data.offeredQuantity));
  }, [seeded, data]);

  const mutation = useApiMutation<ResultsBody>('POST', `/quality/inspections/${id}/results`, {
    onSuccess: () => {
      toast.show('Measurements saved');
      navigation.goBack();
    },
  });

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

  const update = (key: string, patch: Partial<ResultDraft>): void => {
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)));
  };

  const submit = (): void => {
    const results = drafts.map((draft) => {
      const numeric = Number(draft.actualValue);
      return {
        characteristicId: draft.characteristicId,
        characteristicName: draft.characteristicName,
        specification: draft.specification ?? undefined,
        tolerance: draft.tolerance ?? undefined,
        actualValue: draft.actualValue.trim() || undefined,
        numericValue: draft.actualValue.trim() !== '' && !Number.isNaN(numeric) ? numeric : undefined,
        measuringInstrument: draft.measuringInstrument ?? undefined,
        verdict: draft.verdict,
        sampleNumber: 1,
        remarks: draft.remarks.trim() || undefined,
      };
    });
    void mutation.submit({
      inspectedQuantity: Number(inspected) || undefined,
      results,
      photographFileIds: photos.map((photo) => photo.fileId),
    });
  };

  const failures = drafts.filter((draft) => draft.verdict === 'FAIL').length;

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={screenStyles.list} keyboardShouldPersistTaps="handled">
        {mutation.error ? <Banner tone="destructive" message={mutation.error} /> : null}

        <Card>
          <Field label="Inspected quantity" hint={`${data.offeredQuantity} offered for inspection`}>
            <Input keyboardType="numeric" value={inspected} onChangeText={setInspected} />
          </Field>
        </Card>

        <View style={screenStyles.section}>
          <SectionLabel>{`Characteristics · ${drafts.length}`}</SectionLabel>
          <View style={screenStyles.gap}>
            {drafts.map((draft, index) => (
              <Reveal key={draft.key} delay={Math.min(index, 6) * 40}>
                <Card>
                  <View style={screenStyles.rowTop}>
                    <View style={styles.head}>
                      <Text style={typography.cardTitle}>{draft.characteristicName}</Text>
                      <Text style={typography.caption}>
                        {draft.specification ?? 'No specification'}
                        {draft.measuringInstrument ? ` · ${draft.measuringInstrument}` : ''}
                      </Text>
                    </View>
                    {draft.isCritical ? <Text style={styles.critical}>CRITICAL</Text> : null}
                  </View>

                  <Divider />

                  <View style={screenStyles.gap}>
                    <Field label="Measured value">
                      <Input
                        value={draft.actualValue}
                        onChangeText={(value) => update(draft.key, { actualValue: value })}
                        placeholder="e.g. 24.8"
                      />
                    </Field>
                    <Segmented
                      value={draft.verdict}
                      onChange={(verdict) => update(draft.key, { verdict })}
                      options={RESULT_VERDICTS.map((value) => ({ value, label: VERDICT_LABELS[value] }))}
                    />
                    {draft.verdict === 'FAIL' ? (
                      <Field label="What deviated">
                        <Textarea
                          value={draft.remarks}
                          onChangeText={(remarks) => update(draft.key, { remarks })}
                          placeholder="Observed deviation"
                        />
                      </Field>
                    ) : null}
                  </View>
                </Card>
              </Reveal>
            ))}
          </View>
        </View>

        <View style={screenStyles.section}>
          <Card>
            <PhotoPicker category="INSPECTION" attachments={photos} onChange={setPhotos} />
          </Card>
        </View>

        <View style={screenStyles.section}>
          {failures > 0 ? (
            <View style={styles.warning}>
              <Banner
                tone="warning"
                message={`${failures} characteristic${failures === 1 ? '' : 's'} marked fail. Close the inspection with a rejection or rework decision.`}
              />
            </View>
          ) : null}
          <Button title="Save measurements" loading={mutation.submitting} onPress={submit} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flex: 1, gap: 2 },
  critical: { color: colors.destructive, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  warning: { marginBottom: spacing.md },
});
