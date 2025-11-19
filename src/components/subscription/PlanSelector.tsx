import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
}

interface PlanSelectorProps {
  plans: Plan[];
  selectedPlanId: string | null;
  onSelectPlan: (plan: Plan) => void;
  onProceed: () => void;
  loading?: boolean;
}

export const PlanSelector = ({
  plans,
  selectedPlanId,
  onSelectPlan,
  onProceed,
  loading = false
}: PlanSelectorProps) => {
  if (plans.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          This creator has no subscription plans available.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Check back later or purchase individual content items.
        </p>
      </div>
    );
  }

  const mostPopularIndex = Math.floor(plans.length / 2);

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {plans.map((plan, index) => {
          const isSelected = selectedPlanId === plan.id;
          const isPopular = index === mostPopularIndex && plans.length > 1;

          return (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all hover-scale ${
                isSelected
                  ? "border-primary shadow-lg"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => onSelectPlan(plan)}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary">
                  Most Popular
                </Badge>
              )}
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.description}
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted"
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">₦{plan.price.toLocaleString()}</span>
                  <span className="text-muted-foreground ml-2">
                    / {plan.duration_days} days
                  </span>
                </div>

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Button
        onClick={onProceed}
        disabled={!selectedPlanId || loading}
        className="w-full"
        size="lg"
      >
        {loading ? "Processing..." : "Continue to Payment"}
      </Button>
    </div>
  );
};
