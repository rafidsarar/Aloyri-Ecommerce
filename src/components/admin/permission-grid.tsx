import {
  ADMIN_PERMISSIONS,
  ROLE_TEMPLATES,
  type AdminPermission,
  type AdminRole,
} from "@/lib/admin-auth";

const groups: Array<{
  title: string;
  permissions: AdminPermission[];
}> = [
  { title: "Dashboard", permissions: ["dashboard.view"] },
  { title: "Homepage", permissions: ["homepage.view", "homepage.edit"] },
  { title: "Products", permissions: ["products.view", "products.edit"] },
  { title: "Pages & FAQ", permissions: ["pages.view", "pages.edit"] },
  { title: "Media", permissions: ["media.view", "media.edit", "media.delete"] },
  {
    title: "Merchandising",
    permissions: [
      "merchandising.view",
      "merchandising.edit",
      "merchandising.delete",
    ],
  },
  {
    title: "Analytics",
    permissions: ["analytics.view", "analytics.export"],
  },
  { title: "SEO", permissions: ["seo.view", "seo.edit"] },
  {
    title: "Publishing",
    permissions: [
      "publishing.view",
      "publishing.preview",
      "publishing.publish",
      "publishing.discard",
      "publishing.restore",
    ],
  },
  { title: "Settings", permissions: ["settings.view", "settings.edit"] },
  { title: "Staff", permissions: ["staff.view", "staff.manage"] },
  { title: "Audit", permissions: ["audit.view", "audit.export"] },
  { title: "Health", permissions: ["health.view", "health.run"] },
  {
    title: "Backups",
    permissions: [
      "backups.view",
      "backups.create",
      "backups.export",
      "backups.restore",
    ],
  },
  {
    title: "Security",
    permissions: ["security.self", "security.owner"],
  },
];

function label(permission: string) {
  return permission
    .split(".")
    .map((part) => part.replace(/-/g, " "))
    .join(" · ");
}

export function PermissionGrid({
  selected,
  disabled = false,
}: {
  selected: readonly AdminPermission[];
  disabled?: boolean;
}) {
  const selectedSet = new Set(selected);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <div key={group.title} className="rounded-xl border border-black/8 p-4">
          <p className="text-sm font-semibold">{group.title}</p>
          <div className="mt-3 grid gap-2">
            {group.permissions.map((permission) => (
              <label
                key={permission}
                className="flex items-start gap-2 text-xs leading-5 text-black/60"
              >
                <input
                  type="checkbox"
                  name={"permission_" + permission}
                  defaultChecked={selectedSet.has(permission)}
                  disabled={disabled}
                  className="mt-1"
                />
                <span>{label(permission)}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RoleTemplateSummary({ role }: { role: AdminRole }) {
  const permissions =
    role === "owner" ? ADMIN_PERMISSIONS : ROLE_TEMPLATES[role];
  return (
    <p className="text-xs leading-5 text-black/45">
      Default template: {permissions.length} permissions. You can customize the
      checkboxes before saving.
    </p>
  );
}
