import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";

const CreatorPending = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkApplication = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from("creator_applications")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching application:", error);
          toast({
            title: "Error",
            description: "Failed to load application status",
            variant: "destructive",
          });
        } else if (data) {
          setApplication(data);
          
          if (data.status === 'approved') {
            const { data: roles } = await (supabase as any)
              .from("user_roles")
              .select("role")
              .eq("user_id", user.id)
              .eq("role", "creator");
            
            if (roles && roles.length > 0) {
              navigate("/creator");
            }
          }
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      }
      
      setLoading(false);
    };

    checkApplication();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (application?.status) {
      case 'approved':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return <Clock className="w-16 h-16 text-primary animate-pulse" />;
    }
  };

  const getStatusMessage = () => {
    switch (application?.status) {
      case 'approved':
        return "Your application has been approved! Redirecting...";
      case 'rejected':
        return "Unfortunately, your application was not approved at this time.";
      default:
        return "Your application is under review. We'll notify you once it's processed.";
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="pt-24 flex items-center justify-center p-4">
        <div className="glass-card p-8 rounded-3xl max-w-md w-full text-center animate-fade-up">
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>
          <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Creator Application Status
          </h1>
          <p className="text-muted-foreground mb-6">
            {getStatusMessage()}
          </p>
          {application?.status === 'pending' && (
            <p className="text-sm text-muted-foreground">
              Submitted: {new Date(application.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorPending;
