import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Log environment variables for debugging
    console.log('get-all-companies-admin: SUPABASE_URL:', Deno.env.get('SUPABASE_URL'));
    console.log('get-all-companies-admin: SUPABASE_SERVICE_ROLE_KEY (first 5 chars):', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.substring(0, 5));

    // Admin client to bypass RLS
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await adminSupabaseClient
      .from('companies')
      .select('id, name, user_id, created_at')

    if (error) {
      console.error('get-all-companies-admin: Error fetching all companies:', error);
      throw error
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('get-all-companies-admin: Unhandled error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})