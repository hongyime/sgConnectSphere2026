// Buttons and button-styled links, on the existing .primary-action and
// .secondary-action styles. Use `primary` for the main action on a page or
// form (one per area), `secondary` for the rest, `danger` for destructive ones.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import './shared.css';

type Variant = 'primary' | 'secondary' | 'danger';

const variantClass: Record<Variant, string> = {
  primary: 'primary-action',
  secondary: 'secondary-action',
  danger: 'secondary-action ui-danger',
};

export function Button({ variant = 'secondary', busy = false, busyLabel, icon, children, disabled, type = 'button', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    // Shows a spinner, disables the button and swaps in busyLabel.
    busy?: boolean;
    busyLabel?: string;
    icon?: ReactNode;
  }) {
  return (
    <button {...rest} type={type} className={variantClass[variant]} disabled={disabled || busy} aria-busy={busy || undefined}>
      {busy ? <Loader2 size={14} className="ui-spin" aria-hidden="true" /> : icon}
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}

export function ButtonLink({ to, variant = 'secondary', icon, children }: {
  to: string; variant?: Variant; icon?: ReactNode; children: ReactNode;
}) {
  return <Link to={to} className={variantClass[variant]}>{icon}{children}</Link>;
}
