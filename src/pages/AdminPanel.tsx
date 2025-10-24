import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Users,
  ShoppingCart,
  UserCheck,
  DollarSign,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

const sb = supabase as unknown as SupabaseClient<any>;

interface Creator {
  id: string;
  user_id: string;
  status: string;
  bio: string;
  earnings: number;
  total_uploads: number;
  created_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  user_id: string;
}

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCreators: 0,
    pendingCreators: 0,
    totalTransactions: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user && isAdmin) {
      fetchAdminData();
    }
  }, [user, isAdmin]);

  const fetchAdminData = async () => {
    try {
      // Fetch creators
      const { data: creatorsData, error: creatorsError } = await sb
        .from("creators")
        .select("*")
        .order("created_at", { ascending: false });

      if (creatorsError) throw creatorsError;
      setCreators(creatorsData || []);

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await sb
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      // Calculate stats
      const { count: usersCount } = await sb
        .from("wallets")
        .select("*", { count: "exact", head: true });

      setStats({
        totalUsers: usersCount || 0,
        totalCreators: creatorsData?.filter((c: any) => c.status === 'approved').length || 0,
        pendingCreators: creatorsData?.filter((c: any) => c.status === 'pending').length || 0,
        totalTransactions: transactionsData?.length || 0,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load admin data.",
        variant: "destructive",
      });
    }
  };

  const handleCreatorApproval = async (creatorId: string, status: 'approved' | 'rejected') => {
    try {
    const { error } = await sb
      .from("creators")
      .update({ status })
      .eq("id", creatorId);

      if (error) throw error;

      // If approved, add creator role
      if (status === 'approved') {
        const creator = creators.find(c => c.id === creatorId);
        if (creator) {
        const { error: roleError } = await sb
          .from("user_roles")
          .insert({ user_id: creator.user_id, role: 'creator' });

          if (roleError && roleError.code !== '23505') { // Ignore duplicate key error
            throw roleError;
          }
        }
      }

      toast({
        title: "Success",
        description: `Creator ${status === 'approved' ? 'approved' : 'rejected'} successfully.`,
      });

      fetchAdminData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update creator status.",
        variant: "destructive",
      });
    }
  };

  // Wait for both auth and roles to load completely
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

  // After loading completes, check authentication and roles
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only redirect if loading is definitely complete and user is confirmed not admin
  if (!authLoading && !rolesLoading && !isAdmin) {
    return <Navigate to="/home" replace />;
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Active Creators",
      value: stats.totalCreators,
      icon: UserCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Pending Approvals",
      value: stats.pendingCreators,
      icon: Users,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Total Transactions",
      value: stats.totalTransactions,
      icon: ShoppingCart,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 animate-fade-up">
            <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
            <p className="text-muted-foreground">
              Manage users, creators, and platform operations
            </p>
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

          {/* Tabs for different sections */}
          <Tabs defaultValue="creators" className="animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="creators">Creator Management</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="creators">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Creator Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Bio</TableHead>
                        <TableHead>Uploads</TableHead>
                        <TableHead>Earnings</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creators.map((creator) => (
                        <TableRow key={creator.id}>
                          <TableCell>
                            <Badge
                              variant={
                                creator.status === "approved"
                                  ? "default"
                                  : creator.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {creator.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {creator.bio || "No bio"}
                          </TableCell>
                          <TableCell>{creator.total_uploads}</TableCell>
                          <TableCell>${creator.earnings.toFixed(2)}</TableCell>
                          <TableCell>
                            {new Date(creator.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {creator.status === "pending" && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleCreatorApproval(creator.id, "approved")}
                                  className="bg-green-500 hover:bg-green-600"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCreatorApproval(creator.id, "rejected")}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-xs">
                            {transaction.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${transaction.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                transaction.status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
