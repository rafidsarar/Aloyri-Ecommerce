import { currentAdmin, hasAdminPermission } from "@/lib/admin-auth";
import { buildAnalyticsReport } from "@/lib/analytics-store";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text)
    ? '"' + text.replace(/"/g, '""') + '"'
    : text;
}

function csv(rows: Array<Array<unknown>>) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export async function GET(request: Request) {
  const admin = await currentAdmin();
  if (
    !admin ||
    admin.mustChangePassword ||
    !hasAdminPermission(admin, "analytics.export")
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days"));
  const days = [1, 7, 30, 90].includes(requestedDays)
    ? requestedDays
    : 30;
  const view = url.searchParams.get("view") || "summary";
  const report = await buildAnalyticsReport(days);

  let rows: Array<Array<unknown>>;
  if (view === "products") {
    rows = [
      [
        "product_id",
        "views",
        "clicks",
        "add_to_carts",
        "order_sessions",
        "units_ordered",
        "view_to_cart_rate_percent",
        "cart_to_order_rate_percent",
      ],
      ...report.products.map((row) => [
        row.productId,
        row.views,
        row.clicks,
        row.addToCarts,
        row.orderSessions,
        row.unitsOrdered,
        row.viewToCartRate,
        row.cartToOrderRate,
      ]),
    ];
  } else if (view === "campaigns") {
    rows = [
      [
        "campaign_id",
        "impressions",
        "clicks",
        "ctr_percent",
        "sessions",
        "orders",
        "conversion_percent",
        "revenue_bdt",
      ],
      ...report.campaigns.map((row) => [
        row.campaignId,
        row.impressions,
        row.clicks,
        row.clickThroughRate,
        row.sessions,
        row.orders,
        row.conversionRate,
        row.revenueBdt,
      ]),
    ];
  } else if (view === "collections") {
    rows = [
      [
        "collection_id",
        "views",
        "product_clicks",
        "sessions",
        "orders",
        "conversion_percent",
        "revenue_bdt",
      ],
      ...report.collections.map((row) => [
        row.collectionId,
        row.views,
        row.productClicks,
        row.sessions,
        row.orders,
        row.conversionRate,
        row.revenueBdt,
      ]),
    ];
  } else if (view === "merchandising") {
    rows = [
      [
        "placement_id",
        "placement_kind",
        "impressions",
        "clicks",
        "ctr_percent",
        "sessions",
        "orders",
        "conversion_percent",
        "revenue_bdt",
      ],
      ...report.placements.map((row) => [
        row.placementId,
        row.placementKind,
        row.impressions,
        row.clicks,
        row.clickThroughRate,
        row.sessions,
        row.orders,
        row.conversionRate,
        row.revenueBdt,
      ]),
    ];
  } else if (view === "search") {
    rows = [
      [
        "search_term",
        "searches",
        "sessions",
        "product_clicks",
        "orders",
        "conversion_percent",
      ],
      ...report.searches.map((row) => [
        row.term,
        row.searches,
        row.sessions,
        row.productClicks,
        row.orders,
        row.conversionRate,
      ]),
    ];
  } else if (view === "traffic") {
    rows = [
      [
        "source",
        "medium",
        "sessions",
        "orders",
        "conversion_percent",
        "revenue_bdt",
      ],
      ...report.sources.map((row) => [
        row.source,
        row.medium,
        row.sessions,
        row.orders,
        row.conversionRate,
        row.revenueBdt,
      ]),
    ];
  } else {
    rows = [
      ["metric", "current", "previous", "change_percent"],
      ...(
        Object.keys(report.summary) as Array<keyof typeof report.summary>
      ).map((key) => [
        key,
        report.summary[key],
        report.previous[key],
        report.change[key] ?? "",
      ]),
    ];
  }

  const filename =
    "aloyri-analytics-" + view + "-" + days + "d.csv";

  return new Response(csv(rows), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="' + filename + '"',
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
