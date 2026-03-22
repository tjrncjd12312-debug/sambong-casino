import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 서버용 (관리자 권한 - API Routes에서만 사용)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
