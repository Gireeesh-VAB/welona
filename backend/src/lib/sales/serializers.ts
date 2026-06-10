/**
 * Convert Prisma sales records into JSON-friendly API DTOs.
 *
 * The main job is decoding JSON-string columns (SQLite has no array type)
 * back into real arrays. Money stays as integer minor units — the client
 * formats it for display.
 */
import type { Customer, Delivery } from '@prisma/client';

/** Parse a JSON-string column into a string array, tolerating bad data. */
export function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Customer with `tags` decoded to an array and `state` relation flattened. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeCustomer(customer: Customer & { state?: { id: string; name: string } | null; [key: string]: any }) {
  const { state, ...rest } = customer as any;
  return {
    ...rest,
    tags: parseStringArray(customer.tags),
    stateId: state?.id ?? customer.stateId ?? null,
    stateName: state?.name ?? null,
  };
}

/** A per-line delivered-quantity entry. */
export interface DeliveryLine {
  orderItemId: string;
  quantity: number;
}

/** Delivery with `lineQuantities` decoded to an array. */
export function serializeDelivery(delivery: Delivery) {
  let lines: DeliveryLine[] = [];
  try {
    const parsed = JSON.parse(delivery.lineQuantities);
    if (Array.isArray(parsed)) lines = parsed as DeliveryLine[];
  } catch {
    lines = [];
  }
  return { ...delivery, lineQuantities: lines };
}
