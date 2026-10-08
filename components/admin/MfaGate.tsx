'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import { BRAND } from '@/lib/brand';
import { Button } from '@/components/admin/ui';
import { CheckIcon, LockIcon, ShieldIcon } from '@/components/store/icons';

type Step = { kind: 'loading' } | { kind: 'enroll'; factorId: string; qr: string; secret: string } | { kind: 'verify'; factorId: string };

/**
 * Two-factor gate for the admin panel. First visit: scan a QR code with an
 * authenticator app. Every sign-in after that: enter the 6-digit code.
 * The database only treats admins as admins once this has been passed (aal2).
 */
export default function MfaGate({ onDone, onSignOut }: { onDone: () => void; onSignOut: () => void }) {
  const [step, setStep] = useState<Step>({ kind: 'loading' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await publicClient.auth.mfa.listFactors();
      if (error) {
        setError(error.message);
        return;
      }
      const verified = data.totp.find((f) => f.status === 'verified');
      if (verified) {
        setStep({ kind: 'verify', factorId: verified.id });
        return;
      }
      // clear half-finished setups before starting a new one
      for (const f of data.all.filter((f) => f.factor_type === 'totp' && f.status !== 'verified')) {
        await publicClient.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data: enrolled, error: enrollError } = await publicClient.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `${BRAND.name} admin`,
      });
      if (enrollError || !enrolled) {
        setError(enrollError?.message ?? 'Couldn’t start two-factor setup.');
        return;
      }
      setStep({ kind: 'enroll', factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.kind === 'loading') return;
    setBusy(true);
    setError('');
    const { error } = await publicClient.auth.mfa.challengeAndVerify({ factorId: step.factorId, code: code.trim() });
    setBusy(false);
    if (error) {
      setError('That code didn’t work. Check the time on your phone and try the newest code.');
      setCode('');
      return;
    }
    onDone();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blush-100 via-blush-50 to-lilac p-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-zs w-full max-w-md p-7 shadow-pop">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-berry-400 to-berry-600 text-white shadow-soft">
            <ShieldIcon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{step.kind === 'enroll' ? 'Protect your admin' : 'Two-factor check'}</h1>
            <p className="text-sm font-semibold text-muted">
              {step.kind === 'enroll' ? 'One-time setup with an authenticator app' : 'Enter the code from your authenticator app'}
            </p>
          </div>
        </div>

        {step.kind === 'loading' && !error && <div className="skeleton h-40 rounded-2xl" />}

        {step.kind === 'enroll' && (
          <div className="mb-5 space-y-3">
            <ol className="list-decimal space-y-1 pl-5 text-sm font-semibold text-ink-soft">
              <li>Open Google Authenticator, Microsoft Authenticator or 1Password.</li>
              <li>Scan this QR code (or type the key below).</li>
              <li>Enter the 6-digit code it shows.</li>
            </ol>
            <div className="flex justify-center rounded-2xl bg-white p-3 ring-1 ring-line">
              <img src={step.qr} alt="Two-factor QR code" className="h-48 w-48" />
            </div>
            <p className="break-all rounded-xl bg-blush-50 px-3 py-2 text-center font-mono text-xs font-bold text-ink-soft">{step.secret}</p>
          </div>
        )}

        {step.kind !== 'loading' && (
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <LockIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-berry-400" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="123456"
                className="input-zs pl-12 text-center font-mono text-2xl tracking-[0.5em]"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" icon={CheckIcon} loading={busy} disabled={code.length !== 6}>
              {step.kind === 'enroll' ? 'Turn on two-factor' : 'Verify'}
            </Button>
          </form>
        )}

        {error && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

        <button type="button" onClick={onSignOut} className="mt-5 w-full text-center text-sm font-extrabold text-muted hover:text-berry-600">
          Sign out
        </button>
      </motion.div>
    </div>
  );
}
