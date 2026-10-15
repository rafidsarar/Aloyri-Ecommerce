export function analyticsCollectionEnabled(
  datastoreConfigured: boolean,
  setting?: string,
  legacySetting?: string,
) {
  const configured = setting ?? legacySetting;
  return datastoreConfigured && (configured === undefined || configured === "1");
}
