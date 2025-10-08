import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user from the auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { mediaId, viewOnly } = await req.json();

    // Get media details
    const { data: media, error: mediaError } = await supabase
      .from('media')
      .select('*, creators(*)')
      .eq('id', mediaId)
      .single();

    if (mediaError || !media) {
      throw new Error('Media not found');
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from('media_purchases')
      .select('*')
      .eq('media_id', mediaId)
      .eq('buyer_id', user.id)
      .single();

    if (viewOnly) {
      // Just return signed URL if already purchased
      if (!existingPurchase) {
        throw new Error('You have not purchased this content');
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('media-content')
        .createSignedUrl(media.file_url, 3600); // 1 hour expiry

      if (signedUrlError) {
        throw new Error('Failed to generate access URL');
      }

      return new Response(
        JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingPurchase) {
      // Already purchased, just return signed URL
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('media-content')
        .createSignedUrl(media.file_url, 3600);

      if (signedUrlError) {
        throw new Error('Failed to generate access URL');
      }

      return new Response(
        JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get buyer's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    // Check if buyer has enough balance
    if (wallet.balance < media.price) {
      throw new Error('Insufficient balance');
    }

    // Deduct from buyer's wallet
    const newBuyerBalance = Number(wallet.balance) - Number(media.price);
    const { error: updateBuyerError } = await supabase
      .from('wallets')
      .update({ balance: newBuyerBalance })
      .eq('user_id', user.id);

    if (updateBuyerError) {
      throw new Error('Failed to process payment');
    }

    // Calculate platform fee (20%)
    const platformFee = Number(media.price) * 0.2;
    const creatorEarning = Number(media.price) - platformFee;

    // Credit creator's pending balance
    const { error: updateCreatorError } = await supabase
      .from('creators')
      .update({
        pending_balance: Number(media.creators.pending_balance) + creatorEarning,
        total_earned: Number(media.creators.total_earned) + creatorEarning
      })
      .eq('id', media.creator_id);

    if (updateCreatorError) {
      console.error('Failed to credit creator:', updateCreatorError);
    }

    // Record the purchase
    const { error: purchaseError } = await supabase
      .from('media_purchases')
      .insert({
        media_id: mediaId,
        buyer_id: user.id,
        price_paid: media.price
      });

    if (purchaseError) {
      console.error('Failed to record purchase:', purchaseError);
    }

    // Record transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'media_purchase',
        amount: -media.price,
        balance_after: newBuyerBalance,
        status: 'completed',
        metadata: {
          media_id: mediaId,
          media_title: media.title,
          creator_id: media.creator_id
        }
      });

    if (txError) {
      console.error('Failed to record transaction:', txError);
    }

    // Generate signed URL for the content
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('media-content')
      .createSignedUrl(media.file_url, 3600); // 1 hour expiry

    if (signedUrlError) {
      throw new Error('Failed to generate access URL');
    }

    return new Response(
      JSON.stringify({
        success: true,
        signedUrl: signedUrlData.signedUrl,
        message: 'Purchase successful!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Media purchase error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
