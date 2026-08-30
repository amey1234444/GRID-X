import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Reveal } from '@/components/motion';
import { PhotoPicker, type Attachment } from '@/components/photo-picker';
import { OptionSheet, SelectTrigger, Sheet } from '@/components/sheet';
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
import { useAuth } from '@/context/auth';
import {
  DELAY_REASONS,
  INSPECTION_TYPES,
  MILESTONE_TYPES,
  RESPONSIBLE_PARTIES,
  type DelayReason,
  type InspectionType,
  type MilestoneType,
  type ResponsibleParty,
} from '@/lib/enums';
import type { JobDetail } from '@/lib/types';
import { useApiMutation, useApiQuery } from '@/lib/use-api';
import { useFocusRefresh } from '@/lib/use-focus-refresh';
import type { PartnerScreenProps } from '@/navigation/types';
import {
  Refresher,
  Screen,
  formatDate,
  formatDateTime,
  formatMoney,
  formatWeight,
  relativeDay,
  screenStyles,
} from '@/screens/shared';
import { colors, humanise, radius, spacing, typography } from '@/theme';

interface RespondBody {
  accepted: boolean;
  declineReason?: string;
}

interface MilestoneBody {
  type: MilestoneType;
  quantityCompleted?: number;
  remarks?: string;
  expectedCompletionDate?: string;
  photographFileIds: string[];
  delayReason?: DelayReason;
}

interface DelayBody {
  reason: DelayReason;
  responsibility?: ResponsibleParty;
  delayDays: number;
  detail?: string;
  expectedCompletionDate?: string;
}

interface InspectionRequestBody {
  jobId: string;
  type: InspectionType;
  offeredQuantity: number;
  remarks?: string;
  photographFileIds: string[];
}

type ActionSheet = 'RESPOND' | 'MILESTONE' | 'DELAY' | 'CLARIFY' | 'INSPECTION' | null;

/**
 * The partner's single job workspace: everything they must see about the job and
 * every write the backend allows them to make against it.
 */
export function PartnerJobDetailScreen({
  navigation,
  route,
}: PartnerScreenProps<'PartnerJobDetail'>): React.JSX.Element {
  const { id } = route.params;
  const { user } = useAuth();
  const { data, loading, refreshing, error, refresh } = useApiQuery<JobDetail>(`/jobs/${id}`);
  const [sheet, setSheet] = useState<ActionSheet>(null);
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
        <ErrorState message={error ?? 'Job not found'} onRetry={refresh} />
      </Screen>
    );
  }

  const permissions = user?.permissions ?? [];
  const awaitingResponse = data.status === 'AWAITING_PARTNER_ACCEPTANCE';
  const canRespond = awaitingResponse && permissions.includes('job:respond');
  const canUpdate =
    !awaitingResponse && permissions.includes('job_milestone:update') && data.completedAt === null;
  const canRequestInspection = permissions.includes('inspection:request') && !awaitingResponse;
  const produced = data.acceptedQuantity + data.rejectedQuantity;

  const close = (): void => setSheet(null);
  const done = (): void => {
    setSheet(null);
    refresh();
  };

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
                <Text style={typography.title}>{data.jobNumber}</Text>
                <Text style={typography.caption}>
                  {data.component.componentCode} · {data.component.name}
                </Text>
              </View>
              <StatusPill status={data.status} />
            </View>
            <Divider />
            <FactList
              facts={[
                { label: 'Quantity', value: `${data.quantity} pcs` },
                { label: 'Accepted', value: `${data.acceptedQuantity}`, tone: 'success' },
                {
                  label: 'Rejected',
                  value: `${data.rejectedQuantity}`,
                  tone: data.rejectedQuantity > 0 ? 'destructive' : undefined,
                },
                { label: 'Rework', value: `${data.reworkQuantity}` },
                { label: 'Rate', value: formatMoney(data.rate) },
                { label: 'Job value', value: formatMoney(data.rate * data.quantity) },
                { label: 'Due date', value: formatDate(data.dueDate) },
                { label: 'Priority', value: humanise(data.priority) },
                { label: 'Material', value: humanise(data.materialResponsibility) },
                { label: 'Criticality', value: humanise(data.component.criticality) },
                { label: 'Grade', value: data.component.materialGrade ?? '—' },
                {
                  label: 'Unit weight',
                  value: data.component.theoreticalWeightKg
                    ? formatWeight(data.component.theoreticalWeightKg)
                    : '—',
                },
                { label: 'Delivery', value: data.deliveryLocation ?? '—' },
              ]}
            />
            {data.notes ? (
              <>
                <Divider />
                <Text style={typography.small}>{data.notes}</Text>
              </>
            ) : null}
          </Card>
        </Reveal>

        {awaitingResponse ? (
          <View style={screenStyles.section}>
            <Banner
              tone="info"
              message="This job is offered to you. Accept it to receive the drawing and material, or decline with a reason."
            />
          </View>
        ) : null}

        <View style={screenStyles.section}>
          <View style={styles.actions}>
            {canRespond ? (
              <Button title="Respond to offer" icon="checkmark-done-outline" onPress={() => setSheet('RESPOND')} />
            ) : null}
            {canUpdate ? (
              <>
                <Button
                  title="Update production"
                  icon="construct-outline"
                  onPress={() => setSheet('MILESTONE')}
                />
                <View style={styles.actionRow}>
                  <View style={styles.actionCell}>
                    <Button
                      title="Report delay"
                      variant="outline"
                      icon="time-outline"
                      onPress={() => setSheet('DELAY')}
                    />
                  </View>
                  <View style={styles.actionCell}>
                    <Button
                      title="Ask a query"
                      variant="outline"
                      icon="help-circle-outline"
                      onPress={() => setSheet('CLARIFY')}
                    />
                  </View>
                </View>
              </>
            ) : null}
            {canRequestInspection ? (
              <Button
                title="Offer for inspection"
                variant="outline"
                icon="shield-checkmark-outline"
                onPress={() => setSheet('INSPECTION')}
              />
            ) : null}
          </View>
        </View>

        {data.drawingRevision ? (
          <View style={screenStyles.section}>
            <SectionLabel>Drawing</SectionLabel>
            <Card onPress={() => navigation.navigate('PartnerDrawings')}>
              <View style={screenStyles.rowTop}>
                <View style={styles.head}>
                  <Text style={typography.cardTitle}>{data.drawingRevision.drawing.drawingNumber}</Text>
                  <Text style={typography.caption} numberOfLines={1}>
                    {data.drawingRevision.drawing.title}
                  </Text>
                </View>
                <StatusPill status={`REV ${data.drawingRevision.revisionCode}`} tone="info" />
              </View>
            </Card>
          </View>
        ) : null}

        <View style={screenStyles.section}>
          <SectionLabel>{`Production trail · ${produced}/${data.quantity}`}</SectionLabel>
          <Card>
            {data.milestones.length === 0 ? (
              <Text style={typography.small}>No milestone reported yet.</Text>
            ) : (
              data.milestones.map((milestone, index) => (
                <View key={milestone.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={screenStyles.rowTop}>
                    <View style={styles.head}>
                      <Text style={typography.body}>{humanise(milestone.type)}</Text>
                      {milestone.remarks ? (
                        <Text style={typography.caption}>{milestone.remarks}</Text>
                      ) : null}
                    </View>
                    <View style={styles.trailMeta}>
                      {milestone.quantityCompleted !== null ? (
                        <Text style={typography.body}>{milestone.quantityCompleted}</Text>
                      ) : null}
                      <Text style={typography.caption}>{relativeDay(milestone.reportedAt)}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </Card>
        </View>

        {data.inspections.length > 0 ? (
          <View style={screenStyles.section}>
            <SectionLabel>Inspections</SectionLabel>
            <Card>
              {data.inspections.map((inspection, index) => (
                <View key={inspection.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={screenStyles.rowTop}>
                    <View style={styles.head}>
                      <Text style={typography.body}>{inspection.inspectionNumber}</Text>
                      <Text style={typography.caption}>
                        {humanise(inspection.type)} · {inspection.offeredQuantity} offered
                      </Text>
                    </View>
                    <StatusPill status={inspection.decision ?? inspection.status} />
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {data.materialIssues.length > 0 ? (
          <View style={screenStyles.section}>
            <SectionLabel>Material challans</SectionLabel>
            <Card>
              {data.materialIssues.map((issue, index) => (
                <View key={issue.id}>
                  {index > 0 ? <Divider /> : null}
                  <Pressable
                    style={screenStyles.rowTop}
                    onPress={() =>
                      navigation.navigate('PartnerMaterialDetail', {
                        id: issue.id,
                        challanNumber: issue.challanNumber,
                      })
                    }
                  >
                    <View style={styles.head}>
                      <Text style={typography.body}>{issue.challanNumber}</Text>
                      <Text style={typography.caption}>
                        {formatWeight(issue.totalIssueWeightKg)} · {formatDate(issue.issueDate)}
                      </Text>
                    </View>
                    <StatusPill status={issue.status} />
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {data.reworkOrders.length > 0 ? (
          <View style={screenStyles.section}>
            <SectionLabel>Rework</SectionLabel>
            <Card onPress={() => navigation.navigate('PartnerRework')}>
              {data.reworkOrders.map((rework, index) => (
                <View key={rework.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={screenStyles.rowTop}>
                    <Text style={typography.body}>{rework.reworkNumber}</Text>
                    <StatusPill status={rework.status} />
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {data.delays.length > 0 ? (
          <View style={screenStyles.section}>
            <SectionLabel>Delays</SectionLabel>
            <Card>
              {data.delays.map((delay, index) => (
                <View key={delay.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={screenStyles.rowTop}>
                    <View style={styles.head}>
                      <Text style={typography.body}>{humanise(delay.reason)}</Text>
                      {delay.detail ? <Text style={typography.caption}>{delay.detail}</Text> : null}
                    </View>
                    <Text style={[typography.caption, { color: colors.warning }]}>{delay.delayDays}d</Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {data.clarifications.length > 0 ? (
          <View style={screenStyles.section}>
            <SectionLabel>Queries</SectionLabel>
            <Card>
              {data.clarifications.map((clarification, index) => (
                <View key={clarification.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={styles.qa}>
                    <Text style={typography.body}>{clarification.question}</Text>
                    <View style={styles.answer}>
                      <Text style={typography.small}>
                        {clarification.answer ?? 'Waiting for OSWAR engineering to reply.'}
                      </Text>
                    </View>
                    <Text style={typography.caption}>{formatDateTime(clarification.raisedAt)}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>

      <RespondSheet visible={sheet === 'RESPOND'} job={data} onClose={close} onDone={done} />
      <MilestoneSheet visible={sheet === 'MILESTONE'} job={data} onClose={close} onDone={done} />
      <DelaySheet visible={sheet === 'DELAY'} job={data} onClose={close} onDone={done} />
      <ClarifySheet visible={sheet === 'CLARIFY'} job={data} onClose={close} onDone={done} />
      <InspectionSheet visible={sheet === 'INSPECTION'} job={data} onClose={close} onDone={done} />
    </Screen>
  );
}

interface SheetProps {
  visible: boolean;
  job: JobDetail;
  onClose: () => void;
  onDone: () => void;
}

function RespondSheet({ visible, job, onClose, onDone }: SheetProps): React.JSX.Element {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const mutation = useApiMutation<RespondBody>('POST', `/jobs/${job.id}/respond`, {
    onSuccess: () => {
      toast.show('Response sent');
      onDone();
    },
  });

  return (
    <Sheet visible={visible} onClose={onClose} title="Respond to offer" subtitle={job.jobNumber}>
      {mutation.error ? <Banner tone="destructive" message={mutation.error} /> : null}
      <Text style={typography.small}>
        {job.quantity} pieces of {job.component.name} at {formatMoney(job.rate)} each, due{' '}
        {formatDate(job.dueDate)}.
      </Text>
      <Button
        title="Accept this job"
        loading={mutation.submitting}
        onPress={() => void mutation.submit({ accepted: true })}
      />
      <Divider />
      <Field label="Decline reason" hint="Required if you cannot take the job">
        <Textarea value={reason} onChangeText={setReason} placeholder="Capacity, material, machine…" />
      </Field>
      <Button
        title="Decline"
        variant="destructive"
        disabled={reason.trim().length < 3}
        loading={mutation.submitting}
        onPress={() => void mutation.submit({ accepted: false, declineReason: reason.trim() })}
      />
    </Sheet>
  );
}

function MilestoneSheet({ visible, job, onClose, onDone }: SheetProps): React.JSX.Element {
  const toast = useToast();
  const [type, setType] = useState<MilestoneType | null>(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [expected, setExpected] = useState('');
  const [reason, setReason] = useState<DelayReason | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [photos, setPhotos] = useState<Attachment[]>([]);

  const mutation = useApiMutation<MilestoneBody>('POST', `/jobs/${job.id}/milestones`, {
    onSuccess: () => {
      toast.show('Production updated');
      onDone();
    },
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Update production"
      subtitle={job.jobNumber}
      footer={
        <Button
          title="Send update"
          disabled={!type}
          loading={mutation.submitting}
          onPress={() => {
            if (!type) return;
            void mutation.submit({
              type,
              quantityCompleted: quantity.trim() === '' ? undefined : Number(quantity),
              remarks: remarks.trim() || undefined,
              expectedCompletionDate: expected.trim() || undefined,
              delayReason: reason ?? undefined,
              photographFileIds: photos.map((photo) => photo.fileId),
            });
          }}
        />
      }
    >
      {mutation.error ? <Banner tone="destructive" message={mutation.error} /> : null}
      <Field label="Stage reached">
        <SelectTrigger
          placeholder="Select a milestone"
          label={type ? humanise(type) : null}
          onPress={() => setTypeOpen(true)}
        />
      </Field>
      <Field label="Quantity completed" hint={`${job.quantity} pieces in this job`}>
        <Input keyboardType="numeric" value={quantity} onChangeText={setQuantity} placeholder="0" />
      </Field>
      <Field label="Expected completion" hint="YYYY-MM-DD, optional">
        <Input value={expected} onChangeText={setExpected} placeholder="2026-01-31" autoCapitalize="none" />
      </Field>
      <Field label="Slipping?" hint="Tell us early so planning can react">
        <SelectTrigger
          placeholder="No delay"
          label={reason ? humanise(reason) : null}
          onPress={() => setReasonOpen(true)}
        />
      </Field>
      <Field label="Remarks">
        <Textarea value={remarks} onChangeText={setRemarks} placeholder="What was done on the shop floor" />
      </Field>
      <PhotoPicker category="MILESTONE" attachments={photos} onChange={setPhotos} />

      <OptionSheet
        visible={typeOpen}
        onClose={() => setTypeOpen(false)}
        title="Milestone"
        value={type}
        onSelect={setType}
        options={MILESTONE_TYPES.map((value) => ({ value, label: humanise(value) }))}
      />
      <OptionSheet
        visible={reasonOpen}
        onClose={() => setReasonOpen(false)}
        title="Delay reason"
        value={reason}
        onSelect={setReason}
        options={DELAY_REASONS.map((value) => ({ value, label: humanise(value) }))}
      />
    </Sheet>
  );
}

function DelaySheet({ visible, job, onClose, onDone }: SheetProps): React.JSX.Element {
  const toast = useToast();
  const [reason, setReason] = useState<DelayReason | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [responsibility, setResponsibility] = useState<ResponsibleParty | null>(null);
  const [responsibilityOpen, setResponsibilityOpen] = useState(false);
  const [days, setDays] = useState('');
  const [expected, setExpected] = useState('');
  const [detail, setDetail] = useState('');

  const mutation = useApiMutation<DelayBody>('POST', `/jobs/${job.id}/delays`, {
    onSuccess: () => {
      toast.show('Delay reported');
      onDone();
    },
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Report delay"
      subtitle={job.jobNumber}
      footer={
        <Button
          title="Report"
          disabled={!reason}
          loading={mutation.submitting}
          onPress={() => {
            if (!reason) return;
            void mutation.submit({
              reason,
              responsibility: responsibility ?? undefined,
              delayDays: Number(days) || 0,
              detail: detail.trim() || undefined,
              expectedCompletionDate: expected.trim() || undefined,
            });
          }}
        />
      }
    >
      {mutation.error ? <Banner tone="destructive" message={mutation.error} /> : null}
      <Field label="Reason">
        <SelectTrigger
          placeholder="Select a reason"
          label={reason ? humanise(reason) : null}
          onPress={() => setReasonOpen(true)}
        />
      </Field>
      <Field label="Responsibility">
        <SelectTrigger
          placeholder="Who held it up"
          label={responsibility ? humanise(responsibility) : null}
          onPress={() => setResponsibilityOpen(true)}
        />
      </Field>
      <Field label="Delay in days">
        <Input keyboardType="numeric" value={days} onChangeText={setDays} placeholder="0" />
      </Field>
      <Field label="New expected completion" hint="YYYY-MM-DD, optional">
        <Input value={expected} onChangeText={setExpected} placeholder="2026-01-31" autoCapitalize="none" />
      </Field>
      <Field label="Detail">
        <Textarea value={detail} onChangeText={setDetail} placeholder="What exactly is holding the job" />
      </Field>

      <OptionSheet
        visible={reasonOpen}
        onClose={() => setReasonOpen(false)}
        title="Delay reason"
        value={reason}
        onSelect={setReason}
        options={DELAY_REASONS.map((value) => ({ value, label: humanise(value) }))}
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

function ClarifySheet({ visible, job, onClose, onDone }: SheetProps): React.JSX.Element {
  const toast = useToast();
  const [question, setQuestion] = useState('');
  const mutation = useApiMutation<{ question: string }>('POST', `/jobs/${job.id}/clarifications`, {
    onSuccess: () => {
      toast.show('Query raised');
      setQuestion('');
      onDone();
    },
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Ask engineering"
      subtitle={job.jobNumber}
      footer={
        <Button
          title="Send query"
          disabled={question.trim().length < 5}
          loading={mutation.submitting}
          onPress={() => void mutation.submit({ question: question.trim() })}
        />
      }
    >
      {mutation.error ? <Banner tone="destructive" message={mutation.error} /> : null}
      <Field label="Your question" hint="Answers arrive as an alert on this job">
        <Textarea
          value={question}
          onChangeText={setQuestion}
          placeholder="Tolerance on the 24 mm bore is unclear…"
        />
      </Field>
    </Sheet>
  );
}

function InspectionSheet({ visible, job, onClose, onDone }: SheetProps): React.JSX.Element {
  const toast = useToast();
  const [type, setType] = useState<InspectionType>('FINAL');
  const [typeOpen, setTypeOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photos, setPhotos] = useState<Attachment[]>([]);

  const mutation = useApiMutation<InspectionRequestBody>('POST', '/quality/inspections', {
    onSuccess: () => {
      toast.show('Offered for inspection');
      onDone();
    },
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Offer for inspection"
      subtitle={job.jobNumber}
      footer={
        <Button
          title="Offer batch"
          disabled={Number(quantity) <= 0}
          loading={mutation.submitting}
          onPress={() =>
            void mutation.submit({
              jobId: job.id,
              type,
              offeredQuantity: Number(quantity),
              remarks: remarks.trim() || undefined,
              photographFileIds: photos.map((photo) => photo.fileId),
            })
          }
        />
      }
    >
      {mutation.error ? <Banner tone="destructive" message={mutation.error} /> : null}
      <Field label="Inspection type">
        <SelectTrigger placeholder="Select a type" label={humanise(type)} onPress={() => setTypeOpen(true)} />
      </Field>
      <Field label="Quantity offered" hint={`${job.quantity} in the job`}>
        <Input keyboardType="numeric" value={quantity} onChangeText={setQuantity} placeholder="0" />
      </Field>
      <Field label="Remarks">
        <Textarea value={remarks} onChangeText={setRemarks} placeholder="Anything the inspector should know" />
      </Field>
      <PhotoPicker category="INSPECTION" attachments={photos} onChange={setPhotos} />

      <OptionSheet
        visible={typeOpen}
        onClose={() => setTypeOpen(false)}
        title="Inspection type"
        value={type}
        onSelect={setType}
        options={INSPECTION_TYPES.map((value) => ({ value, label: humanise(value) }))}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flex: 1, gap: 2 },
  actions: { gap: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionCell: { flex: 1 },
  trailMeta: { alignItems: 'flex-end', gap: 2 },
  qa: { gap: spacing.sm },
  answer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.input,
    padding: spacing.md,
  },
});
