import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  user_id: string;
  creator_name: string;
  creator_email: string;
  reason: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, creator_name, creator_email, reason }: NotifyRequest = await req.json();
    
    console.log('📧 Sending creator application notification', {
      user_id,
      creator_name,
      creator_email
    });

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    
    if (!adminEmail) {
      console.error('❌ ADMIN_EMAIL not configured');
      throw new Error('Admin email not configured');
    }

    // Send email to admin
    const emailResponse = await resend.emails.send({
      from: "Tingle Platform <onboarding@resend.dev>",
      to: [adminEmail],
      subject: "New Creator Application",
      html: `
        <h1>New Creator Application Received</h1>
        <p>A new user has applied to become a creator on Tingle.</p>
        
        <h2>Application Details:</h2>
        <p><strong>Name:</strong> ${creator_name}</p>
        <p><strong>Email:</strong> ${creator_email}</p>
        <p><strong>User ID:</strong> ${user_id}</p>
        
        <h2>Application Reason:</h2>
        <p>${reason}</p>
        
        <p>Please review this application in the admin dashboard.</p>
      `,
    });

    console.log("✅ Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Error in notify-creator-application function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
