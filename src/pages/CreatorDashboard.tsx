import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, DollarSign, BarChart } from 'lucide-react';
import MediaUploadForm from '@/components/MediaUploadForm';
import CreatorMediaList from '@/components/CreatorMediaList';

export default function CreatorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchCreatorData = async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        toast.error('Creator profile not found');
        navigate('/creator-application');
        return;
      }

      if (data.status !== 'approved') {
        toast.error('Your creator application is pending approval');
        navigate('/creator-application');
        return;
      }

      setCreator(data);
      setLoading(false);
    };

    fetchCreatorData();

    // Subscribe to creator changes
    const channel = supabase
      .channel('creator-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'creators',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setCreator(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">Manage your content and earnings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${creator?.pending_balance?.toFixed(2) || '0.00'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${creator?.total_earned?.toFixed(2) || '0.00'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{creator?.status}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Content
            </TabsTrigger>
            <TabsTrigger value="manage">Manage Content</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload New Content</CardTitle>
                <CardDescription>Share your premium content with your subscribers</CardDescription>
              </CardHeader>
              <CardContent>
                <MediaUploadForm creatorId={creator?.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <CreatorMediaList creatorId={creator?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
