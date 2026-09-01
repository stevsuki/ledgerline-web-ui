import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { RoleForm } from "@/components/roles/role-form";
import { AppScreen } from "@/components/shell/app-screen";
import {
  getPermissionModules,
  getRole,
  toGrantMap,
} from "@/lib/data/access";
import { PAGE_META } from "@/lib/nav";

export async function generateMetadata(
  props: Readonly<PageProps<"/roles/[roleId]">>,
): Promise<Metadata> {
  const { roleId } = await props.params;
  const role = await getRole(roleId);
  return { title: role ? `Edit ${role.name}` : "Role not found" };
}

export default async function EditRolePage(
  props: Readonly<PageProps<"/roles/[roleId]">>,
) {
  const { roleId } = await props.params;
  const [role, modules] = await Promise.all([
    getRole(roleId),
    getPermissionModules(),
  ]);

  if (!role) {
    notFound();
  }

  return (
    <AppScreen
      title={PAGE_META.roleEdit.title}
      subtitle={PAGE_META.roleEdit.subtitle}
      maxWidth={1240}
    >
      <RoleForm
        roleId={role.id}
        modules={modules}
        initialName={role.name}
        initialDescription={role.description}
        initialGrants={toGrantMap(role)}
        memberCount={role.userCount}
        isSystem={role.isSystem}
      />
    </AppScreen>
  );
}
