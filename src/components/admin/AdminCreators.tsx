import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, X, Ban } from 'lucide-react';

export default function AdminCreators() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreators();

    const channel = supabase
      .channel('admin-creators')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'creators' },
        () => fetchCreators()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCreators = async () => {
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load creators');
      return;
    }

    setCreators(data || []);
    setLoading(false);
  };

  const updateCreatorStatus = async (creatorId: string, status: string) => {
    const { error } = await supabase
      .from('creators')
      .update({ status })
      .eq('id', creatorId);

    if (error) {
      toast.error('Failed to update creator status');
      return;
    }

    toast.success(`Creator ${status}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {creators.map((creator) => (
        <Card key={creator.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{creator.display_name}</CardTitle>
                <CardDescription>{creator.bio}</CardDescription>
              </div>
              <Badge
                variant={
                  creator.status === 'approved' ? 'default' :
                  creator.status === 'rejected' ? 'destructive' :
                  creator.status === 'suspended' ? 'destructive' :
                  'secondary'
                }
              >
                {creator.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {creator.application_note && (
                <div>
                  <p className="text-sm font-medium">Application Note:</p>
                  <p className="text-sm text-muted-foreground">{creator.application_note}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Pending Balance</p>
                  <p className="text-muted-foreground">${creator.pending_balance}</p>
                </div>
                <div>
                  <p className="font-medium">Total Earned</p>
                  <p className="text-muted-foreground">${creator.total_earned}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {creator.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateCreatorStatus(creator.id, 'approved')}
                      className="flex items-center gap-1"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateCreatorStatus(creator.id, 'rejected')}
                      className="flex items-center gap-1"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </>
                )}
                {creator.status === 'approved' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateCreatorStatus(creator.id, 'suspended')}
                    className="flex items-center gap-1"
                  >
                    <Ban className="h-4 w-4" />
                    Suspend
                  </Button>
                )}
                {creator.status === 'suspended' && (
                  <Button
                    size="sm"
                    onClick={() => updateCreatorStatus(creator.id, 'approved')}
                    className="flex items-center gap-1"
                  >
                    <Check className="h-4 w-4" />
                    Reactivate
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {creators.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No creators yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
