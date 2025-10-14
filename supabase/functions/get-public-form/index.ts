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
    const { form_id } = await req.json()
    console.log('get-public-form: Received form_id:', form_id);
    
    if (!form_id) {
      console.error('get-public-form: form_id is missing in request body.');
      return new Response(JSON.stringify({ error: 'form_id é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await adminSupabaseClient
      .from('forms')
      .select('*')
      .eq('id', form_id)
      .eq('status', 'published')
      .single()

    if (error) {
      console.error('get-public-form: Error fetching form:', error);
      throw error
    }

    if (!data) {
      console.log('get-public-form: Form not found or not published for ID:', form_id);
      return new Response(JSON.stringify({ error: 'Formulário não encontrado ou não está publicado.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('get-public-form: Successfully fetched form data.');
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('get-public-form: Unhandled error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})