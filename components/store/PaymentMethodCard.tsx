'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from '@/components/store/icons';

export interface PaymentMethod {
  id: number;
  method_name: string;
  account_title: string;
  account_number: string;
  iban: string | null;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold transition-colors ${
        copied ? 'bg-mint text-emerald-700' : 'bg-blush-100 text-berry-600 hover:bg-blush-200'
      }`}
      title={`Copy ${label}`}
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function PaymentMethodCard({ method }: { method: PaymentMethod }) {
  return (
    <div className="rounded-2xl border-2 border-line bg-white p-4">
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-berry-400 to-berry-600 font-display font-semibold text-white">
          {method.method_name.charAt(0).toUpperCase()}
        </span>
        <span className="font-extrabold text-ink">{method.method_name}</span>
      </div>
      <div className="pl-12">
        <p className="text-xs font-semibold text-muted">Account title: {method.account_title}</p>
        <div className="mt-1 flex flex-wrap items-center">
          <span className="font-extrabold tracking-wide text-ink">{method.account_number}</span>
          <CopyButton text={method.account_number} label="account number" />
        </div>
        {method.iban && (
          <div className="mt-1 flex flex-wrap items-center">
            <span className="font-mono text-xs text-muted">{method.iban}</span>
            <CopyButton text={method.iban} label="IBAN" />
          </div>
        )}
      </div>
    </div>
  );
}
