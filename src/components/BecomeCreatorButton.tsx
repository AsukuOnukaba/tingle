import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const BecomeCreatorButton = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for your application",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      // Get user profile for email notification
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      // Insert into creators table with pending status and application note
      const { error } = await (supabase as any)
        .from("creators")
        .insert({
          user_id: user.id,
          display_name: profile?.display_name || "Unknown",
          application_note: reason.trim(),
          status: "pending",
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Application exists",
            description: "You've already submitted an application",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        // Send email notification to admin
        try {
          await supabase.functions.invoke('notify-creator-application', {
            body: {
              user_id: user.id,
              creator_name: profile?.display_name || "Unknown",
              creator_email: user.email,
              reason: reason.trim()
            }
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Don't fail the whole process if email fails
        }

        toast({
          title: "Application submitted!",
          description: "We'll review your application soon and notify you via email",
        });
        setOpen(false);
        navigate("/creator-pending");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary neon-glow hover:opacity-90 transition-smooth">
          <Sparkles className="w-4 h-4 mr-2" />
          Become a Creator
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Apply to Become a Creator
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Tell us why you want to become a creator on Tingle
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Why do you want to be a creator?</Label>
            <Textarea
              id="reason"
              placeholder="Share your story, goals, and what you plan to create..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[150px] bg-muted/50 border-border/50 focus:border-primary"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.length}/500
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="gradient-primary hover:opacity-90 transition-smooth"
          >
            {loading ? "Submitting..." : "Submit Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
