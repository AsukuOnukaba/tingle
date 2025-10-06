import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Users, DollarSign, FileText, UserCheck } from 'lucide-react';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminCreators from '@/components/admin/AdminCreators';
import AdminMedia from '@/components/admin/AdminMedia';
import AdminTransactions from '@/components/admin/AdminTransactions';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCreators: 0,
    totalRevenue: 0,
    pendingWithdrawals: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    checkAdminStatus();
  }, [user, navigate]);

  const checkAdminStatus = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (error || !data) {
      toast.error('Access denied. Admin only.');
      navigate('/');
      return;
    }

    setIsAdmin(true);
    fetchStats();
  };

  const fetchStats = async () => {
    try {
      // Total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total creators
      const { count: creatorCount } = await supabase
        .from('creators')
        .select('*', { count: 'exact', head: true });

      // Total revenue
      const { data: revenueData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'subscription')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Pending withdrawals
      const { data: withdrawalData } = await supabase
        .from('creators')
        .select('pending_balance');

      const pendingWithdrawals = withdrawalData?.reduce((sum, c) => sum + Number(c.pending_balance), 0) || 0;

      setStats({
        totalUsers: userCount || 0,
        totalCreators: creatorCount || 0,
        totalRevenue,
        pendingWithdrawals
      });

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setLoading(false);
    }
  };

  if (!isAdmin || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Creators</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCreators}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.pendingWithdrawals.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="creators" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="creators">Creators</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="creators">
            <AdminCreators />
          </TabsContent>

          <TabsContent value="media">
            <AdminMedia />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="transactions">
            <AdminTransactions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
