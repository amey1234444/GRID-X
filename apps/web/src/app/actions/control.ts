'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { apiFetch } from '@/lib/session';

export interface ActionState {
  error: string | null;
  success?: string;
}

function text(data: FormData, key: string): string | undefined {
  const value = data.get(key);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function number(data: FormData, key: string): number | undefined {
  const value = text(data, key);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function bool(data: FormData, key: string): boolean {
  return data.get(key) === 'on' || data.get(key) === 'true';
}

/** Ids produced by the FileUpload control, which posts one hidden input per file. */
function fileIds(data: FormData, key: string): string[] {
  return data
    .getAll(key)
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '');
}

/**
 * Reads repeatable rows posted as `prefix.0.field`, `prefix.1.field`, … by the
 * RepeatableRows control. The row count travels in `prefix.count`.
 */
function rows(data: FormData, prefix: string, keys: string[]): Record<string, string>[] {
  const count = number(data, `${prefix}.count`) ?? 0;
  const result: Record<string, string>[] = [];
  for (let index = 0; index < count; index += 1) {
    const row: Record<string, string> = {};
    for (const key of keys) row[key] = text(data, `${prefix}.${index}.${key}`) ?? '';
    result.push(row);
  }
  return result;
}

async function send(
  path: string,
  body: Record<string, unknown>,
  revalidate: string[],
  method: 'POST' | 'PATCH' = 'POST',
): Promise<ActionState> {
  const result = await apiFetch<unknown>(path, { method, body: JSON.stringify(body) });
  if (result.error) return { error: result.error };
  for (const route of revalidate) revalidatePath(route);
  return { error: null, success: 'Saved' };
}

/** DELETE carries no body, so it gets its own helper rather than an unused argument. */
async function remove(path: string, revalidate: string[]): Promise<ActionState> {
  const result = await apiFetch<unknown>(path, { method: 'DELETE' });
  if (result.error) return { error: result.error };
  for (const route of revalidate) revalidatePath(route);
  return { error: null, success: 'Removed' };
}

/**
 * Drops keys the user left blank so a PATCH only carries the fields actually
 * edited — the API treats every property present as an intentional change.
 */
function changed(entries: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(entries).filter(([, value]) => value !== undefined && value !== ''),
  );
}

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

export async function changePartnerStatusAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const partnerId = text(data, 'partnerId');
  const toStatus = text(data, 'toStatus');
  if (!partnerId || !toStatus) return { error: 'Select a status' };
  return send(
    `/partners/${partnerId}/status`,
    { toStatus, reason: text(data, 'reason') },
    ['/app/partners', `/app/partners/${partnerId}`],
  );
}

export async function updatePartnerAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const partnerId = text(data, 'partnerId');
  if (!partnerId) return { error: 'Missing partner' };
  return send(
    `/partners/${partnerId}`,
    changed({
      businessName: text(data, 'businessName'),
      ownerName: text(data, 'ownerName'),
      phone: text(data, 'phone'),
      altPhone: text(data, 'altPhone'),
      email: text(data, 'email'),
      addressLine1: text(data, 'addressLine1'),
      addressLine2: text(data, 'addressLine2'),
      city: text(data, 'city'),
      state: text(data, 'state'),
      pincode: text(data, 'pincode'),
      distanceKm: number(data, 'distanceKm'),
      udyamNumber: text(data, 'udyamNumber'),
      gstNumber: text(data, 'gstNumber'),
      panNumber: text(data, 'panNumber'),
      bankName: text(data, 'bankName'),
      bankAccountName: text(data, 'bankAccountName'),
      bankAccountNo: text(data, 'bankAccountNo'),
      bankIfsc: text(data, 'bankIfsc'),
      level: text(data, 'level'),
      paymentTermsDays: number(data, 'paymentTermsDays'),
      maxCapacityHours: number(data, 'maxCapacityHours'),
      maxOpenJobs: number(data, 'maxOpenJobs'),
      notes: text(data, 'notes'),
    }),
    ['/app/partners', `/app/partners/${partnerId}`],
    'PATCH',
  );
}

export async function removePartnerCapabilityAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const partnerId = text(data, 'partnerId');
  const capabilityId = text(data, 'capabilityId');
  if (!partnerId || !capabilityId) return { error: 'Missing capability' };
  return remove(`/partners/${partnerId}/capabilities/${capabilityId}`, [
    `/app/partners/${partnerId}`,
  ]);
}

export async function removePartnerMachineAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const machineId = text(data, 'machineId');
  const partnerId = text(data, 'partnerId');
  if (!machineId) return { error: 'Missing machine' };
  return remove(`/partners/machines/${machineId}`, [`/app/partners/${partnerId ?? ''}`]);
}

export async function removePartnerEmployeeAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const employeeId = text(data, 'employeeId');
  const partnerId = text(data, 'partnerId');
  if (!employeeId) return { error: 'Missing team member' };
  return remove(`/partners/employees/${employeeId}`, [`/app/partners/${partnerId ?? ''}`]);
}

export async function suspendPartnerAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const partnerId = text(data, 'partnerId');
  const reason = text(data, 'reason');
  if (!partnerId || !reason) return { error: 'A suspension reason is required' };
  return send(`/partners/${partnerId}/suspend`, { reason }, ['/app/partners', `/app/partners/${partnerId}`]);
}

export async function recordPartnerAuditAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const partnerId = text(data, 'partnerId');
  if (!partnerId) return { error: 'Missing partner' };
  return send(
    `/partners/${partnerId}/audits`,
    {
      auditDate: text(data, 'auditDate'),
      auditType: text(data, 'auditType') ?? 'CAPABILITY',
      score: number(data, 'score'),
      status: text(data, 'status') ?? 'IN_PROGRESS',
      findings: text(data, 'findings'),
      reportFileId: text(data, 'reportFileId'),
      nextAuditDate: text(data, 'nextAuditDate'),
    },
    [`/app/partners/${partnerId}`],
  );
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function createJobAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const companyId = text(data, 'companyId');
  const componentId = text(data, 'componentId');
  const quantity = number(data, 'quantity');
  const dueDate = text(data, 'dueDate');
  const rate = number(data, 'rate');
  if (!companyId || !componentId || !quantity || !dueDate || rate === undefined) {
    return { error: 'Company, component, quantity, due date and rate are required' };
  }
  const result = await apiFetch<{ id: string }>('/jobs', {
    method: 'POST',
    body: JSON.stringify({
      companyId,
      componentId,
      quantity,
      dueDate,
      rate,
      source: text(data, 'source') ?? 'MANUAL',
      sourceRef: text(data, 'sourceRef'),
      customerProject: text(data, 'customerProject'),
      partnerId: text(data, 'partnerId'),
      plannedStartDate: text(data, 'plannedStartDate'),
      materialResponsibility: text(data, 'materialResponsibility') ?? 'OSWAR_SUPPLIED',
      priority: text(data, 'priority') ?? 'NORMAL',
      deliveryLocation: text(data, 'deliveryLocation'),
      notes: text(data, 'notes'),
      classAOverrideReason: text(data, 'classAOverrideReason'),
      inspectionPlanId: text(data, 'inspectionPlanId'),
      drawingRevisionId: text(data, 'drawingRevisionId'),
    }),
  });
  if (result.error) return { error: result.error };
  revalidatePath('/app/production/jobs');
  // The full-page form opens the new job; the list dialog just closes.
  if (bool(data, 'openAfterCreate') && result.data?.id) {
    redirect(`/app/production/jobs/${result.data.id}`);
  }
  return { error: null, success: result.data?.id ?? 'Created' };
}

export async function updateJobAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  if (!jobId) return { error: 'Missing job' };
  return send(
    `/jobs/${jobId}`,
    changed({
      quantity: number(data, 'quantity'),
      rate: number(data, 'rate'),
      dueDate: text(data, 'dueDate'),
      plannedStartDate: text(data, 'plannedStartDate'),
      priority: text(data, 'priority'),
      materialResponsibility: text(data, 'materialResponsibility'),
      deliveryLocation: text(data, 'deliveryLocation'),
      customerProject: text(data, 'customerProject'),
      sourceRef: text(data, 'sourceRef'),
      notes: text(data, 'notes'),
    }),
    ['/app/production/jobs', `/app/production/jobs/${jobId}`],
    'PATCH',
  );
}

export async function allocateJobAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  const partnerId = text(data, 'partnerId');
  if (!jobId || !partnerId) return { error: 'Select a partner to allocate' };
  return send(
    `/jobs/${jobId}/allocate`,
    {
      partnerId,
      rate: number(data, 'rate'),
      classAOverrideReason: text(data, 'classAOverrideReason'),
      grantDrawingAccess: data.get('grantDrawingAccess') === null ? true : bool(data, 'grantDrawingAccess'),
    },
    [`/app/production/jobs/${jobId}`, '/app/production/jobs'],
  );
}

export async function jobMilestoneAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  const type = text(data, 'type');
  if (!jobId || !type) return { error: 'Select a milestone' };
  return send(
    `/jobs/${jobId}/milestones`,
    {
      type,
      quantityCompleted: number(data, 'quantityCompleted'),
      remarks: text(data, 'remarks'),
      expectedCompletionDate: text(data, 'expectedCompletionDate'),
      delayReason: text(data, 'delayReason'),
      photographFileIds: [],
    },
    [`/app/production/jobs/${jobId}`, '/partner/jobs', `/partner/jobs/${jobId}`],
  );
}

export async function reportDelayAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  const reason = text(data, 'reason');
  if (!jobId || !reason) return { error: 'Select a delay reason' };
  return send(
    `/jobs/${jobId}/delays`,
    {
      reason,
      responsibility: text(data, 'responsibility'),
      delayDays: number(data, 'delayDays') ?? 0,
      detail: text(data, 'detail'),
      expectedCompletionDate: text(data, 'expectedCompletionDate'),
    },
    [`/app/production/jobs/${jobId}`, `/partner/jobs/${jobId}`],
  );
}

export async function respondToJobAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  if (!jobId) return { error: 'Missing job' };
  const accepted = text(data, 'accepted') === 'true';
  if (!accepted && !text(data, 'declineReason')) return { error: 'A decline reason is required' };
  return send(
    `/jobs/${jobId}/respond`,
    { accepted, declineReason: text(data, 'declineReason') },
    ['/partner', '/partner/jobs', `/partner/jobs/${jobId}`, `/app/production/jobs/${jobId}`],
  );
}

export async function raiseClarificationAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  const question = text(data, 'question');
  if (!jobId || !question) return { error: 'Type your question' };
  return send(`/jobs/${jobId}/clarifications`, { question }, [
    `/partner/jobs/${jobId}`,
    `/app/production/jobs/${jobId}`,
  ]);
}

export async function answerClarificationAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const clarificationId = text(data, 'clarificationId');
  const answer = text(data, 'answer');
  const jobId = text(data, 'jobId');
  if (!clarificationId || !answer) return { error: 'Type your answer' };
  return send(`/jobs/clarifications/${clarificationId}/answer`, { answer }, [
    `/app/production/jobs/${jobId ?? ''}`,
    '/app/production/clarifications',
  ]);
}

export async function closeJobAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  if (!jobId) return { error: 'Missing job' };
  return send(
    `/jobs/${jobId}/close`,
    { receivedQuantity: number(data, 'receivedQuantity'), remarks: text(data, 'remarks') },
    [`/app/production/jobs/${jobId}`, '/app/production/jobs'],
  );
}

export async function cancelJobAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  const reason = text(data, 'reason');
  if (!jobId || !reason) return { error: 'A cancellation reason is required' };
  return send(`/jobs/${jobId}/cancel`, { reason }, [`/app/production/jobs/${jobId}`, '/app/production/jobs']);
}

/** Closes out a delay from the Production - Delays queue once the job has recovered. */
export async function resolveDelayAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const delayId = text(data, 'delayId');
  if (!delayId) return { error: 'The delay could not be identified' };
  return send(`/jobs/delays/${delayId}/resolve`, {}, ['/app/production/delays']);
}

/**
 * Renames a role or rewrites how it reads. The permission matrix behind it stays in code, so this
 * changes what people assigning the role see, not what the role can do.
 */
export async function updateRoleAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const code = text(data, 'code');
  const name = text(data, 'name');
  const description = text(data, 'description');
  if (!code) return { error: 'The role could not be identified' };
  if (!name) return { error: 'A role needs a name' };
  return send(`/roles/${code}`, { name, description }, ['/app/admin/roles'], 'PATCH');
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

export async function createMaterialIssueAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  if (!jobId) return { error: 'Select the job this material is issued against' };

  const items = rows(data, 'items', ['itemId', 'quantity', 'uom', 'issueWeightKg', 'batchNumber', 'heatNumber'])
    .filter((row) => row.itemId)
    .map((row) => ({
      itemId: row.itemId,
      quantity: Number(row.quantity),
      uom: row.uom || 'KG',
      issueWeightKg: Number(row.issueWeightKg),
      batchNumber: row.batchNumber || undefined,
      heatNumber: row.heatNumber || undefined,
    }));

  if (items.length === 0) return { error: 'Add at least one material line' };
  const invalid = items.find(
    (item) => !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.issueWeightKg) || item.issueWeightKg <= 0,
  );
  if (invalid) return { error: 'Every material line needs a quantity and an issued weight' };

  return send(
    '/materials/issues',
    {
      jobId,
      expectedReturnDate: text(data, 'expectedReturnDate'),
      vehicleNumber: text(data, 'vehicleNumber'),
      driverName: text(data, 'driverName'),
      remarks: text(data, 'remarks'),
      photographFileIds: fileIds(data, 'photographFileIds'),
      items,
    },
    ['/app/materials/issues'],
  );
}

export async function acknowledgeMaterialAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const issueId = text(data, 'issueId');
  const receivedWeightKg = number(data, 'receivedWeightKg');
  if (!issueId || receivedWeightKg === undefined) return { error: 'Enter the weight received' };
  return send(
    `/materials/issues/${issueId}/acknowledge`,
    {
      receivedWeightKg,
      shortageWeightKg: number(data, 'shortageWeightKg') ?? 0,
      damageRemarks: text(data, 'damageRemarks'),
      signatureName: text(data, 'signatureName'),
      photographFileIds: fileIds(data, 'photographFileIds'),
    },
    ['/app/materials/issues', `/app/materials/issues/${issueId}`, '/partner/material'],
  );
}

export async function recordConsumptionAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  const itemId = text(data, 'itemId');
  const theoreticalKg = number(data, 'theoreticalKg');
  const actualKg = number(data, 'actualKg');
  if (!jobId || !itemId || theoreticalKg === undefined || actualKg === undefined) {
    return { error: 'Theoretical and actual consumption are required' };
  }
  return send(
    `/materials/jobs/${jobId}/consumption`,
    { itemId, theoreticalKg, actualKg, remarks: text(data, 'remarks') },
    ['/app/materials/reconciliation', `/app/production/jobs/${jobId}`],
  );
}

export async function recordScrapAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  const itemId = text(data, 'itemId');
  const scrapWeightKg = number(data, 'scrapWeightKg');
  if (!jobId || !itemId || scrapWeightKg === undefined) return { error: 'Enter the scrap weight' };
  return send(
    `/materials/jobs/${jobId}/scrap`,
    {
      itemId,
      scrapWeightKg,
      returnedWeightKg: number(data, 'returnedWeightKg') ?? 0,
      challanNumber: text(data, 'challanNumber'),
      remarks: text(data, 'remarks'),
    },
    ['/app/materials/reconciliation', `/app/production/jobs/${jobId}`],
  );
}

export async function reconcileMaterialAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  const itemId = text(data, 'itemId');
  if (!jobId || !itemId) return { error: 'Missing job or item' };
  return send(
    `/materials/jobs/${jobId}/reconcile`,
    {
      itemId,
      unusedReturnedKg: number(data, 'unusedReturnedKg') ?? 0,
      remarks: text(data, 'remarks'),
    },
    ['/app/materials/reconciliation', `/app/production/jobs/${jobId}`],
  );
}

// ---------------------------------------------------------------------------
// Quality
// ---------------------------------------------------------------------------

export async function requestInspectionAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  const offeredQuantity = number(data, 'offeredQuantity');
  if (!jobId || !offeredQuantity) return { error: 'Enter the quantity offered for inspection' };

  const created = await apiFetch<{ id: string }>('/quality/inspections', {
    method: 'POST',
    body: JSON.stringify({
      jobId,
      type: text(data, 'type') ?? 'FINAL',
      offeredQuantity,
      inspectionPlanId: text(data, 'inspectionPlanId'),
      remarks: text(data, 'remarks'),
      photographFileIds: fileIds(data, 'photographFileIds'),
    }),
  });
  if (created.error) return { error: created.error };

  // Requesting and assigning are two API calls; doing both here means the
  // inspector picked on the form is actually recorded against the inspection.
  const inspectorId = text(data, 'inspectorId');
  if (inspectorId && created.data?.id) {
    const assigned = await apiFetch<unknown>(`/quality/inspections/${created.data.id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ inspectorId, dueAt: text(data, 'dueAt') }),
    });
    if (assigned.error) {
      return { error: `Inspection raised, but assigning the inspector failed: ${assigned.error}` };
    }
  }

  for (const route of ['/app/quality/inspections', '/partner/inspections', `/partner/jobs/${jobId}`, '/inspector']) {
    revalidatePath(route);
  }
  return { error: null, success: 'Saved' };
}

export async function assignInspectionAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const inspectionId = text(data, 'inspectionId');
  const inspectorId = text(data, 'inspectorId');
  if (!inspectionId || !inspectorId) return { error: 'Select an inspector' };
  return send(
    `/quality/inspections/${inspectionId}/assign`,
    { inspectorId, dueAt: text(data, 'dueAt') },
    ['/app/quality/inspections', `/app/quality/inspections/${inspectionId}`, '/inspector'],
  );
}

export async function startInspectionAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const inspectionId = text(data, 'inspectionId');
  if (!inspectionId) return { error: 'Missing inspection' };
  return send(`/quality/inspections/${inspectionId}/start`, {}, [
    `/app/quality/inspections/${inspectionId}`,
    `/inspector/${inspectionId}`,
    '/inspector',
  ]);
}

export async function saveInspectionResultsAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const inspectionId = text(data, 'inspectionId');
  if (!inspectionId) return { error: 'Missing inspection' };
  const count = number(data, 'resultCount') ?? 0;
  const results: Record<string, unknown>[] = [];
  if (count === 0) {
    const characteristicName = text(data, 'characteristicName');
    if (!characteristicName) return { error: 'Record at least one characteristic' };
    results.push({
      characteristicId: text(data, 'characteristicId'),
      characteristicName,
      specification: text(data, 'specification'),
      actualValue: text(data, 'actualValue'),
      numericValue: number(data, 'numericValue'),
      measuringInstrument: text(data, 'measuringInstrument'),
      verdict: text(data, 'verdict') ?? 'PASS',
      sampleNumber: number(data, 'sampleNumber') ?? 1,
      remarks: text(data, 'remarks'),
    });
  }
  for (let index = 0; index < count; index += 1) {
    const characteristicName = text(data, `results.${index}.characteristicName`);
    if (!characteristicName) continue;
    results.push({
      characteristicId: text(data, `results.${index}.characteristicId`),
      characteristicName,
      specification: text(data, `results.${index}.specification`),
      actualValue: text(data, `results.${index}.actualValue`),
      numericValue: number(data, `results.${index}.numericValue`),
      measuringInstrument: text(data, `results.${index}.measuringInstrument`),
      verdict: text(data, `results.${index}.verdict`) ?? 'PASS',
      sampleNumber: number(data, `results.${index}.sampleNumber`) ?? 1,
      remarks: text(data, `results.${index}.remarks`),
    });
  }
  if (results.length === 0) return { error: 'Record at least one characteristic' };
  return send(
    `/quality/inspections/${inspectionId}/results`,
    {
      inspectedQuantity: number(data, 'inspectedQuantity'),
      results,
      photographFileIds: fileIds(data, 'photographFileIds'),
    },
    [`/app/quality/inspections/${inspectionId}`, `/inspector/${inspectionId}`],
  );
}

export async function completeInspectionAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const inspectionId = text(data, 'inspectionId');
  const decision = text(data, 'decision');
  if (!inspectionId || !decision) return { error: 'Select a decision' };
  return send(
    `/quality/inspections/${inspectionId}/complete`,
    {
      decision,
      acceptedQuantity: number(data, 'acceptedQuantity') ?? 0,
      rejectedQuantity: number(data, 'rejectedQuantity') ?? 0,
      reworkQuantity: number(data, 'reworkQuantity') ?? 0,
      remarks: text(data, 'remarks'),
      defectType: text(data, 'defectType'),
      probableCause: text(data, 'probableCause'),
      responsibility: text(data, 'responsibility'),
      reworkCost: number(data, 'reworkCost'),
      materialLoss: number(data, 'materialLoss'),
      customerImpact: text(data, 'customerImpact'),
      reworkInstructions: text(data, 'reworkInstructions'),
      reworkDueDate: text(data, 'reworkDueDate'),
      deviationNote: text(data, 'deviationNote'),
      photographFileIds: fileIds(data, 'photographFileIds'),
    },
    [
      `/app/quality/inspections/${inspectionId}`,
      '/app/quality/inspections',
      '/inspector',
      `/inspector/${inspectionId}`,
      // Acceptance changes the job's accepted/rejected quantities.
      ...(text(data, 'jobId') ? [`/app/production/jobs/${text(data, 'jobId')}`] : []),
    ],
  );
}

export async function updateReworkAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const reworkId = text(data, 'reworkId');
  const status = text(data, 'status');
  if (!reworkId || !status) return { error: 'Select a status' };
  return send(
    `/quality/rework/${reworkId}`,
    {
      status,
      completedQuantity: number(data, 'completedQuantity'),
      scrappedQuantity: number(data, 'scrappedQuantity'),
      actualCost: number(data, 'actualCost'),
      remarks: text(data, 'remarks'),
    },
    ['/app/quality/rework', '/inspector/rework', '/partner/inspections'],
    'PATCH',
  );
}

export async function createCorrectiveActionAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const nonConformanceId = text(data, 'nonConformanceId');
  const containment = text(data, 'containment');
  if (!nonConformanceId || !containment) return { error: 'Describe the containment action' };
  return send(
    '/quality/corrective-actions',
    {
      nonConformanceId,
      containment,
      ownerId: text(data, 'ownerId'),
      dueDate: text(data, 'dueDate'),
    },
    ['/app/quality/non-conformances', '/inspector/non-conformances'],
  );
}

/**
 * 8D progression. The API keys the record by id and the step by `stage`, so both
 * are read here under those names rather than the display labels used on screen.
 */

export async function advanceCorrectiveActionAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const actionId = text(data, 'actionId');
  const stage = text(data, 'stage');
  if (!actionId || !stage) return { error: 'Select the next stage' };
  return send(
    `/quality/corrective-actions/${actionId}`,
    {
      stage,
      containment: text(data, 'containment'),
      rootCause: text(data, 'rootCause'),
      correctiveAction: text(data, 'correctiveAction'),
      verification: text(data, 'verification'),
    },
    [
      '/app/quality/non-conformances',
      '/app/quality/corrective-actions',
      '/inspector/non-conformances',
    ],
    'PATCH',
  );
}

// ---------------------------------------------------------------------------
// Logistics
// ---------------------------------------------------------------------------

export async function createShipmentAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const companyId = text(data, 'companyId');
  const direction = text(data, 'direction');
  const pickupLocation = text(data, 'pickupLocation');
  const deliveryLocation = text(data, 'deliveryLocation');
  const plannedPickupAt = text(data, 'plannedPickupAt');
  if (!companyId || !direction || !pickupLocation || !deliveryLocation || !plannedPickupAt) {
    return { error: 'Direction, both locations and the planned pickup date are required' };
  }
  return send(
    '/logistics/shipments',
    {
      companyId,
      direction,
      fromPartnerId: text(data, 'fromPartnerId'),
      toPartnerId: text(data, 'toPartnerId'),
      pickupLocation,
      deliveryLocation,
      materialType: text(data, 'materialType'),
      weightKg: number(data, 'weightKg') ?? 0,
      vehicleId: text(data, 'vehicleId'),
      driverName: text(data, 'driverName'),
      driverPhone: text(data, 'driverPhone'),
      plannedPickupAt,
      expectedDeliveryAt: text(data, 'expectedDeliveryAt'),
      transportCost: number(data, 'transportCost') ?? 0,
      remarks: text(data, 'remarks'),
      items: rows(data, 'items', ['jobId', 'description', 'quantity', 'weightKg'])
        .filter((row) => row.description)
        .map((row) => ({
          jobId: row.jobId || undefined,
          description: row.description,
          quantity: Number(row.quantity) || 0,
          weightKg: Number(row.weightKg) || 0,
        })),
    },
    ['/app/logistics/shipments'],
  );
}

export async function updateShipmentStatusAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const shipmentId = text(data, 'shipmentId');
  const status = text(data, 'status');
  if (!shipmentId || !status) return { error: 'Select a status' };
  return send(
    `/logistics/shipments/${shipmentId}/status`,
    {
      status,
      actualPickupAt: text(data, 'actualPickupAt'),
      actualDeliveryAt: text(data, 'actualDeliveryAt'),
      remarks: text(data, 'remarks'),
    },
    ['/app/logistics/shipments'],
    'PATCH',
  );
}

export async function createVehicleAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const registrationNo = text(data, 'registrationNo');
  const vehicleType = text(data, 'vehicleType');
  if (!registrationNo || !vehicleType) return { error: 'Registration number and type are required' };
  return send(
    '/logistics/vehicles',
    {
      registrationNo,
      vehicleType,
      capacityKg: number(data, 'capacityKg'),
      ownerName: text(data, 'ownerName'),
      driverName: text(data, 'driverName'),
      driverPhone: text(data, 'driverPhone'),
    },
    ['/app/logistics/vehicles'],
  );
}

// ---------------------------------------------------------------------------
// Tooling
// ---------------------------------------------------------------------------

export async function createToolAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const companyId = text(data, 'companyId');
  const description = text(data, 'description');
  if (!companyId || !description) return { error: 'A description is required' };
  return send(
    '/tooling/tools',
    {
      companyId,
      category: text(data, 'category') ?? 'TOOL',
      description,
      ownerName: text(data, 'ownerName') ?? 'OSWAR',
      condition: text(data, 'condition') ?? 'GOOD',
      calibrationRequired: bool(data, 'calibrationRequired'),
      calibrationFrequencyDays: number(data, 'calibrationFrequencyDays'),
      replacementValue: number(data, 'replacementValue') ?? 0,
      photoFileId: text(data, 'photoFileId'),
    },
    ['/app/tooling'],
  );
}

export async function issueToolAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const toolId = text(data, 'toolId');
  const partnerId = text(data, 'partnerId');
  if (!toolId || !partnerId) return { error: 'Select a partner' };
  return send(
    `/tooling/tools/${toolId}/issue`,
    {
      partnerId,
      jobId: text(data, 'jobId'),
      expectedReturnDate: text(data, 'expectedReturnDate'),
      conditionOnIssue: text(data, 'conditionOnIssue') ?? 'GOOD',
      remarks: text(data, 'remarks'),
    },
    ['/app/tooling'],
  );
}

export async function returnToolAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const issueId = text(data, 'issueId');
  if (!issueId) return { error: 'Missing tool issue' };
  return send(
    `/tooling/issues/${issueId}/return`,
    { conditionOnReturn: text(data, 'conditionOnReturn') ?? 'GOOD', remarks: text(data, 'remarks') },
    ['/app/tooling'],
  );
}

export async function calibrateToolAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const toolId = text(data, 'toolId');
  if (!toolId) return { error: 'Missing tool' };
  return send(
    `/tooling/tools/${toolId}/calibrations`,
    {
      calibratedAt: text(data, 'calibratedAt'),
      nextDueAt: text(data, 'nextDueAt'),
      agency: text(data, 'agency'),
      certificateNo: text(data, 'certificateNo'),
      result: text(data, 'result'),
    },
    ['/app/tooling'],
  );
}

// ---------------------------------------------------------------------------
// Commercials
// ---------------------------------------------------------------------------

export async function createRateAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const companyId = text(data, 'companyId');
  const partnerId = text(data, 'partnerId');
  const componentId = text(data, 'componentId');
  const conversionRate = number(data, 'conversionRate');
  const effectiveFrom = text(data, 'effectiveFrom');
  if (!companyId || !partnerId || !componentId || !conversionRate || !effectiveFrom) {
    return { error: 'Partner, component, rate and effective date are required' };
  }
  return send(
    '/commercials/rates',
    {
      companyId,
      partnerId,
      componentId,
      conversionRate,
      effectiveFrom,
      effectiveTo: text(data, 'effectiveTo'),
      minimumBatch: number(data, 'minimumBatch') ?? 1,
      revisionNote: text(data, 'revisionNote'),
    },
    ['/app/commercial/rates'],
  );
}

export async function submitInvoiceAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const jobIds = data.getAll('jobIds').filter((value): value is string => typeof value === 'string');
  if (jobIds.length === 0) return { error: 'Select at least one accepted job' };
  return send(
    '/commercials/invoices',
    {
      partnerId: text(data, 'partnerId'),
      partnerInvoiceNo: text(data, 'partnerInvoiceNo'),
      periodFrom: text(data, 'periodFrom'),
      periodTo: text(data, 'periodTo'),
      jobIds,
      fileId: text(data, 'fileId'),
      taxPercent: number(data, 'taxPercent') ?? 0,
    },
    ['/app/commercial/invoices', '/partner/invoices'],
  );
}

export async function invoiceStageAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const invoiceId = text(data, 'invoiceId');
  const stage = text(data, 'stage');
  if (!invoiceId || !stage) return { error: 'Missing invoice stage' };
  const paths: Record<string, string> = {
    quantity: 'verify-quantity',
    quality: 'verify-quality',
    material: 'verify-material',
    approve: 'approve',
  };
  const segment = paths[stage];
  if (!segment) return { error: 'Unknown stage' };
  return send(
    `/commercials/invoices/${invoiceId}/${segment}`,
    { approved: text(data, 'approved') !== 'false', remarks: text(data, 'remarks') },
    ['/app/commercial/invoices', `/app/commercial/invoices/${invoiceId}`],
  );
}

export async function holdInvoiceAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const invoiceId = text(data, 'invoiceId');
  const holdReason = text(data, 'holdReason');
  if (!invoiceId || !holdReason) return { error: 'A hold reason is required' };
  return send(`/commercials/invoices/${invoiceId}/hold`, { holdReason }, [
    '/app/commercial/invoices',
    `/app/commercial/invoices/${invoiceId}`,
  ]);
}

export async function scheduleInvoiceAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const invoiceId = text(data, 'invoiceId');
  const paymentScheduledFor = text(data, 'paymentScheduledFor');
  if (!invoiceId || !paymentScheduledFor) return { error: 'Pick a payment date' };
  return send(`/commercials/invoices/${invoiceId}/schedule`, { paymentScheduledFor }, [
    '/app/commercial/invoices',
    `/app/commercial/invoices/${invoiceId}`,
  ]);
}

export async function recordPaymentAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const invoiceId = text(data, 'invoiceId');
  const amount = number(data, 'amount');
  if (!invoiceId || !amount) return { error: 'Enter the amount paid' };
  return send(
    `/commercials/invoices/${invoiceId}/payments`,
    {
      amount,
      mode: text(data, 'mode') ?? 'NEFT',
      referenceNo: text(data, 'referenceNo'),
      paidAt: text(data, 'paidAt'),
      remarks: text(data, 'remarks'),
    },
    ['/app/commercial/invoices', `/app/commercial/invoices/${invoiceId}`, '/partner/invoices'],
  );
}

export async function createDeductionAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const partnerId = text(data, 'partnerId');
  const type = text(data, 'type');
  const reason = text(data, 'reason');
  const amount = number(data, 'amount');
  if (!partnerId || !type || !reason || !amount) {
    return { error: 'Partner, type, reason and amount are required' };
  }
  return send(
    '/commercials/adjustments',
    { partnerId, invoiceId: text(data, 'invoiceId'), type, reason, amount },
    ['/app/commercial/invoices', '/app/commercial/incentives'],
  );
}

// ---------------------------------------------------------------------------
// Capacity, scorecards, drawings, IMS and administration
// ---------------------------------------------------------------------------

/** Standing bonus/penalty rules applied when partner invoices are built. */
export async function createIncentiveRuleAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const type = text(data, 'type');
  const name = text(data, 'name');
  if (!type || !name) return { error: 'Give the rule a name and a type' };
  const percentage = number(data, 'percentage');
  const fixedAmount = number(data, 'fixedAmount');
  if (percentage === undefined && fixedAmount === undefined) {
    return { error: 'Set either a percentage or a fixed amount' };
  }
  return send(
    '/commercials/incentive-rules',
    {
      partnerId: text(data, 'partnerId'),
      type,
      name,
      percentage,
      fixedAmount,
      condition: text(data, 'condition'),
    },
    ['/app/commercial/incentives'],
  );
}

export async function declareCapacityAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const processCode = text(data, 'processCode');
  const periodStart = text(data, 'periodStart');
  const periodEnd = text(data, 'periodEnd');
  const availableHours = number(data, 'availableHours');
  if (!processCode || !periodStart || !periodEnd || availableHours === undefined) {
    return { error: 'Process, period and available hours are required' };
  }
  return send(
    '/capacity/declarations',
    {
      partnerId: text(data, 'partnerId'),
      processCode,
      periodType: text(data, 'periodType') ?? 'WEEKLY',
      periodStart,
      periodEnd,
      availableHours,
      availableWorkers: number(data, 'availableWorkers') ?? 0,
      availableMachines: number(data, 'availableMachines') ?? 0,
      maintenanceShutdownHours: number(data, 'maintenanceShutdownHours') ?? 0,
      expectedBottleneck: text(data, 'expectedBottleneck'),
    },
    ['/app/production/capacity', '/partner'],
  );
}

export async function computeScorecardsAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const periodMonth = number(data, 'periodMonth');
  const periodYear = number(data, 'periodYear');
  if (!periodMonth || !periodYear) return { error: 'Select a period' };
  return send(
    '/scorecards/compute',
    { partnerId: text(data, 'partnerId'), periodMonth, periodYear },
    ['/app/partners/scorecards', '/app'],
  );
}

export async function grantDrawingAccessAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const revisionId = text(data, 'revisionId');
  const partnerId = text(data, 'partnerId');
  if (!revisionId || !partnerId) return { error: 'Select a partner' };
  return send(
    `/drawings/revisions/${revisionId}/access`,
    {
      partnerId,
      jobId: text(data, 'jobId'),
      mode: text(data, 'mode') ?? 'VIEW_ONLY',
      expiresAt: text(data, 'expiresAt'),
    },
    ['/app/engineering/drawings', `/app/engineering/drawings/${text(data, 'drawingId') ?? ''}`],
  );
}

export async function releaseRevisionAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const revisionId = text(data, 'revisionId');
  if (!revisionId) return { error: 'Missing revision' };
  return send(
    `/drawings/revisions/${revisionId}/release`,
    { notifyPartners: true, issueDate: text(data, 'issueDate'), expiryDate: text(data, 'expiryDate') },
    ['/app/engineering/drawings', `/app/engineering/drawings/${text(data, 'drawingId') ?? ''}`],
  );
}

export async function revisionStageAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const revisionId = text(data, 'revisionId');
  const stage = text(data, 'stage');
  if (!revisionId || !stage) return { error: 'Missing revision stage' };
  if (stage !== 'submit' && stage !== 'approve') return { error: 'Unknown stage' };
  return send(`/drawings/revisions/${revisionId}/${stage}`, {}, [
    '/app/engineering/drawings',
    `/app/engineering/drawings/${text(data, 'drawingId') ?? ''}`,
  ]);
}

export async function acknowledgeRevisionAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const revisionId = text(data, 'revisionId');
  if (!revisionId) return { error: 'Missing revision' };
  return send(
    `/drawings/revisions/${revisionId}/acknowledge`,
    { remarks: text(data, 'remarks') },
    ['/partner/drawings', '/partner'],
  );
}

export async function imsSyncAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const direction = text(data, 'direction');
  const entity = text(data, 'entity');
  if (!direction || !entity) return { error: 'Select an entity to sync' };
  if (direction === 'pull') {
    return send('/ims/pull', { entity }, ['/app/ims']);
  }
  const recordRef = text(data, 'recordRef');
  if (!recordRef) return { error: 'A GRID-X record id is required to push to IMS' };
  return send('/ims/push', { entity, recordRef }, ['/app/ims']);
}

export async function createUserAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const name = text(data, 'name');
  const roleCode = text(data, 'roleCode');
  if (!name || !roleCode) return { error: 'Name and role are required' };
  const companyIds = data
    .getAll('companyIds')
    .filter((value): value is string => typeof value === 'string');
  return send(
    '/users',
    {
      name,
      roleCode,
      email: text(data, 'email'),
      phone: text(data, 'phone'),
      partnerId: text(data, 'partnerId'),
      designation: text(data, 'designation'),
      language: text(data, 'language') ?? 'EN',
      password: text(data, 'password'),
      twoFactorEnabled: bool(data, 'twoFactorEnabled'),
      companyIds,
    },
    ['/app/admin/users'],
  );
}

export async function updateUserAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const userId = text(data, 'userId');
  if (!userId) return { error: 'Missing user' };
  const companyIds = data
    .getAll('companyIds')
    .filter((value): value is string => typeof value === 'string');
  return send(
    `/users/${userId}`,
    {
      ...changed({
        name: text(data, 'name'),
        email: text(data, 'email'),
        phone: text(data, 'phone'),
        roleCode: text(data, 'roleCode'),
        designation: text(data, 'designation'),
        language: text(data, 'language'),
        status: text(data, 'status'),
      }),
      twoFactorEnabled: bool(data, 'twoFactorEnabled'),
      ...(companyIds.length > 0 ? { companyIds } : {}),
    },
    ['/app/admin/users'],
    'PATCH',
  );
}

export async function suspendUserAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const userId = text(data, 'userId');
  const reason = text(data, 'reason');
  if (!userId || !reason) return { error: 'A reason is required' };
  return send(`/users/${userId}/suspend`, { reason }, ['/app/admin/users']);
}

export async function createCompanyAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const code = text(data, 'code');
  const name = text(data, 'name');
  if (!code || !name) return { error: 'Code and name are required' };
  return send(
    '/companies',
    {
      code,
      name,
      legalName: text(data, 'legalName'),
      gstNumber: text(data, 'gstNumber'),
      addressLine1: text(data, 'addressLine1'),
      city: text(data, 'city'),
      state: text(data, 'state'),
      pincode: text(data, 'pincode'),
    },
    ['/app/admin/companies'],
  );
}

export async function updateSettingAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const key = text(data, 'key');
  const raw = text(data, 'value');
  if (!key || raw === undefined) return { error: 'Provide a value' };
  let value: unknown = raw;
  try {
    value = JSON.parse(raw);
  } catch {
    value = raw;
  }
  return send(`/settings/${key}`, { value }, ['/app/admin/settings'], 'PATCH');
}

// ---------------------------------------------------------------------------
// Partner onboarding and profile
// ---------------------------------------------------------------------------

export async function createPartnerAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const companyId = text(data, 'companyId');
  const businessName = text(data, 'businessName');
  const ownerName = text(data, 'ownerName');
  const phone = text(data, 'phone');
  const addressLine1 = text(data, 'addressLine1');
  const city = text(data, 'city');
  const state = text(data, 'state');
  const pincode = text(data, 'pincode');
  if (
    !companyId ||
    !businessName ||
    !ownerName ||
    !phone ||
    !addressLine1 ||
    !city ||
    !state ||
    !pincode
  ) {
    return { error: 'Business, owner, phone, address, city, state and pincode are required' };
  }
  return send(
    '/partners',
    {
      companyId,
      businessName,
      ownerName,
      phone,
      altPhone: text(data, 'altPhone'),
      email: text(data, 'email'),
      addressLine1,
      addressLine2: text(data, 'addressLine2'),
      city,
      state,
      pincode,
      distanceKm: number(data, 'distanceKm'),
      udyamNumber: text(data, 'udyamNumber'),
      gstNumber: text(data, 'gstNumber'),
      panNumber: text(data, 'panNumber'),
      bankName: text(data, 'bankName'),
      bankAccountName: text(data, 'bankAccountName'),
      bankAccountNo: text(data, 'bankAccountNo'),
      bankIfsc: text(data, 'bankIfsc'),
      level: text(data, 'level') ?? 'L2_SMALL',
      paymentTermsDays: number(data, 'paymentTermsDays') ?? 30,
      maxCapacityHours: number(data, 'maxCapacityHours') ?? 0,
      maxOpenJobs: number(data, 'maxOpenJobs') ?? 10,
      notes: text(data, 'notes'),
    },
    ['/app/partners'],
  );
}

export async function addPartnerCapabilityAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const partnerId = text(data, 'partnerId');
  const process = text(data, 'process');
  if (!partnerId || !process) return { error: 'Select a process' };
  return send(
    `/partners/${partnerId}/capabilities`,
    {
      process,
      isCapable: true,
      isApproved: bool(data, 'isApproved'),
      maxSizeMm: number(data, 'maxSizeMm'),
      maxWeightKg: number(data, 'maxWeightKg'),
      toleranceMm: number(data, 'toleranceMm'),
      monthlyCapacityHours: number(data, 'monthlyCapacityHours') ?? 0,
      remarks: text(data, 'remarks'),
    },
    [`/app/partners/${partnerId}`],
  );
}

export async function addPartnerMachineAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const partnerId = text(data, 'partnerId');
  const machineType = text(data, 'machineType');
  if (!partnerId || !machineType) return { error: 'Machine type is required' };
  return send(
    `/partners/${partnerId}/machines`,
    {
      machineType,
      make: text(data, 'make'),
      model: text(data, 'model'),
      size: text(data, 'size'),
      capacity: text(data, 'capacity'),
      accuracy: text(data, 'accuracy'),
      condition: text(data, 'condition') ?? 'GOOD',
      ownership: text(data, 'ownership') ?? 'OWNED',
      quantity: number(data, 'quantity') ?? 1,
      photoFileId: text(data, 'photoFileId'),
      lastServicedAt: text(data, 'lastServicedAt'),
    },
    [`/app/partners/${partnerId}`],
  );
}

/** Compliance documents — Udyam, GST, ISO certificates and similar. */
export async function addPartnerDocumentAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const partnerId = text(data, 'partnerId');
  const type = text(data, 'type');
  if (!partnerId || !type) return { error: 'Select the document type' };
  return send(
    `/partners/${partnerId}/documents`,
    {
      type,
      documentNo: text(data, 'documentNo'),
      fileId: text(data, 'fileId'),
      issueDate: text(data, 'issueDate'),
      expiryDate: text(data, 'expiryDate'),
      remarks: text(data, 'remarks'),
    },
    [`/app/partners/${partnerId}`],
  );
}

export async function verifyPartnerDocumentAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const documentId = text(data, 'documentId');
  const partnerId = text(data, 'partnerId');
  if (!documentId) return { error: 'Missing document' };
  return send(
    `/partners/documents/${documentId}/verify`,
    {},
    partnerId ? [`/app/partners/${partnerId}`] : ['/app/partners'],
  );
}

export async function addPartnerEmployeeAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const partnerId = text(data, 'partnerId');
  const name = text(data, 'name');
  if (!partnerId || !name) return { error: 'Employee name is required' };
  return send(
    `/partners/${partnerId}/employees`,
    {
      name,
      skill: text(data, 'skill'),
      phone: text(data, 'phone'),
      isSupervisor: bool(data, 'isSupervisor'),
    },
    [`/app/partners/${partnerId}`],
  );
}

// ---------------------------------------------------------------------------
// Engineering masters
// ---------------------------------------------------------------------------

export async function createComponentAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const companyId = text(data, 'companyId');
  const componentCode = text(data, 'componentCode');
  const name = text(data, 'name');
  const primaryProcess = text(data, 'primaryProcess');
  if (!companyId || !componentCode || !name || !primaryProcess) {
    return { error: 'Code, name and primary process are required' };
  }
  return send(
    '/components',
    {
      companyId,
      componentCode,
      name,
      primaryProcess,
      productId: text(data, 'productId'),
      drawingNumber: text(data, 'drawingNumber'),
      materialGrade: text(data, 'materialGrade'),
      theoreticalWeightKg: number(data, 'theoreticalWeightKg'),
      inspectionLevel: text(data, 'inspectionLevel') ?? 'LEVEL_2_SAMPLING',
      criticality: text(data, 'criticality') ?? 'CLASS_C',
      standardCycleTimeMinutes: number(data, 'standardCycleTimeMinutes'),
      standardConversionRate: number(data, 'standardConversionRate'),
      packagingRequirement: text(data, 'packagingRequirement'),
      outsourcingEligibilityScore: number(data, 'outsourcingEligibilityScore') ?? 50,
      scrapAllowancePercent: number(data, 'scrapAllowancePercent') ?? 5,
    },
    ['/app/engineering/components'],
  );
}

export async function updateComponentAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const componentId = text(data, 'componentId');
  if (!componentId) return { error: 'Missing component' };
  return send(
    `/components/${componentId}`,
    changed({
      componentCode: text(data, 'componentCode'),
      name: text(data, 'name'),
      productId: text(data, 'productId'),
      drawingNumber: text(data, 'drawingNumber'),
      materialGrade: text(data, 'materialGrade'),
      theoreticalWeightKg: number(data, 'theoreticalWeightKg'),
      primaryProcess: text(data, 'primaryProcess'),
      inspectionLevel: text(data, 'inspectionLevel'),
      criticality: text(data, 'criticality'),
      standardCycleTimeMinutes: number(data, 'standardCycleTimeMinutes'),
      standardConversionRate: number(data, 'standardConversionRate'),
      packagingRequirement: text(data, 'packagingRequirement'),
      outsourcingEligibilityScore: number(data, 'outsourcingEligibilityScore'),
      scrapAllowancePercent: number(data, 'scrapAllowancePercent'),
    }),
    ['/app/engineering/components', `/app/engineering/components/${componentId}`],
    'PATCH',
  );
}

/** Bill of material lines: which items a component consumes, per unit. */
export async function addComponentItemAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const componentId = text(data, 'componentId');
  const itemId = text(data, 'itemId');
  const quantityPerUnit = number(data, 'quantityPerUnit');
  if (!componentId || !itemId || !quantityPerUnit) {
    return { error: 'Select an item and the quantity consumed per unit' };
  }
  return send(
    `/components/${componentId}/items`,
    { itemId, quantityPerUnit, uom: text(data, 'uom') ?? 'KG' },
    [`/app/engineering/components/${componentId}`],
  );
}

export async function removeComponentItemAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const itemId = text(data, 'componentItemId');
  const componentId = text(data, 'componentId');
  if (!itemId) return { error: 'Missing bill of material line' };
  return remove(`/components/items/${itemId}`, [`/app/engineering/components/${componentId ?? ''}`]);
}

export async function removeComponentProcessAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const processId = text(data, 'componentProcessId');
  const componentId = text(data, 'componentId');
  if (!processId) return { error: 'Missing routing step' };
  return remove(`/components/processes/${processId}`, [
    `/app/engineering/components/${componentId ?? ''}`,
  ]);
}

export async function removeApprovedPartnerAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const approvalId = text(data, 'approvalId');
  const componentId = text(data, 'componentId');
  if (!approvalId) return { error: 'Missing approval' };
  return remove(`/components/approved-partners/${approvalId}`, [
    `/app/engineering/components/${componentId ?? ''}`,
  ]);
}

export async function approvePartnerComponentAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const componentId = text(data, 'componentId');
  const partnerId = text(data, 'partnerId');
  if (!componentId || !partnerId) return { error: 'Select a partner' };
  return send(
    `/components/${componentId}/approved-partners`,
    {
      partnerId,
      firstArticleDone: bool(data, 'firstArticleDone'),
      remarks: text(data, 'remarks'),
    },
    [`/app/engineering/components/${componentId}`],
  );
}

export async function addComponentProcessAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const componentId = text(data, 'componentId');
  const processCode = text(data, 'processCode');
  if (!componentId || !processCode) return { error: 'Select a process' };
  return send(
    `/components/${componentId}/processes`,
    {
      processCode,
      sequence: number(data, 'sequence') ?? 1,
      cycleTimeMinutes: number(data, 'cycleTimeMinutes'),
      isOutsourced: data.get('isOutsourced') === null ? true : bool(data, 'isOutsourced'),
      remarks: text(data, 'remarks'),
    },
    [`/app/engineering/components/${componentId}`],
  );
}

export async function createItemAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const code = text(data, 'code');
  const name = text(data, 'name');
  if (!code || !name) return { error: 'Item code and name are required' };
  return send(
    '/items',
    {
      code,
      name,
      uom: text(data, 'uom') ?? 'KG',
      materialGrade: text(data, 'materialGrade'),
      unitWeightKg: number(data, 'unitWeightKg'),
      standardRate: number(data, 'standardRate'),
    },
    ['/app/engineering/masters'],
  );
}

export async function createProductAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const companyId = text(data, 'companyId');
  const code = text(data, 'code');
  const name = text(data, 'name');
  if (!companyId || !code || !name) return { error: 'Product code and name are required' };
  return send(
    '/products',
    { companyId, code, name, description: text(data, 'description') },
    ['/app/engineering/masters'],
  );
}

export async function createDrawingAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const companyId = text(data, 'companyId');
  const drawingNumber = text(data, 'drawingNumber');
  const title = text(data, 'title');
  if (!companyId || !drawingNumber || !title) return { error: 'Drawing number and title are required' };
  return send(
    '/drawings',
    {
      companyId,
      drawingNumber,
      title,
      componentId: text(data, 'componentId'),
      description: text(data, 'description'),
    },
    ['/app/engineering/drawings'],
  );
}

export async function raiseEngineeringChangeAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const title = text(data, 'title');
  const description = text(data, 'description');
  if (!title || !description) return { error: 'Title and description are required' };
  return send(
    '/drawings/engineering-changes',
    {
      drawingId: text(data, 'drawingId'),
      revisionId: text(data, 'revisionId'),
      title,
      description,
      impact: text(data, 'impact'),
    },
    ['/app/engineering/drawings', '/app/engineering/changes'],
  );
}

export async function decideEngineeringChangeAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const changeId = text(data, 'changeId');
  const status = text(data, 'status');
  if (!changeId || !status) return { error: 'Select a decision' };
  return send(
    `/drawings/engineering-changes/${changeId}/decision`,
    { status, note: text(data, 'note') },
    ['/app/engineering/changes'],
  );
}

export async function createInspectionPlanAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const companyId = text(data, 'companyId');
  const componentId = text(data, 'componentId');
  const name = text(data, 'name');
  if (!companyId || !componentId || !name) {
    return { error: 'Component and plan name are required' };
  }

  const characteristics = rows(data, 'characteristics', [
    'characteristic',
    'specification',
    'unit',
    'measuringInstrument',
    'nominalValue',
    'upperTolerance',
    'lowerTolerance',
    'isCritical',
  ])
    .filter((row) => row.characteristic && row.specification)
    .map((row, index) => ({
      sequence: index + 1,
      characteristic: row.characteristic,
      specification: row.specification,
      unit: row.unit || undefined,
      measuringInstrument: row.measuringInstrument || undefined,
      nominalValue: row.nominalValue === '' ? undefined : Number(row.nominalValue),
      upperTolerance: row.upperTolerance === '' ? undefined : Number(row.upperTolerance),
      lowerTolerance: row.lowerTolerance === '' ? undefined : Number(row.lowerTolerance),
      isCritical: row.isCritical === 'true',
    }));

  if (characteristics.length === 0) {
    return { error: 'Add at least one characteristic with a specification' };
  }

  return send(
    '/quality/plans',
    {
      companyId,
      componentId,
      name,
      inspectionType: text(data, 'inspectionType') ?? 'FINAL',
      samplingPlan: text(data, 'samplingPlan'),
      characteristics,
    },
    ['/app/engineering/inspection-plans'],
  );
}

/** Plans grow over time: characteristics can be appended after creation. */
export async function addPlanCharacteristicAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const planId = text(data, 'planId');
  const characteristic = text(data, 'characteristic');
  const specification = text(data, 'specification');
  if (!planId || !characteristic || !specification) {
    return { error: 'A characteristic and its specification are required' };
  }
  return send(
    `/quality/plans/${planId}/characteristics`,
    {
      sequence: number(data, 'sequence') ?? 1,
      characteristic,
      specification,
      unit: text(data, 'unit'),
      measuringInstrument: text(data, 'measuringInstrument'),
      nominalValue: number(data, 'nominalValue'),
      upperTolerance: number(data, 'upperTolerance'),
      lowerTolerance: number(data, 'lowerTolerance'),
      isCritical: bool(data, 'isCritical'),
    },
    ['/app/engineering/inspection-plans'],
  );
}

export async function removePlanCharacteristicAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const characteristicId = text(data, 'characteristicId');
  if (!characteristicId) return { error: 'Missing characteristic' };
  return remove(`/quality/plans/characteristics/${characteristicId}`, [
    '/app/engineering/inspection-plans',
  ]);
}

export async function createReworkAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const jobId = text(data, 'jobId');
  const quantity = number(data, 'quantity');
  const instructions = text(data, 'instructions');
  if (!jobId || !quantity || !instructions) {
    return { error: 'Job, quantity and instructions are required' };
  }
  return send(
    '/quality/rework',
    {
      jobId,
      nonConformanceId: text(data, 'nonConformanceId'),
      inspectionId: text(data, 'inspectionId'),
      quantity,
      instructions,
      estimatedCost: number(data, 'estimatedCost') ?? 0,
      chargeToPartner: data.get('chargeToPartner') === null ? true : bool(data, 'chargeToPartner'),
      dueDate: text(data, 'dueDate'),
    },
    ['/app/quality/rework', '/inspector/rework'],
  );
}

export async function recordProofOfDeliveryAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const shipmentId = text(data, 'shipmentId');
  const receivedBy = text(data, 'receivedBy');
  if (!shipmentId || !receivedBy) return { error: 'Who received the shipment?' };
  return send(
    `/logistics/shipments/${shipmentId}/proof-of-delivery`,
    {
      receivedBy,
      receivedAt: text(data, 'receivedAt'),
      signatureFileId: text(data, 'signatureFileId'),
      photoFileId: text(data, 'photoFileId'),
      remarks: text(data, 'remarks'),
    },
    ['/app/logistics/shipments', `/app/logistics/shipments/${shipmentId}`],
  );
}

export async function decideDeviationAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const deviationId = text(data, 'deviationId');
  const status = text(data, 'status');
  const inspectionId = text(data, 'inspectionId');
  if (!deviationId || !status) return { error: 'Select a decision' };
  return send(
    `/quality/deviations/${deviationId}`,
    { status, decisionNote: text(data, 'decisionNote') },
    [
      '/app/quality/inspections',
      ...(inspectionId ? [`/app/quality/inspections/${inspectionId}`, `/inspector/${inspectionId}`] : []),
    ],
    'PATCH',
  );
}

export async function createRevisionAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const drawingId = text(data, 'drawingId');
  const revisionCode = text(data, 'revisionCode');
  const fileId = text(data, 'fileId');
  if (!drawingId || !revisionCode) return { error: 'A revision code is required' };
  if (!fileId) return { error: 'Upload the drawing file for this revision' };
  return send(
    `/drawings/${drawingId}/revisions`,
    {
      revisionCode,
      fileId,
      changeNote: text(data, 'changeNote'),
      issueDate: text(data, 'issueDate'),
      expiryDate: text(data, 'expiryDate'),
    },
    ['/app/engineering/drawings', `/app/engineering/drawings/${drawingId}`],
  );
}

export async function revokeDrawingAccessAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  const accessId = text(data, 'accessId');
  const drawingId = text(data, 'drawingId');
  if (!accessId) return { error: 'Missing access record' };
  return send(`/drawings/access/${accessId}/revoke`, {}, [
    '/app/engineering/drawings',
    ...(drawingId ? [`/app/engineering/drawings/${drawingId}`] : []),
  ]);
}

export async function updateProcessRateAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const processId = text(data, 'processId');
  const standardRatePerHour = number(data, 'standardRatePerHour');
  if (!processId || standardRatePerHour === undefined) return { error: 'A rate is required' };
  return send(`/processes/${processId}`, { standardRatePerHour }, ['/app/engineering/masters'], 'PATCH');
}
