import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { CreatorApplicationForm } from "@/components/CreatorApplicationForm";

export const BecomeCreatorButton = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    navigate("/creator-pending");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary neon-glow hover:opacity-90 transition-smooth">
          <Sparkles className="w-4 h-4 mr-2" />
          Become a Creator
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Apply to Become a Creator
          </DialogTitle>
        </DialogHeader>
        <CreatorApplicationForm 
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
