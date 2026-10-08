import { createClient } from '@supabase/supabase-js';

// Browser-safe client (anon key). Everything it can do is limited by the
// Row Level Security policies in supabase/migrations.
const publicClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export { publicClient };
