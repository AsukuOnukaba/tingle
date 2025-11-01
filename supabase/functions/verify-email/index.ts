import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { token } = await req.json();

    if (!token) {
      throw new Error("Token is required");
    }

    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from("email_verification_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      throw new Error("Invalid or expired token");
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      throw new Error("Token has expired");
    }

    // Update user email verification status
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (updateError) throw updateError;

    // Delete used token
    await supabase
      .from("email_verification_tokens")
      .delete()
      .eq("token", token);

    // Send notification
    await supabase.rpc("send_notification", {
      p_user_id: tokenData.user_id,
      p_type: "email_verified",
      p_title: "Email Verified",
      p_message: "Your email has been successfully verified!",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email verified successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error verifying email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
