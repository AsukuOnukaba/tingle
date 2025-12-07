import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterAddressRequest {
  address: string;
  chain: 'ethereum' | 'base' | 'polygon' | 'bnb' | 'solana';
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { address, chain, userId }: RegisterAddressRequest = await req.json();

    if (!address || !chain || !userId) {
      throw new Error('Missing required fields: address, chain, userId');
    }

    // Verify user is authorized
    if (user.id !== userId) {
      throw new Error('Unauthorized: User ID mismatch');
    }

    console.log(`Registering address ${address} for chain ${chain}, user ${userId}`);

    // Store address in database
    const updateField = chain === 'solana' ? 'solana_address' : 'evm_address';
    
    // Get current connected_wallets
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('connected_wallets')
      .eq('id', userId)
      .single();

    const currentWallets = (profile?.connected_wallets as any[]) || [];
    
    // Check if this address/chain combo already exists
    const existingIndex = currentWallets.findIndex(
      (w: any) => w.chain === chain
    );
    
    if (existingIndex >= 0) {
      currentWallets[existingIndex] = { address, chain, connected_at: new Date().toISOString() };
    } else {
      currentWallets.push({ address, chain, connected_at: new Date().toISOString() });
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        [updateField]: address.toLowerCase(),
        connected_wallets: currentWallets,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw new Error('Failed to update profile with wallet address');
    }

    // Register with Alchemy for EVM chains
    if (chain !== 'solana') {
      const alchemyApiKey = Deno.env.get('ALCHEMY_API_KEY');
      
      if (alchemyApiKey) {
        // Map chain to Alchemy network
        const networkMap: Record<string, string> = {
          ethereum: 'ETH_MAINNET',
          base: 'BASE_SEPOLIA',
          polygon: 'MATIC_MAINNET',
          bnb: 'BNB_MAINNET',
        };
        const network = networkMap[chain] || 'BASE_SEPOLIA';

        // Note: In production, you'd use Alchemy's Notify API to add addresses to existing webhook
        // For now, we log the intent - webhook already monitors all addresses we look up
        console.log(`Would register ${address} with Alchemy webhook for network ${network}`);
        
        // The Alchemy webhook already monitors transfers TO any address we look up in the webhook handler
        // So we just need to ensure the address is stored in our database
      }
    } else {
      // Register with Helius for Solana
      const heliusApiKey = Deno.env.get('HELIUS_API_KEY');
      
      if (heliusApiKey) {
        try {
          // Get existing webhook to add address
          const webhooksResponse = await fetch(
            `https://api.helius.xyz/v0/webhooks?api-key=${heliusApiKey}`,
            { method: 'GET' }
          );
          
          if (webhooksResponse.ok) {
            const webhooks = await webhooksResponse.json();
            
            if (webhooks.length > 0) {
              const webhook = webhooks[0];
              const existingAddresses = webhook.accountAddresses || [];
              
              // Add new address if not already present
              if (!existingAddresses.includes(address)) {
                const updateResponse = await fetch(
                  `https://api.helius.xyz/v0/webhooks/${webhook.webhookID}?api-key=${heliusApiKey}`,
                  {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      webhookURL: webhook.webhookURL,
                      accountAddresses: [...existingAddresses, address],
                      transactionTypes: webhook.transactionTypes,
                      webhookType: webhook.webhookType,
                    }),
                  }
                );
                
                if (updateResponse.ok) {
                  console.log(`Successfully added ${address} to Helius webhook`);
                } else {
                  console.warn('Failed to update Helius webhook:', await updateResponse.text());
                }
              }
            } else {
              // Create new webhook
              const supabaseUrl = Deno.env.get('SUPABASE_URL');
              const createResponse = await fetch(
                `https://api.helius.xyz/v0/webhooks?api-key=${heliusApiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    webhookURL: `${supabaseUrl}/functions/v1/helius-webhook`,
                    accountAddresses: [address],
                    transactionTypes: ['TRANSFER', 'ANY'],
                    webhookType: 'enhanced',
                  }),
                }
              );
              
              if (createResponse.ok) {
                console.log('Created new Helius webhook with address:', address);
              } else {
                console.warn('Failed to create Helius webhook:', await createResponse.text());
              }
            }
          }
        } catch (error) {
          console.error('Helius API error:', error);
          // Don't fail the whole request if webhook registration fails
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Address ${address} registered for ${chain}`,
        address,
        chain,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error registering wallet address:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
