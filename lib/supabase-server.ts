import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Service-role client: bypasses RLS. Only for route handlers on the server.
let serverClient: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (!serverClient) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
    }
    serverClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return serverClient;
}

/** True when the request carries the access token of a user listed in `admins`. */
export async function isAdminRequest(request: Request): Promise<boolean> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const db = getServerClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return false;
  const { data: row } = await db.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
  return !!row;
}
