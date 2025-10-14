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
    console.log('invite-user: SUPABASE_URL:', Deno.env.get('SUPABASE_URL'));
    console.log('invite-user: SUPABASE_ANON_KEY (first 5 chars):', Deno.env.get('SUPABASE_ANON_KEY')?.substring(0, 5));
    console.log('invite-user: SUPABASE_SERVICE_ROLE_KEY (first 5 chars):', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.substring(0, 5));

    // Create a Supabase client with the user's auth token
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the currently authenticated user
    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser()
    if (userError) {
      console.error('invite-user: Error getting user:', userError);
      return new Response(JSON.stringify({ error: `Authentication error: ${userError.message}` }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: No user session found.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get companyId and inviteeEmail from the request body
    const { companyId, inviteeEmail } = await req.json()
    if (!companyId || !inviteeEmail) {
      return new Response(JSON.stringify({ error: 'companyId and inviteeEmail are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create a Supabase admin client to perform privileged operations
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Verify the inviter owns the company
    const { data: company, error: companyError } = await adminSupabaseClient
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('user_id', user.id)
      .single()

    if (companyError || !company) {
      console.error('invite-user: Company ownership verification failed:', companyError);
      return new Response(JSON.stringify({ error: 'Você não possui esta empresa ou ela não existe.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Look up the invitee's user ID by email via RPC
    const { data: inviteeId, error: rpcError } = await adminSupabaseClient.rpc('get_user_id_by_email', {
      user_email: inviteeEmail
    })

    if (rpcError || !inviteeId) {
      console.error('invite-user: RPC get_user_id_by_email failed:', rpcError);
      return new Response(JSON.stringify({ error: 'Usuário com este e-mail não existe.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (inviteeId === user.id) {
        return new Response(JSON.stringify({ error: 'Você não pode compartilhar uma empresa com você mesmo.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    // 3. Check if the invitee has a profile, create one if not.
    const { data: profile, error: fetchProfileError } = await adminSupabaseClient
      .from('profiles')
      .select('id')
      .eq('id', inviteeId)
      .single()

    if (fetchProfileError && fetchProfileError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('invite-user: Error fetching profile:', fetchProfileError);
      throw new Error(`Error fetching profile for user ${inviteeId}: ${fetchProfileError.message}`);
    }

    if (!profile) {
      console.log(`invite-user: Profile not found for user ${inviteeId}, creating one.`);
      const { error: createProfileError } = await adminSupabaseClient
        .from('profiles')
        .insert({ id: inviteeId })
      if (createProfileError) {
        console.error(`invite-user: Could not create missing profile for user ${inviteeId}:`, createProfileError);
        throw new Error(`Could not create missing profile for user ${inviteeId}: ${createProfileError.message}`)
      }
    }

    // 4. Insert the share record
    const { error: insertError } = await adminSupabaseClient
      .from('company_shares')
      .insert({
        company_id: companyId,
        shared_with_user_id: inviteeId,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ error: 'Esta empresa já está compartilhada com este usuário.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      console.error('invite-user: Error inserting company share:', insertError);
      throw insertError
    }

    console.log(`invite-user: Successfully shared company ${companyId} with user ${inviteeId} (${inviteeEmail}).`); // Novo log de sucesso
    return new Response(JSON.stringify({ success: true, message: 'Empresa compartilhada com sucesso.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('invite-user: Unhandled error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})