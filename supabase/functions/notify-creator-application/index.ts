import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface CreatorApplicationData {
  fullLegalName: string;
  displayName: string;
  age: number;
  dateOfBirth: string;
  gender: string;
  country: string;
  city: string;
  email: string;
  bio: string;
  contentType: string;
  monthlyPrice: string;
  profilePictureUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  twitterUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
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
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('UNAUTHORIZED');
    }

    const applicationData: CreatorApplicationData = await req.json();

    // Validate required fields
    if (!applicationData.fullLegalName || !applicationData.email || !applicationData.displayName) {
      throw new Error('MISSING_REQUIRED_FIELDS');
    }

    console.log('Processing creator application notification for:', applicationData.email);

    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    
    if (!adminEmail) {
      throw new Error('ADMIN_EMAIL_NOT_CONFIGURED');
    }

    // Create HTML email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .section { background: white; padding: 20px; margin-bottom: 20px; border-radius: 6px; border-left: 4px solid #667eea; }
            .label { font-weight: bold; color: #667eea; display: inline-block; min-width: 150px; }
            .value { color: #333; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
            h1 { margin: 0; font-size: 24px; }
            h2 { color: #667eea; font-size: 18px; margin-top: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 New Creator Application</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">A new creator has applied to join the platform</p>
            </div>
            
            <div class="content">
              <div class="section">
                <h2>👤 Personal Information</h2>
                ${applicationData.profilePictureUrl ? `
                  <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${applicationData.profilePictureUrl}" alt="Profile" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #667eea;" />
                  </div>
                ` : ''}
                <p><span class="label">Legal Name:</span> <span class="value">${applicationData.fullLegalName}</span></p>
                <p><span class="label">Display Name:</span> <span class="value">${applicationData.displayName}</span></p>
                <p><span class="label">Email:</span> <span class="value">${applicationData.email}</span></p>
                <p><span class="label">Age:</span> <span class="value">${applicationData.age} years old</span></p>
                <p><span class="label">Gender:</span> <span class="value">${applicationData.gender}</span></p>
                <p><span class="label">Location:</span> <span class="value">${applicationData.city}, ${applicationData.country}</span></p>
              </div>

              <div class="section">
                <h2>📸 Content Details</h2>
                <p><span class="label">Content Type:</span> <span class="value">${applicationData.contentType}</span></p>
                <p><span class="label">Monthly Price:</span> <span class="value">$${applicationData.monthlyPrice}</span></p>
                <p><span class="label">Bio:</span></p>
                <p style="background: #f3f4f6; padding: 15px; border-radius: 4px; margin-top: 10px;">${applicationData.bio}</p>
              </div>

              ${applicationData.instagramUrl || applicationData.tiktokUrl || applicationData.twitterUrl ? `
              <div class="section">
                <h2>🔗 Social Media</h2>
                ${applicationData.instagramUrl ? `<p><span class="label">Instagram:</span> <span class="value">${applicationData.instagramUrl}</span></p>` : ''}
                ${applicationData.tiktokUrl ? `<p><span class="label">TikTok:</span> <span class="value">${applicationData.tiktokUrl}</span></p>` : ''}
                ${applicationData.twitterUrl ? `<p><span class="label">Twitter:</span> <span class="value">${applicationData.twitterUrl}</span></p>` : ''}
              </div>
              ` : ''}

              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #666; margin-bottom: 15px;">Review this application in your admin panel:</p>
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/admin" class="button">
                  Go to Admin Panel
                </a>
              </div>
            </div>

            <div class="footer">
              <p>This is an automated notification from Tingle Creator Platform</p>
              <p>User ID: ${user.id}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: 'Tingle <onboarding@resend.dev>',
      to: [adminEmail],
      subject: `New Creator Application: ${applicationData.displayName}`,
      html: emailHtml,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Application submitted and admin notified',
        emailId: emailResponse.data?.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in notify-creator-application function:', error);
    
    const errorMap: Record<string, string> = {
      'UNAUTHORIZED': 'Authentication required',
      'MISSING_REQUIRED_FIELDS': 'Missing required application fields',
      'ADMIN_EMAIL_NOT_CONFIGURED': 'Admin email not configured',
    };
    
    const errorCode = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const userMessage = errorMap[errorCode] || 'Failed to process application';
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
