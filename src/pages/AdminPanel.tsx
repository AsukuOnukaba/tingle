import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Users,
  ShoppingCart,
  UserCheck,
  DollarSign,
  CheckCircle,
  XCircle,
  TrendingUp,
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
import { StatDetailModal } from "@/components/StatDetailModal";

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
  type: string;
  created_at: string;
  user_id: string;
}

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCreators: 0,
    pendingCreators: 0,
    totalTransactions: 0,
    totalRevenue: 0,
  });
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'users' | 'creators' | 'transactions' | 'revenue' | null;
    data: any[];
  }>({
    isOpen: false,
    type: null,
    data: [],
  });
  const { toast } = useToast();

  // Debug logging
  console.log('🔍 AdminPanel State:', {
    authLoading,
    rolesLoading,
    hasUser: !!user,
    userId: user?.id,
    isAdmin,
  });

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
        .limit(100);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      // Fetch users
      const { data: usersData, error: usersError } = await sb
        .from("wallets")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Calculate total revenue
      const totalRevenue = transactionsData?.reduce((sum: number, t: any) => 
        t.type === 'credit' ? sum + Number(t.amount) : sum, 0) || 0;

      setStats({
        totalUsers: usersData?.length || 0,
        totalCreators: creatorsData?.filter((c: any) => c.status === 'approved').length || 0,
        pendingCreators: creatorsData?.filter((c: any) => c.status === 'pending').length || 0,
        totalTransactions: transactionsData?.length || 0,
        totalRevenue,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load admin data.",
        variant: "destructive",
      });
    }
  };

  const handleStatClick = (type: 'users' | 'creators' | 'transactions' | 'revenue') => {
    let data: any[] = [];
    
    switch (type) {
      case 'users':
        data = users;
        break;
      case 'creators':
        data = creators.filter(c => c.status === 'approved');
        break;
      case 'transactions':
        data = transactions;
        break;
      case 'revenue':
        data = transactions.filter(t => t.type === 'credit');
        break;
    }

    setModalState({
      isOpen: true,
      type,
      data,
    });
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

  // Show loading spinner while auth or roles are being fetched
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

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to home if not an admin (only after loading completes)
  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      type: 'users' as const,
    },
    {
      title: "Active Creators",
      value: stats.totalCreators,
      icon: UserCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      type: 'creators' as const,
    },
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      type: 'revenue' as const,
    },
    {
      title: "Total Transactions",
      value: stats.totalTransactions,
      icon: ShoppingCart,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      type: 'transactions' as const,
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
                  className="glass-card hover-scale animate-fade-up cursor-pointer transition-all hover:shadow-lg"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => handleStatClick(stat.type)}
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
                    <p className="text-xs text-muted-foreground mt-1">Click to view details</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detail Modal */}
          {modalState.type && (
            <StatDetailModal
              isOpen={modalState.isOpen}
              onClose={() => setModalState({ isOpen: false, type: null, data: [] })}
              title={statCards.find(s => s.type === modalState.type)?.title || ''}
              icon={statCards.find(s => s.type === modalState.type)?.icon || Users}
              data={modalState.data}
              type={modalState.type === 'revenue' ? 'earnings' : modalState.type}
            />
          )}

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
