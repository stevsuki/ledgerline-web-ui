import type { Metadata } from "next";

import { RoleForm } from "@/components/roles/role-form";
import { AppScreen } from "@/components/shell/app-screen";
import { getPermissionModules } from "@/lib/data/access";
import { PAGE_META } from "@/lib/nav";

export const metadata: Metadata = { title: "Add new role" };

export default async function NewRolePage() {
  const modules = await getPermissionModules();

  return (
    <AppScreen
      title={PAGE_META.roleNew.title}
      subtitle={PAGE_META.roleNew.subtitle}
      maxWidth={1240}
    >
      <RoleForm
        roleId={null}
        modules={modules}
        initialName=""
        initialDescription=""
        initialGrants={{}}
        memberCount={0}
        isSystem={false}
      />
    </AppScreen>
  );
}
