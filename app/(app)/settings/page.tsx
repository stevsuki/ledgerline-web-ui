import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";

import { AppScreen } from "@/components/shell/app-screen";
import { ThemeSegment } from "@/components/shell/theme-controls";
import { ActionButton } from "@/components/ui/action-button";
import { SelectField, TextField, ToggleRow } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { FieldGrid, ScreenStack, SplitGrid } from "@/components/ui/layout";
import { SectionPanel } from "@/components/ui/panel";
import { Avatar } from "@/components/ui/primitives";
import {
  EXPORT_FORMATS,
  PASSWORD_ROW,
  PREFERENCE_FIELDS,
  PROFILE,
  SECURITY_TOGGLES,
} from "@/lib/data/settings";
import { PAGE_META, WORKSPACE } from "@/lib/nav";
import { THEME_COOKIE, parseTheme } from "@/lib/preferences";

export const metadata: Metadata = { title: PAGE_META.settings.title };

export default async function SettingsPage() {
  const store = await cookies();
  const theme = parseTheme(store.get(THEME_COOKIE)?.value);

  return (
    <AppScreen
      title={PAGE_META.settings.title}
      subtitle={PAGE_META.settings.subtitle}
    >
      <ScreenStack>
        <SplitGrid minWidth={320} ratio={1}>
          <div className="flex flex-col gap-6">
            <SectionPanel title="Profile" bodyClassName="mt-4">
              <div className="flex items-center gap-3.5">
                <Avatar name={WORKSPACE.signedInAs} size={48} highlight />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">
                    {WORKSPACE.signedInAs}
                  </p>
                  <p className="text-meta text-muted mt-0.5 truncate">
                    {WORKSPACE.signedInEmail} · {PROFILE.location}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <TextField
                  id="profile-name"
                  label="Display name"
                  defaultValue={WORKSPACE.signedInAs}
                />
                <TextField
                  id="profile-email"
                  label="Email"
                  type="email"
                  defaultValue={WORKSPACE.signedInEmail}
                />
              </div>
            </SectionPanel>

            <SectionPanel
              title="Security"
              bodyClassName="mt-4 flex flex-col gap-3.5"
            >
              <div className="flex items-center gap-3">
                <Icon name="lock" size={17} className="text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="text-row">{PASSWORD_ROW.label}</p>
                  <p className="text-meta text-muted truncate">
                    {PASSWORD_ROW.meta}
                  </p>
                </div>
                <ActionButton
                  className="btn btn-secondary text-note"
                  message="Password reset link sent"
                >
                  Change
                </ActionButton>
              </div>
              {SECURITY_TOGGLES.map((toggle) => (
                <ToggleRow
                  key={toggle.id}
                  id={`security-${toggle.id}`}
                  label={toggle.label}
                  defaultChecked={toggle.enabled}
                />
              ))}
            </SectionPanel>
          </div>

          <div className="flex flex-col gap-6">
            <SectionPanel title="Preferences" bodyClassName="mt-4">
              <FieldGrid>
                {PREFERENCE_FIELDS.map((field) => (
                  <SelectField
                    key={field.id}
                    id={field.id}
                    label={field.label}
                    options={field.options}
                  />
                ))}
              </FieldGrid>
              <div className="border-divider mt-4 border-t pt-4">
                <ThemeSegment initial={theme} />
              </div>
            </SectionPanel>

            <SectionPanel
              title="Data"
              description="Exports cover the selected date range across all wallets."
              bodyClassName="mt-3.5"
            >
              <div className="flex flex-wrap gap-2">
                {EXPORT_FORMATS.map((format) => (
                  <ActionButton
                    key={format}
                    className="btn btn-secondary"
                    message="Export queued — check your email"
                  >
                    <Icon name="download" size={15} />
                    {format}
                  </ActionButton>
                ))}
              </div>
              <div className="border-divider mt-4 border-t pt-4">
                <Link href="/sign-in" className="btn btn-ghost text-note">
                  View auth screens
                  <Icon name="right" size={14} />
                </Link>
              </div>
            </SectionPanel>
          </div>
        </SplitGrid>
      </ScreenStack>
    </AppScreen>
  );
}
