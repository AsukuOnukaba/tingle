import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime'
];

const MAX_TITLE_LENGTH = 200;
const MAX_PRICE = 999999.99;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if user has creator role
    const { data: roles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'creator')

    if (roleError || !roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Only creators can upload posts' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Parse the form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const isPremium = formData.get('is_premium') === 'true'
    const price = formData.get('price') ? parseFloat(formData.get('price') as string) : null

    // Validate file
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'File is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Allowed types: images and videos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate title
    if (!title || title.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (title.length > MAX_TITLE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Title must be less than ${MAX_TITLE_LENGTH} characters` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate price
    if (isPremium) {
      if (!price || price <= 0) {
        return new Response(
          JSON.stringify({ error: 'Premium content must have a positive price' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      if (price > MAX_PRICE) {
        return new Response(
          JSON.stringify({ error: `Price cannot exceed ${MAX_PRICE}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    // Upload file to storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('uploads')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('uploads')
      .getPublicUrl(uploadData.path)

    // Create post record
    const { data: post, error: postError } = await supabaseClient
      .from('posts')
      .insert({
        creator_id: user.id,
        title,
        image_url: publicUrl,
        is_premium: isPremium,
        price: isPremium ? price : null,
      })
      .select()
      .single()

    if (postError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create post' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, post, imageUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
