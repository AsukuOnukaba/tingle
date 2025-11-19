import { Check, CheckCheck } from "lucide-react";

interface MessageDeliveryIconProps {
  status: "sent" | "delivered" | "read" | "failed";
  isRead?: boolean;
}

export const MessageDeliveryIcon = ({ status, isRead }: MessageDeliveryIconProps) => {
  if (status === "failed") {
    return (
      <span className="text-destructive text-xs">!</span>
    );
  }

  if (status === "sent") {
    return <Check className="w-3 h-3 text-muted-foreground" />;
  }

  if (status === "delivered" || status === "read") {
    return (
      <CheckCheck 
        className={`w-3 h-3 ${
          isRead ? "text-primary" : "text-muted-foreground"
        }`}
      />
    );
  }

  return null;
};
