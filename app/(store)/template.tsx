'use client';

import { motion } from 'framer-motion';

// Re-mounts on every storefront navigation. Opacity only — a transform here
// would become the containing block for fixed-position modals inside pages.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}
