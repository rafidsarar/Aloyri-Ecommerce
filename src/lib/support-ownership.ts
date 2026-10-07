export function ownsSupportCase(row: { accountId?: string; orderNumber?: string }, accountId: string, orders: ReadonlySet<string>) {
  if (row.accountId) return row.accountId === accountId;
  return Boolean(row.orderNumber && orders.has(row.orderNumber));
}
