import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, X, Trash2 } from 'lucide-react';

export default function AdminMedia() {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedia();

    const channel = supabase
      .channel('admin-media')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media' },
        () => fetchMedia()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMedia = async () => {
    const { data, error } = await supabase
      .from('media')
      .select(`
        *,
        creators (
          display_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load media');
      return;
    }

    setMedia(data || []);
    setLoading(false);
  };

  const updateMediaStatus = async (mediaId: string, status: string) => {
    const { error } = await supabase
      .from('media')
      .update({ status })
      .eq('id', mediaId);

    if (error) {
      toast.error('Failed to update media status');
      return;
    }

    toast.success(`Media ${status}`);
  };

  const deleteMedia = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

    const { error } = await supabase
      .from('media')
      .delete()
      .eq('id', mediaId);

    if (error) {
      toast.error('Failed to delete media');
      return;
    }

    toast.success('Media deleted');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {media.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>
                  by {item.creators?.display_name || 'Unknown'}
                </CardDescription>
              </div>
              <Badge
                variant={
                  item.status === 'approved' ? 'default' :
                  item.status === 'rejected' ? 'destructive' :
                  'secondary'
                }
              >
                {item.status}
              </Badge>
            </div>
          </CardHeader>

          {item.thumbnail_url && (
            <img
              src={item.thumbnail_url}
              alt={item.title}
              className="w-full h-48 object-cover"
            />
          )}

          <CardContent className="pt-4 space-y-4">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </p>

            <div className="flex justify-between items-center">
              <span className="text-xl font-bold">${item.price}</span>
            </div>

            <div className="flex gap-2">
              {item.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => updateMediaStatus(item.id, 'approved')}
                    className="flex-1 flex items-center gap-1"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateMediaStatus(item.id, 'rejected')}
                    className="flex-1 flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteMedia(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {media.length === 0 && (
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No media yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
