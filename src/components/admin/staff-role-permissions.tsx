"use client";

import { useMemo, useState } from "react";

const roleLabels: Record<string, string> = {
  "website-manager": "Website Manager",
  "content-editor": "Content Editor",
  "merchandising-manager": "Merchandising Manager",
  analyst: "Analyst",
  support: "Support",
};

function permissionLabel(value: string) {
  return value
    .split(".")
    .map((part) => part.replace(/-/g, " "))
    .join(" · ");
}

export function StaffRolePermissions({
  templates,
  permissions,
  defaultRole = "content-editor",
}: {
  templates: Record<string, string[]>;
  permissions: string[];
  defaultRole?: string;
}) {
  const [role, setRole] = useState(defaultRole);
  const [selected, setSelected] = useState<string[]>(
    templates[defaultRole] || [],
  );

  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const permission of permissions) {
      const [scope] = permission.split(".");
      const rows = map.get(scope) || [];
      rows.push(permission);
      map.set(scope, rows);
    }
    return [...map.entries()];
  }, [permissions]);

  function chooseRole(nextRole: string) {
    setRole(nextRole);
    setSelected([...(templates[nextRole] || [])]);
  }

  function toggle(permission: string) {
    setSelected((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  return (
    <div className="grid gap-5">
      <label className="grid gap-1.5 text-sm font-medium">
        Role template
        <select
          name="role"
          value={role}
          onChange={(event) => chooseRole(event.target.value)}
          className="rounded-xl border border-black/10 px-4 py-3"
        >
          {Object.keys(roleLabels).map((value) => (
            <option key={value} value={value}>
              {roleLabels[value]}
            </option>
          ))}
        </select>
        <span className="text-xs font-normal text-black/42">
          Changing the role loads its recommended permissions. You can then
          customize individual permissions before creating the account.
        </span>
      </label>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(([scope, rows]) => (
          <div key={scope} className="rounded-xl border border-black/8 p-4">
            <p className="text-sm font-semibold capitalize">
              {scope.replace(/-/g, " ")}
            </p>
            <div className="mt-3 grid gap-2">
              {rows.map((permission) => (
                <label
                  key={permission}
                  className="flex items-start gap-2 text-xs leading-5 text-black/60"
                >
                  <input
                    type="checkbox"
                    name={"permission_" + permission}
                    checked={selected.includes(permission)}
                    onChange={() => toggle(permission)}
                    className="mt-1"
                  />
                  <span>{permissionLabel(permission)}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
