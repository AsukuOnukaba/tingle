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
  Clock,
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

interface CreatorApplication {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  date_of_birth: string;
  age: number;
  location: string;
  phone: string;
  content_type: string;
  bio: string;
  profile_photo_url: string;
  government_id_url: string;
  social_media: any;
  status: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

interface Creator {
  id: string;
  user_id: string;
  display_name: string;
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
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCreators: 0,
    pendingApplications: 0,
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
      // Fetch creator applications
      const { data: applicationsData, error: applicationsError } = await sb
        .from("creator_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (applicationsError) throw applicationsError;
      setApplications(applicationsData || []);

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
        pendingApplications: applicationsData?.filter((a: any) => a.status === 'pending').length || 0,
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

  const handleApplicationReview = async (applicationId: string, status: 'approved' | 'rejected', rejectionReason?: string) => {
    try {
      const application = applications.find(a => a.id === applicationId);
      if (!application) return;

      // Update application status
      const { error: updateError } = await sb
        .from("creator_applications")
        .update({ 
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null
        })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      // If approved, create creator record and assign role
      if (status === 'approved') {
        // Create creator record
        const { error: creatorError } = await sb
          .from("creators")
          .insert({
            user_id: application.user_id,
            display_name: application.display_name,
            bio: application.bio,
            status: 'approved',
            application_note: `Approved application from ${application.email}`,
          });

        if (creatorError && creatorError.code !== '23505') {
          throw creatorError;
        }

        // Assign creator role
        const { error: roleError } = await sb
          .from("user_roles")
          .insert({ user_id: application.user_id, role: 'creator' });

        if (roleError && roleError.code !== '23505') {
          throw roleError;
        }

        // Update profile with creator info
        const { error: profileError } = await sb
          .from("profiles")
          .update({
            display_name: application.display_name,
            bio: application.bio,
            profile_image: application.profile_photo_url,
          })
          .eq("id", application.user_id);

        if (profileError) {
          console.error("Profile update error:", profileError);
        }
      }

      toast({
        title: "Success",
        description: `Application ${status === 'approved' ? 'approved' : 'rejected'} successfully.`,
      });

      fetchAdminData();
    } catch (error: any) {
      console.error("Error reviewing application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update application status.",
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
      title: "Pending Applications",
      value: stats.pendingApplications,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
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
          <Tabs defaultValue="applications" className="animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="applications">Creator Applications</TabsTrigger>
              <TabsTrigger value="creators">Active Creators</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="applications">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Pending Creator Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  {applications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No pending applications</p>
                  ) : (
                    <div className="space-y-4">
                      {applications.map((app) => (
                        <Card key={app.id} className="border-border/50">
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <h3 className="font-semibold text-lg">{app.display_name}</h3>
                                  <p className="text-sm text-muted-foreground">{app.email}</p>
                                  <Badge variant={
                                    app.status === "pending" ? "secondary" :
                                    app.status === "approved" ? "default" : "destructive"
                                  }>
                                    {app.status}
                                  </Badge>
                                </div>
                                <div className="text-right text-sm text-muted-foreground">
                                  <p>Age: {app.age}</p>
                                  <p>{app.location}</p>
                                  <p>{new Date(app.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Content Type:</span>
                                  <p className="font-medium">{app.content_type}</p>
                                </div>
                                {app.phone && (
                                  <div>
                                    <span className="text-muted-foreground">Phone:</span>
                                    <p className="font-medium">{app.phone}</p>
                                  </div>
                                )}
                              </div>

                              <div>
                                <span className="text-sm text-muted-foreground">Bio:</span>
                                <p className="text-sm mt-1">{app.bio}</p>
                              </div>

                              <div className="flex gap-2">
                                {app.profile_photo_url && (
                                  <a href={app.profile_photo_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                    View Profile Photo
                                  </a>
                                )}
                                {app.government_id_url && (
                                  <a href={app.government_id_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                    View Government ID
                                  </a>
                                )}
                              </div>

                              {app.status === "pending" && (
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApplicationReview(app.id, "approved")}
                                    className="bg-green-500 hover:bg-green-600 flex-1"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      const reason = prompt("Reason for rejection (optional):");
                                      handleApplicationReview(app.id, "rejected", reason || undefined);
                                    }}
                                    className="flex-1"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                  </Button>
                                </div>
                              )}

                              {app.rejection_reason && (
                                <div className="bg-destructive/10 p-3 rounded-lg">
                                  <p className="text-sm text-destructive">
                                    <strong>Rejection reason:</strong> {app.rejection_reason}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="creators">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Active Creators</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Bio</TableHead>
                        <TableHead>Uploads</TableHead>
                        <TableHead>Earnings</TableHead>
                        <TableHead>Date Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creators.filter(c => c.status === 'approved').map((creator) => (
                        <TableRow key={creator.id}>
                          <TableCell>{creator.display_name || 'N/A'}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {creator.bio || "No bio"}
                          </TableCell>
                          <TableCell>{creator.total_uploads || 0}</TableCell>
                          <TableCell>${(creator.earnings || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            {new Date(creator.created_at).toLocaleDateString()}
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
