import { BadRequestException } from '@nestjs/common';

/**
 * Enforces the documented status workflows. Every state machine in the blueprint
 * (partner approval, drawing revision, job, corrective action, invoice) is validated here
 * so a record can never jump a stage.
 */
export function assertTransition<S extends string>(
  entity: string,
  from: S,
  to: S,
  transitions: Record<S, S[]>,
): void {
  if (from === to) return;
  const allowed = transitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `${entity} cannot move from ${from} to ${to}. Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }
}
