import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
}

const ManagePlans = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isCreator, isAdmin, loading: rolesLoading } = useRoles();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration_days: "30",
    features: "",
  });

  useEffect(() => {
    // Wait for auth and roles to load before checking
    if (authLoading || rolesLoading) return;

    if (!user) {
      navigate("/login");
      return;
    }
    // Allow both creators and admins to access
    if (!isCreator && !isAdmin) {
      navigate("/home");
      return;
    }
    fetchPlans();
  }, [user, isCreator, isAdmin, authLoading, rolesLoading]);

  const fetchPlans = async () => {
    try {
      setLoading(true);

      // Get creator ID
      const { data: creatorData } = await (supabase as any)
        .from("creators")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!creatorData) {
        setPlans([]);
        setLoading(false);
        return;
      }

      // Fetch plans
      const { data: plansData, error } = await (supabase as any)
        .from("subscription_plans")
        .select("*")
        .eq("creator_id", creatorData.id)
        .order("price", { ascending: true });

      if (error) throw error;
      setPlans(plansData || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast({
        title: "Error",
        description: "Failed to load plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const features = formData.features
        .split("\n")
        .filter((f) => f.trim())
        .map((f) => f.trim());

      if (!formData.name || !formData.price || features.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Get creator ID
      const { data: creatorData } = await (supabase as any)
        .from("creators")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!creatorData) throw new Error("Creator not found");

      const planData = {
        creator_id: creatorData.id,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_days: parseInt(formData.duration_days),
        features,
        is_active: true,
      };

      if (editingPlan) {
        // Update existing plan
        const { error } = await (supabase as any)
          .from("subscription_plans")
          .update(planData)
          .eq("id", editingPlan.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Plan updated successfully",
        });
      } else {
        // Create new plan
        const { error } = await (supabase as any)
          .from("subscription_plans")
          .insert(planData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Plan created successfully",
        });
      }

      setDialogOpen(false);
      setEditingPlan(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        duration_days: "30",
        features: "",
      });
      fetchPlans();
    } catch (error: any) {
      console.error("Error saving plan:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save plan",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      features: plan.features.join("\n"),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    try {
      const { error } = await (supabase as any)
        .from("subscription_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete plan",
        variant: "destructive",
      });
    }
  };

  const togglePlanStatus = async (plan: Plan) => {
    try {
      const { error } = await (supabase as any)
        .from("subscription_plans")
        .update({ is_active: !plan.is_active })
        .eq("id", plan.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Plan ${!plan.is_active ? "activated" : "deactivated"}`,
      });
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update plan",
        variant: "destructive",
      });
    }
  };

  // Show loading spinner while checking auth
  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!user || (!isCreator && !isAdmin)) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 animate-fade-up">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Manage Subscription Plans
              </h1>
              <p className="text-muted-foreground">
                Create and manage your subscription packages
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary neon-glow" onClick={() => {
                  setEditingPlan(null);
                  setFormData({
                    name: "",
                    description: "",
                    price: "",
                    duration_days: "30",
                    features: "",
                  });
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingPlan ? "Edit Plan" : "Create New Plan"}
                  </DialogTitle>
                  <DialogDescription>
                    Set up your subscription package details
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Plan Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Premium, VIP, Basic"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of what this plan offers"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price (₦) *</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="5000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (days)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.duration_days}
                        onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                        placeholder="30"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="features">Features (one per line) *</Label>
                    <Textarea
                      id="features"
                      value={formData.features}
                      onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                      placeholder="Access to all premium content&#10;Direct messaging&#10;Priority support"
                      rows={6}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} className="gradient-primary">
                    {editingPlan ? "Update Plan" : "Create Plan"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Plans Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            </div>
          ) : plans.length === 0 ? (
            <Card className="glass-card animate-fade-up">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Plans Yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Create your first subscription plan to start offering premium content to your fans
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan, index) => (
                <Card
                  key={plan.id}
                  className="glass-card hover-scale transition-smooth animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <Badge variant={plan.is_active ? "default" : "secondary"}>
                        {plan.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-primary">
                        ₦{plan.price.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">
                        /{plan.duration_days} days
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="text-sm flex items-start">
                          <span className="text-primary mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                      {plan.features.length > 3 && (
                        <li className="text-sm text-muted-foreground">
                          +{plan.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </CardContent>

                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(plan)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePlanStatus(plan)}
                      className="flex-1"
                    >
                      {plan.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagePlans;
