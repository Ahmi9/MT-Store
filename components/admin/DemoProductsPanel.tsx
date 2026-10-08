'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { publicClient } from '@/lib/supabase';
import { DEMO_PRODUCTS, importDemoProducts, removeDemoProducts } from '@/lib/demo-products';

export default function DemoProductsPanel({ onChange }: { onChange: () => void }) {
  const [busy, setBusy] = useState<'import' | 'remove' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (kind: 'import' | 'remove') => {
    setBusy(kind);
    setMessage(null);
    setConfirmRemove(false);
    try {
      if (kind === 'import') {
        const { added, skipped } = await importDemoProducts(publicClient);
        setMessage({
          ok: true,
          text: added ? `Imported ${added} demo product${added === 1 ? '' : 's'} with photos${skipped ? ` (${skipped} already existed)` : ''}.` : 'All demo products are already imported.',
        });
      } else {
        const { removed, hidden } = await removeDemoProducts(publicClient);
        setMessage({
          ok: true,
          text: removed || hidden
            ? `Removed ${removed} demo product${removed === 1 ? '' : 's'}${hidden ? `; ${hidden} with orders were hidden instead` : ''}.`
            : 'No demo products found.',
        });
      }
      onChange();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Something went wrong' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-6 rounded-[1.75rem] border border-blush-300 bg-gradient-to-r from-blush-100 via-blush-50 to-lilac p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-ink">✨ Demo catalog</p>
          <p className="text-sm font-semibold text-ink-soft">
            Import {DEMO_PRODUCTS.length} sample products with photos, options and reviews to preview the store. Remove them any time.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => run('import')}
            disabled={!!busy}
            className="rounded-full bg-gradient-to-r from-berry-400 to-berry-600 whitespace-nowrap px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {busy === 'import' ? 'Importing…' : 'Import demo products'}
          </button>
          {confirmRemove ? (
            <>
              <button
                type="button"
                onClick={() => run('remove')}
                disabled={!!busy}
                className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Yes, remove
              </button>
              <button type="button" onClick={() => setConfirmRemove(false)} className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink-soft">
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              disabled={!!busy}
              className="rounded-full border border-line bg-white whitespace-nowrap px-5 py-2.5 text-sm font-extrabold text-ink-soft transition-colors hover:text-berry-600 disabled:opacity-50"
            >
              {busy === 'remove' ? 'Removing…' : 'Remove demo products'}
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {message && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-3 text-sm ${message.ok ? 'font-bold text-emerald-700' : 'font-bold text-rose-600'}`}
          >
            {message.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
