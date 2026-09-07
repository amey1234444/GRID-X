import { Injectable } from '@nestjs/common';
import type {
  ImsFetchResult,
  ImsGateway,
  ImsHealth,
  ImsInboundEntity,
  ImsOutboundEntity,
} from '../ims.contract';

/**
 * The transport used when no IMS is configured.
 *
 * It is a real gateway rather than a null check scattered through the service, so the boundary
 * behaves identically with and without an IMS: reads fail loudly (the caller genuinely cannot
 * proceed), and outbound facts are "not delivered" with a reason, which puts them in the sync log
 * as owed work rather than dropping them.
 */
@Injectable()
export class DisabledImsDriver implements ImsGateway {
  readonly name = 'disabled' as const;

  isConfigured(): boolean {
    return false;
  }

  async health(): Promise<ImsHealth> {
    return {
      driver: this.name,
      reachable: false,
      message: 'IMS integration is disabled. Set IMS_ENABLED and IMS_DATABASE_URL to connect.',
    };
  }

  async fetch(entity: ImsInboundEntity): Promise<ImsFetchResult> {
    throw new Error(`IMS integration is not configured, so ${entity} cannot be read from IMS`);
  }

  async deliver(entity: ImsOutboundEntity): Promise<string | null> {
    return `IMS integration is not configured; ${entity} queued in the sync log`;
  }
}
