import { createClient, SupabaseClient } from '@supabase/supabase-js';

const publicClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

let serverClient: SupabaseClient | null = null;

function getServerClient(): SupabaseClient {
  if (!serverClient) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
    }
    serverClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return serverClient;
}

export { publicClient, getServerClient };
