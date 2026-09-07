import { NotificationChannel, NotificationEvent } from './enums';

/**
 * Section 13 — which channels each event goes out on.
 *
 * This is a policy table rather than a decision at each call site, because when it was a decision
 * at each call site every one of the forty of them passed `['IN_APP']` or `['IN_APP','WHATSAPP']`.
 * Email was fully implemented and configured, and never once requested — the MVP was meant to use
 * "in-app notifications; email; WhatsApp notification links where practical".
 *
 * The shape of the rule:
 *
 * - **In-app** always. It is the record, and it is free.
 * - **Email** where the recipient needs something durable, searchable, or reachable off the shop
 *   floor: money, quality escalations, controlled-document changes, compliance deadlines. Internal
 *   staff live in email; this is how a finance user finds out an invoice needs approval without
 *   sitting inside GRID-X all day.
 * - **WhatsApp** where the recipient is a partner who needs to act now and is probably on a phone
 *   in a workshop. The blueprint is explicit that critical approvals must not happen over WhatsApp,
 *   so it is only ever a nudge towards the app, never the decision surface.
 *
 * Events that are purely informational to an internal audience stay in-app, so the inbox does not
 * train people to ignore it.
 */

const IN_APP: NotificationChannel[] = ['IN_APP'];
const IN_APP_EMAIL: NotificationChannel[] = ['IN_APP', 'EMAIL'];
const IN_APP_WHATSAPP: NotificationChannel[] = ['IN_APP', 'WHATSAPP'];
const ALL: NotificationChannel[] = ['IN_APP', 'EMAIL', 'WHATSAPP'];

const CHANNEL_POLICY: Record<NotificationEvent, NotificationChannel[]> = {
  // --- Jobs: the partner is on a phone and the clock is running ------------
  NEW_JOB_ASSIGNED: ALL,
  JOB_ACCEPTANCE_PENDING: IN_APP_WHATSAPP,
  JOB_ACCEPTED: IN_APP,
  JOB_DECLINED: IN_APP_EMAIL,
  JOB_MILESTONE_OVERDUE: ALL,
  JOB_DELAY_REPORTED: IN_APP_EMAIL,
  JOB_CLARIFICATION_RAISED: IN_APP_EMAIL,
  JOB_CLARIFICATION_ANSWERED: IN_APP_WHATSAPP,
  JOB_CLOSED: IN_APP_EMAIL,

  // --- Material: someone has to physically move or receive something ------
  MATERIAL_READY_FOR_PICKUP: IN_APP_WHATSAPP,
  MATERIAL_ISSUED: IN_APP_WHATSAPP,
  MATERIAL_ACKNOWLEDGED: IN_APP,
  MATERIAL_RECEIPT_NOT_ACKNOWLEDGED: ALL,

  // --- Quality: escalations that need a durable record --------------------
  INSPECTION_REQUESTED: IN_APP_EMAIL,
  INSPECTION_DELAYED: ALL,
  INSPECTION_COMPLETED: IN_APP_WHATSAPP,
  REWORK_ISSUED: ALL,
  CORRECTIVE_ACTION_DUE: IN_APP_EMAIL,

  // --- Drawings: a superseded drawing on a shop floor is the risk ---------
  DRAWING_REVISION_CHANGED: ALL,
  DRAWING_ACCESS_GRANTED: IN_APP_WHATSAPP,

  // --- Money: always durable, on both sides -------------------------------
  INVOICE_SUBMITTED: IN_APP_EMAIL,
  INVOICE_APPROVED: ALL,
  INVOICE_HELD: ALL,
  PAYMENT_RELEASED: ALL,

  // --- Standing and compliance -------------------------------------------
  PARTNER_STATUS_CHANGED: IN_APP_EMAIL,
  PARTNER_RATING_REDUCED: IN_APP_EMAIL,
  SCORECARD_PUBLISHED: IN_APP_EMAIL,
  COMPLIANCE_DOCUMENT_EXPIRING: IN_APP_EMAIL,
  FIXTURE_CALIBRATION_DUE: IN_APP_EMAIL,

  // --- Logistics ----------------------------------------------------------
  SHIPMENT_DISPATCHED: IN_APP_WHATSAPP,
  SHIPMENT_RECEIVED: IN_APP,
};

/** The channels an event should go out on. Unknown events fall back to in-app. */
export function channelsForEvent(event: NotificationEvent): NotificationChannel[] {
  return CHANNEL_POLICY[event] ?? IN_APP;
}

/**
 * Narrows a channel list to what this recipient can actually be reached on.
 *
 * A partner worker with a phone and no email should not accumulate failed email rows — that is not
 * a misconfiguration to alert on, it is simply how that person is reachable.
 */
export function deliverableChannels(
  channels: NotificationChannel[],
  recipient: { email?: string | null; phone?: string | null },
): NotificationChannel[] {
  return channels.filter((channel) => {
    if (channel === 'EMAIL') return Boolean(recipient.email);
    if (channel === 'WHATSAPP' || channel === 'SMS') return Boolean(recipient.phone);
    return true;
  });
}

/** Events a partner should never be nudged about over WhatsApp, for the settings screen to show. */
export const CHANNEL_POLICY_TABLE = CHANNEL_POLICY;
