import { useEffect, useState } from 'react';
import { FEES, PAYMENT_METHODS } from '../config/constants';
import { customerApi, type Meta } from '../data/customerApi';
import type { FeeSchedule } from '../lib/pricing';

export interface AppMeta {
  fees: FeeSchedule;
  paymentMethods: string[];
  /** True once GET /api/meta has answered. */
  loaded: boolean;
}

/** Used only until /api/meta answers (same values as the server's PRICING defaults). */
const DEFAULT_META: AppMeta = { fees: FEES, paymentMethods: [...PAYMENT_METHODS], loaded: false };

let cached: AppMeta | null = null;
let pending: Promise<AppMeta> | null = null;

const fromServer = (m: Meta): AppMeta => ({
  fees: {
    standardDelivery: m.fees?.standardDeliveryFee ?? FEES.standardDelivery,
    service: m.fees?.serviceFee ?? FEES.service,
    packaging: m.fees?.packagingFee ?? FEES.packaging,
    freeDeliveryThreshold: m.fees?.freeDeliveryThreshold ?? FEES.freeDeliveryThreshold,
  },
  paymentMethods: m.paymentMethods?.length ? m.paymentMethods : [...PAYMENT_METHODS],
  loaded: true,
});

export function loadMeta(): Promise<AppMeta> {
  if (cached) return Promise.resolve(cached);
  pending ??= customerApi.meta()
    .then((m) => (cached = fromServer(m)))
    .catch(() => {
      pending = null; // retry on the next mount
      return DEFAULT_META;
    });
  return pending;
}

/** Test helper. */
export function resetMetaCache() {
  cached = null;
  pending = null;
}

/** Fee schedule + payment methods from GET /api/meta (fetched once per page load). */
export function useMeta(): AppMeta {
  const [meta, setMeta] = useState<AppMeta>(() => cached ?? DEFAULT_META);
  useEffect(() => {
    if (cached) return;
    let alive = true;
    void loadMeta().then((m) => { if (alive) setMeta(m); });
    return () => { alive = false; };
  }, []);
  return meta;
}
