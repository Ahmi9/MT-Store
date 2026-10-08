'use client';

// Shared building blocks for every admin page, so tables, add/edit sheets,
// confirmations and messages look and move the same everywhere.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import { CheckIcon, ChevronLeftIcon, SearchIcon, TrashIcon, XIcon } from '@/components/store/icons';

type IconType = React.ComponentType<{ className?: string }>;

/* ───────────────────────── Page header ───────────────────────── */

export function PageHeader({
  title,
  subtitle,
  actions,
  backHref,
  backLabel = 'Back',
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {backHref && (
          <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-sm font-extrabold text-muted transition-colors hover:text-berry-600">
            <ChevronLeftIcon className="h-4 w-4" /> {backLabel}
          </Link>
        )}
        <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 font-semibold text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

/* ───────────────────────── Buttons ───────────────────────── */

const BUTTON = {
  primary: 'bg-gradient-to-r from-berry-400 to-berry-600 text-white shadow-soft hover:shadow-pop hover:-translate-y-0.5',
  secondary: 'border border-line bg-white text-ink-soft hover:border-blush-300 hover:text-berry-600',
  danger: 'bg-rose-600 text-white shadow-soft hover:bg-rose-700',
  ghost: 'text-ink-soft hover:bg-blush-100 hover:text-berry-600',
  success: 'bg-emerald-500 text-white shadow-soft hover:bg-emerald-600',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading,
  className = '',
  children,
  disabled,
  ...props
}: Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: keyof typeof BUTTON;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconType;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  const sizes = { sm: 'px-3.5 py-2 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3.5 text-base' };
  return (
    <motion.button
      type="button"
      whileTap={disabled || loading ? undefined : { scale: 0.96 }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-extrabold transition-all disabled:pointer-events-none disabled:opacity-50 ${sizes[size]} ${BUTTON[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : Icon ? <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> : null}
      {children}
    </motion.button>
  );
}

export function LinkButton({ href, variant = 'primary', icon: Icon, children, className = '' }: { href: string; variant?: keyof typeof BUTTON; icon?: IconType; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-extrabold transition-all ${BUTTON[variant]} ${className}`}>
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Link>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

const ACTION_TONE = {
  neutral: 'text-ink-soft hover:bg-blush-100 hover:text-berry-600',
  edit: 'text-berry-600 hover:bg-blush-100',
  danger: 'text-rose-500 hover:bg-rose-50 hover:text-rose-600',
  success: 'text-emerald-600 hover:bg-emerald-50',
};

/** Small round icon button used for row actions (edit, delete, …). */
export function IconAction({
  icon: Icon,
  label,
  tone = 'neutral',
  onClick,
  href,
}: {
  icon: IconType;
  label: string;
  tone?: keyof typeof ACTION_TONE;
  onClick?: () => void;
  href?: string;
}) {
  const cls = `group/action relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${ACTION_TONE[tone]}`;
  const tip = (
    <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-bold text-white opacity-0 transition-opacity group-hover/action:opacity-100">
      {label}
    </span>
  );
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={label}>
        <Icon className="h-4 w-4" />
        {tip}
      </Link>
    );
  }
  return (
    <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={onClick} className={cls} aria-label={label}>
      <Icon className="h-4 w-4" />
      {tip}
    </motion.button>
  );
}

/* ───────────────────────── Cards & form fields ───────────────────────── */

export function Card({
  title,
  description,
  icon: Icon,
  actions,
  className = '',
  delay = 0,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: IconType;
  actions?: React.ReactNode;
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className={`card-zs p-5 md:p-6 ${className}`}
    >
      {(title || actions) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-blush-100 text-berry-600">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <div>
              {title && <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>}
              {description && <p className="text-sm font-semibold text-muted">{description}</p>}
            </div>
          </div>
          {actions}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function Field({
  label,
  hint,
  required,
  className = '',
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="admin-label">
        {label} {required && <span className="text-berry-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs font-semibold text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
}) {
  const sw = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-gradient-to-r from-berry-400 to-berry-600' : 'bg-blush-200'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${checked ? 'right-1' : 'left-1'}`}
      />
    </button>
  );
  if (!label) return sw;
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-blush-50 px-4 py-3">
      <div>
        <p className="text-sm font-extrabold text-ink">{label}</p>
        {description && <p className="text-xs font-semibold text-muted">{description}</p>}
      </div>
      {sw}
    </div>
  );
}

const PILL = {
  pink: 'bg-blush-100 text-berry-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  sky: 'bg-sky-100 text-sky-700',
  violet: 'bg-violet-100 text-violet-700',
  rose: 'bg-rose-100 text-rose-700',
  neutral: 'bg-blush-50 text-ink-soft',
  ink: 'bg-ink text-white',
};
export type PillTone = keyof typeof PILL;

export const STATUS_TONE: Record<string, PillTone> = {
  pending: 'amber',
  confirmed: 'sky',
  shipped: 'violet',
  delivered: 'green',
  cancelled: 'rose',
};

export function Pill({ tone = 'neutral', dot, children }: { tone?: PillTone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold ${PILL[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ───────────────────────── Tables ───────────────────────── */

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' };

export function TableCard({ toolbar, children, delay = 0.05 }: { toolbar?: React.ReactNode; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }} className="card-zs overflow-hidden">
      {toolbar && <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">{toolbar}</div>}
      <div className="overflow-x-auto">{children}</div>
    </motion.div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full">{children}</table>;
}

export function Th({ children, align = 'left', className = '' }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center'; className?: string }) {
  return <th className={`whitespace-nowrap px-4 py-3 ${ALIGN[align]} ${className}`}>{children}</th>;
}

export function Td({ children, align = 'left', className = '' }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center'; className?: string }) {
  return <td className={`px-4 py-3 ${ALIGN[align]} text-sm font-semibold text-ink-soft ${className}`}>{children}</td>;
}

/** Table row with the shared staggered entrance. */
export function Row({ index = 0, className = '', children, onClick }: { index?: number; className?: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ delay: Math.min(index * 0.035, 0.35), duration: 0.25 }}
      onClick={onClick}
      className={`border-b border-line last:border-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.tr>
  );
}

export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>;
}

export function EmptyState({ emoji = '✨', title, text, action }: { emoji?: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center px-6 py-14 text-center">
      <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity }} className="mb-3 text-4xl">
        {emoji}
      </motion.span>
      <p className="font-display text-xl font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm font-semibold text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card-zs space-y-3 p-5">
      <div className="skeleton h-10 w-full rounded-2xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="skeleton h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/3 rounded" />
            <div className="skeleton h-3 w-1/5 rounded" />
          </div>
          <div className="skeleton h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full md:w-72">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-berry-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="admin-input py-2 pl-10 pr-9" />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-blush-100" aria-label="Clear search">
          <XIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  id,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`relative flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold transition-colors ${active ? 'text-white' : 'text-ink-soft hover:text-berry-600'}`}
          >
            {active && <motion.span layoutId={`tabs-${id}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <span className="relative">{t.label}</span>
            {t.count !== undefined && (
              <span className={`relative rounded-full px-1.5 text-[11px] ${active ? 'bg-white/20' : 'bg-blush-100 text-berry-700'}`}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Sheet (add / edit) ───────────────────────── */

function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return desktop;
}

/**
 * Every add/edit form in the admin opens in this sheet: from the right on
 * desktop, from the bottom on phones. Wraps its body in a <form> so Enter
 * submits.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  width = 'md',
  onSubmit,
  submitLabel = 'Save',
  saving,
  submitDisabled,
  footerExtra,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: IconType;
  width?: 'md' | 'lg' | 'xl';
  onSubmit?: () => void | Promise<void>;
  submitLabel?: string;
  saving?: boolean;
  submitDisabled?: boolean;
  footerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const desktop = useIsDesktop();
  const widths = { md: 'md:w-[480px]', lg: 'md:w-[640px]', xl: 'md:w-[860px]' };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, saving]);

  const hidden = desktop ? { x: '100%' } : { y: '100%' };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !saving && onClose()}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          <motion.form
            initial={hidden}
            animate={{ x: 0, y: 0 }}
            exit={hidden}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!saving && !submitDisabled) onSubmit?.();
            }}
            className={`absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-[28px] bg-blush-50 shadow-pop md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:rounded-l-[28px] md:rounded-tr-none ${widths[width]}`}
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-blush-200 md:hidden" />
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 md:px-6 md:py-5">
              <div className="flex items-center gap-3">
                {Icon && (
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-berry-400 to-berry-600 text-white shadow-soft">
                    <Icon className="h-5 w-5" />
                  </span>
                )}
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
                  {subtitle && <p className="text-sm font-semibold text-muted">{subtitle}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-ink transition-transform hover:rotate-90"
                aria-label="Close"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 md:px-6">{children}</div>

            {onSubmit && (
              <div className="flex items-center justify-between gap-3 border-t border-line bg-white px-5 py-4 md:rounded-bl-[28px] md:px-6">
                <div>{footerExtra}</div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={onClose} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={saving} disabled={submitDisabled} icon={CheckIcon}>
                    {submitLabel}
                  </Button>
                </div>
              </div>
            )}
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── Confirm dialog ───────────────────────── */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={() => !loading && onCancel()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-pop"
            role="alertdialog"
          >
            <motion.span
              initial={{ rotate: -20, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12 }}
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600"
            >
              <TrashIcon className="h-6 w-6" />
            </motion.span>
            <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
            {message && <p className="mt-2 text-sm font-semibold text-muted">{message}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button variant="danger" onClick={onConfirm} loading={loading}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── Toasts ───────────────────────── */

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  text: string;
}

const ToastContext = createContext<(text: string, tone?: ToastTone) => void>(() => {});

export function useAdminToast() {
  return useContext(ToastContext);
}

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const next = useRef(0);

  const notify = useCallback((text: string, tone: ToastTone = 'success') => {
    const id = ++next.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 5000 : 3000);
  }, []);

  const styles = {
    success: 'bg-emerald-500 text-white',
    error: 'bg-rose-500 text-white',
    info: 'bg-berry-500 text-white',
  };

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-line bg-white p-2.5 pr-4 shadow-pop"
            >
              <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${styles[t.tone]}`}>
                {t.tone === 'error' ? <XIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
              </span>
              <p className="text-sm font-bold text-ink">{t.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
