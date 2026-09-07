import { MaterialTransactionType } from './enums';

/**
 * Module 6 — material requirement, scrap allowance and the transaction ledger's arithmetic.
 *
 * The blueprint's material issue process has "material requirement calculated" as step 2, between
 * approving the job and the stores preparing the issue. Nothing calculated it: the bill of material
 * existed on the component, and the stores user typed weights in by hand. Worse, the "theoretical"
 * half of "theoretical versus actual consumption" — Module 6's headline control — was also typed
 * in, so every variance compared an actual against a number somebody guessed.
 */

export interface BomLine {
  itemId: string;
  itemCode?: string;
  itemName?: string;
  uom: string;
  quantityPerUnit: number;
  unitWeightKg?: number | null;
}

export interface MaterialRequirementLine {
  itemId: string;
  itemCode?: string;
  itemName?: string;
  uom: string;
  quantityPerUnit: number;
  /** Quantity the job needs before any allowance for scrap. */
  netQuantity: number;
  /** Extra issued to cover expected process loss, from the component's scrap allowance. */
  scrapAllowanceQuantity: number;
  /** What stores should actually issue: net plus allowance. */
  grossQuantity: number;
  /** Gross converted to kilograms where the item carries a unit weight. */
  grossWeightKg: number | null;
}

/**
 * What a job's bill of material implies stores should issue.
 *
 * Scrap allowance is added on top of the net requirement rather than taken out of it: the partner
 * must end up with enough good material to make the ordered quantity, and the allowance is the
 * expected loss along the way.
 */
export function materialRequirement(
  bom: BomLine[],
  jobQuantity: number,
  scrapAllowancePercent: number,
): MaterialRequirementLine[] {
  const allowance = Math.max(0, scrapAllowancePercent) / 100;
  return bom.map((line) => {
    const netQuantity = round3(line.quantityPerUnit * jobQuantity);
    const scrapAllowanceQuantity = round3(netQuantity * allowance);
    const grossQuantity = round3(netQuantity + scrapAllowanceQuantity);
    return {
      itemId: line.itemId,
      itemCode: line.itemCode,
      itemName: line.itemName,
      uom: line.uom,
      quantityPerUnit: line.quantityPerUnit,
      netQuantity,
      scrapAllowanceQuantity,
      grossQuantity,
      grossWeightKg: line.unitWeightKg ? round3(grossQuantity * line.unitWeightKg) : null,
    };
  });
}

export interface ScrapVerdict {
  actualPercent: number;
  allowedPercent: number;
  /** Positive when the partner scrapped more than the component allows. */
  excessPercent: number;
  excessKg: number;
  withinAllowance: boolean;
}

/**
 * Module 6 — actual scrap against the component's allowance.
 *
 * `Component.scrapAllowancePercent` was captured, imported, displayed and compared against nothing,
 * so a partner scrapping 30% of a 5%-allowance component raised no flag and lost no money.
 */
export function scrapVerdict(
  issuedKg: number,
  scrapKg: number,
  allowedPercent: number,
): ScrapVerdict {
  if (issuedKg <= 0) {
    return {
      actualPercent: 0,
      allowedPercent,
      excessPercent: 0,
      excessKg: 0,
      withinAllowance: true,
    };
  }
  const actualPercent = round2((scrapKg / issuedKg) * 100);
  const excessPercent = round2(Math.max(0, actualPercent - allowedPercent));
  const allowedKg = issuedKg * (allowedPercent / 100);
  return {
    actualPercent,
    allowedPercent,
    excessPercent,
    excessKg: round3(Math.max(0, scrapKg - allowedKg)),
    withinAllowance: excessPercent <= 0,
  };
}

/**
 * The transaction types a person records by hand.
 *
 * The other six are produced by the issue, acknowledgement, consumption, scrap and reconciliation
 * flows, and letting someone post them directly would let the ledger disagree with the documents
 * it is derived from.
 */
export const MANUAL_TRANSACTION_TYPES: MaterialTransactionType[] = [
  'REJECTED_MATERIAL',
  'REPLACEMENT_MATERIAL',
  'UNUSED_MATERIAL_RETURNED',
  'EXCESS',
  'SHORTAGE',
];

/**
 * Which way a transaction moves material, as a multiplier on the recorded weight.
 *
 * `+1` leaves OSWAR for the partner, `-1` comes back, `0` is a movement inside the partner's own
 * custody (consuming stock, generating scrap) that changes what the material *is* rather than
 * where it is. Summing `directionKg` over a job therefore gives what the partner still holds.
 */
export function transactionDirection(type: MaterialTransactionType): -1 | 0 | 1 {
  switch (type) {
    case 'ISSUED_TO_PARTNER':
    case 'REPLACEMENT_MATERIAL':
      return 1;
    case 'RECEIVED_BY_PARTNER':
      // The partner acknowledging receipt confirms a movement already counted at issue.
      return 0;
    case 'SCRAP_RETURNED':
    case 'UNUSED_MATERIAL_RETURNED':
    case 'REJECTED_MATERIAL':
      return -1;
    case 'CONSUMED':
    case 'SCRAP_GENERATED':
      return 0;
    case 'SHORTAGE':
      // Material that was issued but never arrived: it is not with the partner.
      return -1;
    case 'EXCESS':
      return 1;
    default:
      return 0;
  }
}

export const TRANSACTION_TYPE_LABELS: Record<MaterialTransactionType, string> = {
  ISSUED_TO_PARTNER: 'Issued to partner',
  RECEIVED_BY_PARTNER: 'Received by partner',
  CONSUMED: 'Consumed',
  SCRAP_GENERATED: 'Scrap generated',
  SCRAP_RETURNED: 'Scrap returned',
  UNUSED_MATERIAL_RETURNED: 'Unused material returned',
  SHORTAGE: 'Shortage',
  EXCESS: 'Excess',
  REJECTED_MATERIAL: 'Rejected material returned',
  REPLACEMENT_MATERIAL: 'Replacement material issued',
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
