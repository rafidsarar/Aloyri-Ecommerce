import "server-only";

import { get, list, put } from "@vercel/blob";

export type AnalyticsDevice = "mobile" | "tablet" | "desktop";
export type AnalyticsEventName =
  | "page_view"
  | "product_view"
  | "product_click"
  | "collection_view"
  | "collection_product_click"
  | "campaign_impression"
  | "campaign_click"
  | "merchandising_impression"
  | "merchandising_click"
  | "search"
  | "add_to_cart"
  | "cart_view"
  | "cart_quantity_change"
  | "cart_remove"
  | "checkout_start"
  | "checkout_validation_error"
  | "checkout_review"
  | "checkout_submit"
  | "checkout_failure"
  | "wishlist_add"
  | "wishlist_remove"
  | "wishlist_move_to_cart"
  | "customer_hub_view"
  | "recovery_opt_in"
  | "recovery_restore"
  | "order_created"
  | "order_tracking_success"
  | "return_request_submitted"
  | "web_vital";

export type AnalyticsOrderItem = {
  productId: string;
  qty: number;
};

export type AnalyticsEventRecord = {
  version: 1;
  id: string;
  timestamp: string;
  event: AnalyticsEventName;
  visitorHash?: string;
  sessionHash?: string;
  pagePath?: string;
  device?: AnalyticsDevice;
  source?: string;
  medium?: string;
  campaign?: string;
  referrerDomain?: string;
  productId?: string;
  category?: string;
  collectionId?: string;
  campaignId?: string;
  placementId?: string;
  placementKind?: string;
  searchTerm?: string;
  resultCount?: number;
  itemCount?: number;
  deliveryZone?: "inside-dhaka" | "outside-dhaka";
  paymentMethod?: "COD";
  orderStatus?: string;
  reason?: string;
  resolution?: string;
  totalBdt?: number;
  checkoutStep?: "details" | "review" | "submit";
  errorCode?: string;
  field?: string;
  quantityDelta?: number;
  metric?: "LCP" | "CLS" | "INP" | "TTFB";
  metricValue?: number;
  confirmed?: boolean;
  orderHash?: string;
  items?: AnalyticsOrderItem[];
};

export type AnalyticsReport = {
  range: {
    days: number;
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
  };
  summary: {
    visitors: number;
    sessions: number;
    pageViews: number;
    productViews: number;
    addToCarts: number;
    checkoutStarts: number;
    orders: number;
    revenueBdt: number;
    averageOrderValueBdt: number;
    itemsPerOrder: number;
    conversionRate: number;
    cartAbandonmentRate: number;
  };
  previous: AnalyticsReport["summary"];
  change: Record<keyof AnalyticsReport["summary"], number | null>;
  funnel: Array<{
    stage: string;
    sessions: number;
    rateFromVisit: number;
    dropOffFromPrevious: number;
  }>;
  products: Array<{
    productId: string;
    views: number;
    clicks: number;
    addToCarts: number;
    orderSessions: number;
    unitsOrdered: number;
    viewToCartRate: number;
    cartToOrderRate: number;
  }>;
  campaigns: Array<{
    campaignId: string;
    impressions: number;
    clicks: number;
    sessions: number;
    orders: number;
    revenueBdt: number;
    clickThroughRate: number;
    conversionRate: number;
  }>;
  collections: Array<{
    collectionId: string;
    views: number;
    productClicks: number;
    sessions: number;
    orders: number;
    revenueBdt: number;
    conversionRate: number;
  }>;
  searches: Array<{
    term: string;
    searches: number;
    sessions: number;
    productClicks: number;
    orders: number;
    resultSamples: number;
    averageResults: number;
    zeroResultSearches: number;
    zeroResultRate: number;
    conversionRate: number;
  }>;
  sources: Array<{
    source: string;
    medium: string;
    sessions: number;
    orders: number;
    revenueBdt: number;
    conversionRate: number;
  }>;
  devices: Array<{
    device: AnalyticsDevice | "unknown";
    sessions: number;
    orders: number;
    conversionRate: number;
  }>;
  webVitals: Array<{
    metric: "LCP" | "CLS" | "INP" | "TTFB";
    samples: number;
    average: number;
    p75: number;
  }>;
  placements: Array<{
    placementId: string;
    placementKind: string;
    impressions: number;
    clicks: number;
    sessions: number;
    orders: number;
    revenueBdt: number;
    clickThroughRate: number;
    conversionRate: number;
  }>;
  recommendations: Array<{
    kind:
      | "high-view-low-cart"
      | "high-cart-low-order"
      | "strong-collection"
      | "strong-campaign"
      | "zero-result-search";
    title: string;
    detail: string;
    href: string;
  }>;
};

const ROOT_PREFIX =
  process.env.VERCEL_ENV === "production"
    ? "analytics/"
    : "preview/analytics/";
const EVENTS_PREFIX = ROOT_PREFIX + "events/";
const CONVERSIONS_PREFIX = ROOT_PREFIX + "conversions/";
const MAX_EVENTS = 20_000;

function blobConfigured() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL,
  );
}

function safeId() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function hashAnalyticsIdentifier(value?: string) {
  if (!value || !/^[A-Za-z0-9_-]{16,80}$/.test(value)) return undefined;
  return sha256("aloyri-analytics-v1:" + value);
}

function dayPath(timestamp: string) {
  return timestamp.slice(0, 10);
}

export async function recordAnalyticsEvent(
  input: Omit<AnalyticsEventRecord, "version" | "id" | "timestamp"> & {
    timestamp?: string;
  },
) {
  if (!blobConfigured()) return null;

  const timestamp =
    input.timestamp && !Number.isNaN(Date.parse(input.timestamp))
      ? new Date(input.timestamp).toISOString()
      : new Date().toISOString();
  const record: AnalyticsEventRecord = {
    version: 1,
    id: safeId(),
    ...input,
    timestamp,
  };

  const pathname =
    EVENTS_PREFIX +
    dayPath(timestamp) +
    "/" +
    timestamp.replace(/[:.]/g, "-") +
    "-" +
    record.id +
    ".json";

  await put(pathname, JSON.stringify(record), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });

  return record;
}

export async function recordConfirmedOrderAnalytics(input: {
  orderNumber: string;
  visitorId?: string;
  sessionId?: string;
  pagePath?: string;
  device?: AnalyticsDevice;
  source?: string;
  medium?: string;
  campaign?: string;
  referrerDomain?: string;
  collectionId?: string;
  campaignId?: string;
  placementId?: string;
  placementKind?: string;
  searchTerm?: string;
  itemCount: number;
  items: AnalyticsOrderItem[];
  deliveryZone: "inside-dhaka" | "outside-dhaka";
  totalBdt: number;
}) {
  if (!blobConfigured()) return null;

  const orderHash = await sha256(
    "aloyri-order-analytics-v1:" + input.orderNumber,
  );
  const dedupePath = CONVERSIONS_PREFIX + orderHash + ".json";

  try {
    const existing = await get(dedupePath, {
      access: "private",
      useCache: false,
    });
    if (existing) return null;
  } catch {
    // A missing dedupe marker is expected for a new conversion.
  }

  const [visitorHash, sessionHash] = await Promise.all([
    hashAnalyticsIdentifier(input.visitorId),
    hashAnalyticsIdentifier(input.sessionId),
  ]);

  const event = await recordAnalyticsEvent({
    event: "order_created",
    ...(visitorHash ? { visitorHash } : {}),
    ...(sessionHash ? { sessionHash } : {}),
    ...(input.pagePath ? { pagePath: input.pagePath } : {}),
    ...(input.device ? { device: input.device } : {}),
    ...(input.source ? { source: input.source } : {}),
    ...(input.medium ? { medium: input.medium } : {}),
    ...(input.campaign ? { campaign: input.campaign } : {}),
    ...(input.referrerDomain ? { referrerDomain: input.referrerDomain } : {}),
    ...(input.collectionId ? { collectionId: input.collectionId } : {}),
    ...(input.campaignId ? { campaignId: input.campaignId } : {}),
    ...(input.placementId ? { placementId: input.placementId } : {}),
    ...(input.placementKind ? { placementKind: input.placementKind } : {}),
    ...(input.searchTerm ? { searchTerm: input.searchTerm } : {}),
    itemCount: input.itemCount,
    items: input.items,
    deliveryZone: input.deliveryZone,
    paymentMethod: "COD",
    totalBdt: input.totalBdt,
    confirmed: true,
    orderHash,
  });

  if (event) {
    await put(
      dedupePath,
      JSON.stringify({
        version: 1,
        recordedAt: event.timestamp,
        eventId: event.id,
      }),
      {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      },
    );
  }

  return event;
}

async function readBlobJson(pathname: string) {
  try {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result) return null;
    return JSON.parse(
      await new Response(result.stream).text(),
    ) as AnalyticsEventRecord;
  } catch {
    return null;
  }
}

function utcDayKeys(from: Date, to: Date) {
  const keys: string[] = [];
  const cursor = new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
    ),
  );
  const last = new Date(
    Date.UTC(
      to.getUTCFullYear(),
      to.getUTCMonth(),
      to.getUTCDate(),
    ),
  );

  while (cursor <= last) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export async function readAnalyticsEvents(
  from: Date,
  to = new Date(),
  limit = MAX_EVENTS,
) {
  if (!blobConfigured()) return [] as AnalyticsEventRecord[];

  const records: AnalyticsEventRecord[] = [];
  const days = utcDayKeys(from, to);

  for (const day of days) {
    let cursor: string | undefined;

    do {
      const result = await list({
        prefix: EVENTS_PREFIX + day + "/",
        limit: Math.min(1000, Math.max(1, limit - records.length)),
        ...(cursor ? { cursor } : {}),
      });
      const page = await Promise.all(
        result.blobs.map((blob) => readBlobJson(blob.pathname)),
      );

      for (const event of page) {
        if (!event) continue;
        const timestamp = Date.parse(event.timestamp);
        if (
          Number.isFinite(timestamp) &&
          timestamp >= from.getTime() &&
          timestamp < to.getTime()
        ) {
          records.push(event);
          if (records.length >= limit) break;
        }
      }

      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor && records.length < limit);

    if (records.length >= limit) break;
  }

  return records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function unique(values: Array<string | undefined>) {
  return new Set(values.filter((value): value is string => Boolean(value))).size;
}

function pct(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function summary(events: AnalyticsEventRecord[]) {
  const confirmedOrders = events.filter(
    (event) => event.event === "order_created" && event.confirmed,
  );
  const sessions = unique(events.map((event) => event.sessionHash));
  const cartSessions = new Set(
    events
      .filter((event) => event.event === "add_to_cart")
      .map((event) => event.sessionHash)
      .filter((value): value is string => Boolean(value)),
  );
  const orderSessions = new Set(
    confirmedOrders
      .map((event) => event.sessionHash)
      .filter((value): value is string => Boolean(value)),
  );
  const abandoned = [...cartSessions].filter(
    (session) => !orderSessions.has(session),
  ).length;
  const revenue = confirmedOrders.reduce(
    (sum, event) => sum + (event.totalBdt || 0),
    0,
  );
  const items = confirmedOrders.reduce(
    (sum, event) =>
      sum +
      (event.items?.reduce((itemSum, item) => itemSum + item.qty, 0) ||
        event.itemCount ||
        0),
    0,
  );

  return {
    visitors: unique(events.map((event) => event.visitorHash)),
    sessions,
    pageViews: events.filter((event) => event.event === "page_view").length,
    productViews: events.filter((event) => event.event === "product_view").length,
    addToCarts: events.filter((event) => event.event === "add_to_cart").length,
    checkoutStarts: events.filter(
      (event) => event.event === "checkout_start",
    ).length,
    orders: confirmedOrders.length,
    revenueBdt: money(revenue),
    averageOrderValueBdt: confirmedOrders.length
      ? money(revenue / confirmedOrders.length)
      : 0,
    itemsPerOrder: confirmedOrders.length
      ? Math.round((items / confirmedOrders.length) * 100) / 100
      : 0,
    conversionRate: pct(confirmedOrders.length, sessions),
    cartAbandonmentRate: pct(abandoned, cartSessions.size),
  };
}

function changes(
  current: ReturnType<typeof summary>,
  previous: ReturnType<typeof summary>,
) {
  const output = {} as Record<
    keyof ReturnType<typeof summary>,
    number | null
  >;

  for (const key of Object.keys(current) as Array<
    keyof ReturnType<typeof summary>
  >) {
    const currentValue = current[key];
    const previousValue = previous[key];
    output[key] =
      previousValue === 0
        ? currentValue === 0
          ? 0
          : null
        : Math.round(
            (((currentValue - previousValue) / previousValue) * 100) * 100,
          ) / 100;
  }
  return output;
}

function sessionSet(events: AnalyticsEventRecord[], name: AnalyticsEventName) {
  return new Set(
    events
      .filter((event) => event.event === name)
      .map((event) => event.sessionHash)
      .filter((value): value is string => Boolean(value)),
  );
}

function buildFunnel(events: AnalyticsEventRecord[]) {
  const stages = [
    ["Visits", new Set(events.map((event) => event.sessionHash).filter(Boolean))],
    ["Product views", sessionSet(events, "product_view")],
    ["Add to cart", sessionSet(events, "add_to_cart")],
    ["Checkout", sessionSet(events, "checkout_start")],
    [
      "Orders",
      new Set(
        events
          .filter(
            (event) => event.event === "order_created" && event.confirmed,
          )
          .map((event) => event.sessionHash)
          .filter(Boolean),
      ),
    ],
  ] as Array<[string, Set<string | undefined>]>;

  const visitCount = stages[0][1].size;
  return stages.map(([stage, sessions], index) => {
    const previous = index === 0 ? sessions.size : stages[index - 1][1].size;
    return {
      stage,
      sessions: sessions.size,
      rateFromVisit: pct(sessions.size, visitCount),
      dropOffFromPrevious:
        index === 0 ? 0 : Math.max(0, 100 - pct(sessions.size, previous)),
    };
  });
}

function productRows(events: AnalyticsEventRecord[]) {
  const map = new Map<
    string,
    {
      views: number;
      clicks: number;
      addToCarts: number;
      orderSessions: Set<string>;
      unitsOrdered: number;
    }
  >();

  const get = (id: string) => {
    let row = map.get(id);
    if (!row) {
      row = {
        views: 0,
        clicks: 0,
        addToCarts: 0,
        orderSessions: new Set(),
        unitsOrdered: 0,
      };
      map.set(id, row);
    }
    return row;
  };

  for (const event of events) {
    if (event.productId) {
      const row = get(event.productId);
      if (event.event === "product_view") row.views += 1;
      if (
        event.event === "product_click" ||
        event.event === "collection_product_click"
      ) {
        row.clicks += 1;
      }
      if (event.event === "add_to_cart") row.addToCarts += 1;
    }
    if (event.event === "order_created" && event.confirmed) {
      for (const item of event.items || []) {
        const row = get(item.productId);
        row.unitsOrdered += item.qty;
        if (event.sessionHash) row.orderSessions.add(event.sessionHash);
      }
    }
  }

  return [...map.entries()]
    .map(([productId, row]) => ({
      productId,
      views: row.views,
      clicks: row.clicks,
      addToCarts: row.addToCarts,
      orderSessions: row.orderSessions.size,
      unitsOrdered: row.unitsOrdered,
      viewToCartRate: pct(row.addToCarts, row.views),
      cartToOrderRate: pct(row.orderSessions.size, row.addToCarts),
    }))
    .sort((a, b) => b.views - a.views || b.unitsOrdered - a.unitsOrdered)
    .slice(0, 100);
}

function attributionRows(
  events: AnalyticsEventRecord[],
  kind: "campaign" | "collection",
) {
  const map = new Map<
    string,
    {
      impressions: number;
      clicks: number;
      views: number;
      productClicks: number;
      sessions: Set<string>;
      orders: number;
      revenue: number;
    }
  >();

  const get = (id: string) => {
    let row = map.get(id);
    if (!row) {
      row = {
        impressions: 0,
        clicks: 0,
        views: 0,
        productClicks: 0,
        sessions: new Set(),
        orders: 0,
        revenue: 0,
      };
      map.set(id, row);
    }
    return row;
  };

  for (const event of events) {
    const id = kind === "campaign" ? event.campaignId : event.collectionId;
    if (!id) continue;
    const row = get(id);
    if (event.sessionHash) row.sessions.add(event.sessionHash);

    if (kind === "campaign") {
      if (event.event === "campaign_impression") row.impressions += 1;
      if (event.event === "campaign_click") row.clicks += 1;
    } else {
      if (event.event === "collection_view") row.views += 1;
      if (event.event === "collection_product_click") row.productClicks += 1;
    }

    if (event.event === "order_created" && event.confirmed) {
      row.orders += 1;
      row.revenue += event.totalBdt || 0;
    }
  }

  if (kind === "campaign") {
    return [...map.entries()]
      .map(([campaignId, row]) => ({
        campaignId,
        impressions: row.impressions,
        clicks: row.clicks,
        sessions: row.sessions.size,
        orders: row.orders,
        revenueBdt: money(row.revenue),
        clickThroughRate: pct(row.clicks, row.impressions),
        conversionRate: pct(row.orders, row.sessions.size),
      }))
      .sort((a, b) => b.revenueBdt - a.revenueBdt || b.clicks - a.clicks);
  }

  return [...map.entries()]
    .map(([collectionId, row]) => ({
      collectionId,
      views: row.views,
      productClicks: row.productClicks,
      sessions: row.sessions.size,
      orders: row.orders,
      revenueBdt: money(row.revenue),
      conversionRate: pct(row.orders, row.sessions.size),
    }))
    .sort((a, b) => b.revenueBdt - a.revenueBdt || b.views - a.views);
}

function placementRows(events: AnalyticsEventRecord[]) {
  const map = new Map<
    string,
    {
      kind: string;
      impressions: number;
      clicks: number;
      sessions: Set<string>;
      orders: number;
      revenue: number;
    }
  >();

  const get = (id: string, kind = "unknown") => {
    let row = map.get(id);
    if (!row) {
      row = {
        kind,
        impressions: 0,
        clicks: 0,
        sessions: new Set(),
        orders: 0,
        revenue: 0,
      };
      map.set(id, row);
    } else if (row.kind === "unknown" && kind) {
      row.kind = kind;
    }
    return row;
  };

  for (const event of events) {
    if (!event.placementId) continue;
    const row = get(event.placementId, event.placementKind || "unknown");
    if (event.sessionHash) row.sessions.add(event.sessionHash);
    if (event.event === "merchandising_impression") row.impressions += 1;
    if (
      event.event === "merchandising_click" ||
      event.event === "campaign_click"
    ) row.clicks += 1;
    if (event.event === "order_created" && event.confirmed) {
      row.orders += 1;
      row.revenue += event.totalBdt || 0;
    }
  }

  return [...map.entries()]
    .map(([placementId, row]) => ({
      placementId,
      placementKind: row.kind,
      impressions: row.impressions,
      clicks: row.clicks,
      sessions: row.sessions.size,
      orders: row.orders,
      revenueBdt: money(row.revenue),
      clickThroughRate: pct(row.clicks, row.impressions),
      conversionRate: pct(row.orders, row.sessions.size),
    }))
    .sort((a, b) => b.revenueBdt - a.revenueBdt || b.clicks - a.clicks);
}

function searchRows(events: AnalyticsEventRecord[]) {
  const map = new Map<
    string,
    {
      searches: number;
      sessions: Set<string>;
      productClicks: number;
      orders: number;
      resultSamples: number;
      resultTotal: number;
      zeroResultSearches: number;
    }
  >();

  for (const event of events) {
    if (!event.searchTerm) continue;
    let row = map.get(event.searchTerm);
    if (!row) {
      row = {
        searches: 0,
        sessions: new Set(),
        productClicks: 0,
        orders: 0,
        resultSamples: 0,
        resultTotal: 0,
        zeroResultSearches: 0,
      };
      map.set(event.searchTerm, row);
    }
    if (event.event === "search") {
      row.searches += 1;
      if (typeof event.resultCount === "number") {
        row.resultSamples += 1;
        row.resultTotal += event.resultCount;
        if (event.resultCount === 0) row.zeroResultSearches += 1;
      }
    }
    if (
      event.event === "product_click" ||
      event.event === "collection_product_click"
    ) {
      row.productClicks += 1;
    }
    if (event.event === "order_created" && event.confirmed) row.orders += 1;
    if (event.sessionHash) row.sessions.add(event.sessionHash);
  }

  return [...map.entries()]
    .map(([term, row]) => ({
      term,
      searches: row.searches,
      sessions: row.sessions.size,
      productClicks: row.productClicks,
      orders: row.orders,
      resultSamples: row.resultSamples,
      averageResults: row.resultSamples
        ? Math.round((row.resultTotal / row.resultSamples) * 10) / 10
        : 0,
      zeroResultSearches: row.zeroResultSearches,
      zeroResultRate: pct(row.zeroResultSearches, row.resultSamples),
      conversionRate: pct(row.orders, row.sessions.size),
    }))
    .sort((a, b) => b.searches - a.searches)
    .slice(0, 100);
}

function sourceRows(events: AnalyticsEventRecord[]) {
  const map = new Map<
    string,
    {
      source: string;
      medium: string;
      sessions: Set<string>;
      orders: number;
      revenue: number;
    }
  >();

  for (const event of events) {
    const source = event.source || "direct";
    const medium = event.medium || "(none)";
    const key = source + "|" + medium;
    let row = map.get(key);
    if (!row) {
      row = {
        source,
        medium,
        sessions: new Set(),
        orders: 0,
        revenue: 0,
      };
      map.set(key, row);
    }
    if (event.sessionHash) row.sessions.add(event.sessionHash);
    if (event.event === "order_created" && event.confirmed) {
      row.orders += 1;
      row.revenue += event.totalBdt || 0;
    }
  }

  return [...map.values()]
    .map((row) => ({
      source: row.source,
      medium: row.medium,
      sessions: row.sessions.size,
      orders: row.orders,
      revenueBdt: money(row.revenue),
      conversionRate: pct(row.orders, row.sessions.size),
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function deviceRows(events: AnalyticsEventRecord[]) {
  const devices: Array<AnalyticsDevice | "unknown"> = [
    "mobile",
    "tablet",
    "desktop",
    "unknown",
  ];
  return devices
    .map((device) => {
      const scoped = events.filter(
        (event) => (event.device || "unknown") === device,
      );
      const sessions = unique(scoped.map((event) => event.sessionHash));
      const orders = scoped.filter(
        (event) => event.event === "order_created" && event.confirmed,
      ).length;
      return {
        device,
        sessions,
        orders,
        conversionRate: pct(orders, sessions),
      };
    })
    .filter((row) => row.sessions > 0);
}

function webVitalRows(events: AnalyticsEventRecord[]) {
  const metrics = ["LCP", "CLS", "INP", "TTFB"] as const;
  return metrics
    .map((metric) => {
      const values = events
        .filter(
          (event) =>
            event.event === "web_vital" &&
            event.metric === metric &&
            typeof event.metricValue === "number",
        )
        .map((event) => event.metricValue as number)
        .sort((a, b) => a - b);
      if (!values.length) return null;
      const average =
        values.reduce((sum, value) => sum + value, 0) / values.length;
      const p75Index = Math.min(
        values.length - 1,
        Math.max(0, Math.ceil(values.length * 0.75) - 1),
      );
      return {
        metric,
        samples: values.length,
        average:
          metric === "CLS"
            ? Math.round(average * 1000) / 1000
            : Math.round(average),
        p75:
          metric === "CLS"
            ? Math.round(values[p75Index] * 1000) / 1000
            : Math.round(values[p75Index]),
      };
    })
    .filter(
      (
        row,
      ): row is {
        metric: "LCP" | "CLS" | "INP" | "TTFB";
        samples: number;
        average: number;
        p75: number;
      } => Boolean(row),
    );
}

function recommendations(
  report: Pick<
    AnalyticsReport,
    "products" | "campaigns" | "collections" | "searches" | "placements"
  >,
) {
  const output: AnalyticsReport["recommendations"] = [];

  for (const product of report.products) {
    if (product.views >= 10 && product.viewToCartRate < 5) {
      output.push({
        kind: "high-view-low-cart",
        title: "High views, low cart rate",
        detail:
          product.productId +
          " has " +
          product.views +
          " views but only " +
          product.viewToCartRate +
          "% view-to-cart conversion.",
        href: "/admin/products/" + encodeURIComponent(product.productId),
      });
    }
    if (product.addToCarts >= 5 && product.cartToOrderRate < 20) {
      output.push({
        kind: "high-cart-low-order",
        title: "Cart interest is not becoming orders",
        detail:
          product.productId +
          " has " +
          product.addToCarts +
          " add-to-cart events and " +
          product.cartToOrderRate +
          "% cart-to-order conversion.",
        href: "/admin/products/" + encodeURIComponent(product.productId),
      });
    }
  }

  const strongPlacement = report.placements.find(
    (row) => row.sessions >= 5 && row.conversionRate >= 5,
  );
  if (strongPlacement) {
    output.push({
      kind: "strong-campaign",
      title: "Homepage placement is converting well",
      detail:
        strongPlacement.placementId +
        " converts " +
        strongPlacement.conversionRate +
        "% of attributed sessions.",
      href: "/admin/analytics/merchandising",
    });
  }

  const strongCollection = report.collections.find(
    (row) => row.sessions >= 5 && row.conversionRate >= 5,
  );
  if (strongCollection) {
    output.push({
      kind: "strong-collection",
      title: "Collection is converting well",
      detail:
        strongCollection.collectionId +
        " converts " +
        strongCollection.conversionRate +
        "% of attributed sessions.",
      href:
        "/admin/merchandising/collections/" +
        encodeURIComponent(strongCollection.collectionId),
    });
  }

  const strongCampaign = report.campaigns.find(
    (row) => row.sessions >= 5 && row.conversionRate >= 5,
  );
  if (strongCampaign) {
    output.push({
      kind: "strong-campaign",
      title: "Campaign is converting well",
      detail:
        strongCampaign.campaignId +
        " converts " +
        strongCampaign.conversionRate +
        "% of attributed sessions.",
      href:
        "/admin/merchandising/campaigns/" +
        encodeURIComponent(strongCampaign.campaignId),
    });
  }

  for (const search of report.searches.slice(0, 20)) {
    if (search.resultSamples >= 3 && search.zeroResultSearches > 0) {
      output.push({
        kind: "zero-result-search",
        title: "Customers are reaching zero search results",
        detail:
          "“" +
          search.term +
          "” returned zero products " +
          search.zeroResultSearches +
          " of " +
          search.resultSamples +
          " measured searches (" +
          search.zeroResultRate +
          "%).",
        href: "/admin/analytics/search",
      });
    }
  }

  return output.slice(0, 20);
}

export async function buildAnalyticsReport(days = 30): Promise<AnalyticsReport> {
  const normalizedDays = [1, 7, 30, 90].includes(days) ? days : 30;
  const to = new Date();
  const from = new Date(to.getTime() - normalizedDays * 24 * 60 * 60 * 1000);
  const previousFrom = new Date(
    from.getTime() - normalizedDays * 24 * 60 * 60 * 1000,
  );

  const events = await readAnalyticsEvents(previousFrom, to);
  const currentEvents = events.filter(
    (event) => Date.parse(event.timestamp) >= from.getTime(),
  );
  const previousEvents = events.filter((event) => {
    const time = Date.parse(event.timestamp);
    return time >= previousFrom.getTime() && time < from.getTime();
  });

  const currentSummary = summary(currentEvents);
  const previousSummary = summary(previousEvents);
  const products = productRows(currentEvents);
  const campaigns = attributionRows(
    currentEvents,
    "campaign",
  ) as AnalyticsReport["campaigns"];
  const collections = attributionRows(
    currentEvents,
    "collection",
  ) as AnalyticsReport["collections"];
  const searches = searchRows(currentEvents);

  const base = {
    range: {
      days: normalizedDays,
      from: from.toISOString(),
      to: to.toISOString(),
      previousFrom: previousFrom.toISOString(),
      previousTo: from.toISOString(),
    },
    summary: currentSummary,
    previous: previousSummary,
    change: changes(currentSummary, previousSummary),
    funnel: buildFunnel(currentEvents),
    products,
    campaigns,
    collections,
    searches,
    sources: sourceRows(currentEvents),
    devices: deviceRows(currentEvents),
    placements: placementRows(currentEvents),
    webVitals: webVitalRows(currentEvents),
  };

  return {
    ...base,
    recommendations: recommendations(base),
  };
}
