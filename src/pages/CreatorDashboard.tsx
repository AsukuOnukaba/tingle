import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { 
  TrendingUp, 
  Upload, 
  DollarSign, 
  Wallet,
  ArrowUpRight,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const sb = supabase as unknown as SupabaseClient<any>;

interface CreatorStats {
  total_uploads: number;
  earnings: number;
  premium_sales: number;
  wallet_balance: number;
  pending_withdrawals: number;
}

const CreatorDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isCreator, isAdmin, loading: rolesLoading } = useRoles();
  const [stats, setStats] = useState<CreatorStats>({
    total_uploads: 0,
    earnings: 0,
    premium_sales: 0,
    wallet_balance: 0,
    pending_withdrawals: 0,
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user && (isCreator || isAdmin)) {
      fetchCreatorStats();
      fetchSalesData();
    }
  }, [user, isCreator, isAdmin]);

  const fetchCreatorStats = async () => {
    try {
      // Get creator info
      const { data: creatorData, error: creatorError } = await sb
        .from("creators")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (creatorError) throw creatorError;

      // Get wallet balance
      const { data: walletData, error: walletError } = await sb
        .from("wallets")
        .select("balance")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (walletError) throw walletError;

      // Get sales count
      const { count: salesCount, error: salesError } = await sb
        .from("media_purchases")
        .select("*", { count: "exact", head: true })
        .in(
          "media_id",
          await sb
            .from("media")
            .select("id")
            .eq("creator_id", creatorData?.id || '')
            .then((res: any) => res.data?.map((c: any) => c.id) || [])
        );

      if (salesError) throw salesError;

      // Get pending withdrawals
      const { data: withdrawalsData, error: withdrawalsError } = await sb
        .from("withdrawal_requests")
        .select("amount")
        .eq("status", "pending")
        .eq("user_id", user?.id);

      if (withdrawalsError) throw withdrawalsError;

      const pendingAmount = withdrawalsData?.reduce((sum, w: any) => sum + Number(w.amount), 0) || 0;

      setStats({
        total_uploads: creatorData ? (creatorData as any).total_uploads || 0 : 0,
        earnings: creatorData ? Number((creatorData as any).earnings) || 0 : 0,
        premium_sales: salesCount || 0,
        wallet_balance: walletData ? Number((walletData as any).balance) || 0 : 0,
        pending_withdrawals: pendingAmount,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesData = async () => {
    try {
    const { data, error } = await sb
      .from("media_purchases")
      .select("created_at, price_paid")
      .order("created_at", { ascending: true })
      .limit(7);

      if (error) throw error;

      // Group by date
      const grouped = data?.reduce((acc: any, purchase: any) => {
        const date = new Date(purchase.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        if (!acc[date]) {
          acc[date] = { date, sales: 0 };
        }
        acc[date].sales += Number(purchase.price_paid);
        return acc;
      }, {});

      setSalesData(Object.values(grouped || {}));
    } catch (error) {
      console.error("Error fetching sales data:", error);
    }
  };

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

  if (!user || (!isCreator && !isAdmin)) {
    return <Navigate to="/creator" replace />;
  }

  const statCards = [
    {
      title: "Total Uploads",
      value: stats.total_uploads,
      icon: Upload,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total Earnings",
      value: `$${stats.earnings.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Premium Sales",
      value: stats.premium_sales,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Wallet Balance",
      value: `$${stats.wallet_balance.toFixed(2)}`,
      icon: Wallet,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center animate-fade-up">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Creator Dashboard</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Track your performance and manage your content
              </p>
            </div>
            <Button
              onClick={() => window.location.href = '/manage-plans'}
              className="gradient-primary neon-glow"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Manage Plans
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.title}
                  className="glass-card hover-scale animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`${stat.bgColor} p-2 rounded-lg`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts and Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart */}
            <Card className="glass-card lg:col-span-2 animate-fade-up" style={{ animationDelay: "0.4s" }}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Sales Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="glass-card animate-fade-up" style={{ animationDelay: "0.5s" }}>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full gradient-primary">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Content
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Request Withdrawal
                </Button>
                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground mb-2">
                    Pending Withdrawals
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    ${stats.pending_withdrawals.toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;
