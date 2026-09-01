import { Icon } from "@/components/ui/icon";
import { signOutAction } from "@/lib/auth/actions";

/**
 * The rail's last control. A plain form posting to a Server Action, so it
 * clears the session cookies on the server and needs no client JavaScript —
 * it takes the slot the artboard gave its "Auth" link.
 */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="rail-item w-full">
        <Icon name="lock" size={17} />
        <span className="rail-label overflow-hidden whitespace-nowrap">
          Sign out
        </span>
      </button>
    </form>
  );
}
