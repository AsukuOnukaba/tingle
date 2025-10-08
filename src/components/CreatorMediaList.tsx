import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface CreatorMediaListProps {
  creatorId: string;
}

export default function CreatorMediaList({ creatorId }: CreatorMediaListProps) {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedia();

    const channel = supabase
      .channel('media-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media',
          filter: `creator_id=eq.${creatorId}`
        },
        () => {
          fetchMedia();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [creatorId]);

  const fetchMedia = async () => {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load media');
      return;
    }

    setMedia(data || []);
    setLoading(false);
  };

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    const { error } = await supabase
      .from('media')
      .delete()
      .eq('id', mediaId);

    if (error) {
      toast.error('Failed to delete media');
      return;
    }

    toast.success('Content deleted');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (media.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No content uploaded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {media.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription className="line-clamp-2">{item.description}</CardDescription>
              </div>
              <Badge variant={
                item.status === 'approved' ? 'default' :
                item.status === 'rejected' ? 'destructive' :
                'secondary'
              }>
                {item.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {item.thumbnail_url && (
              <img
                src={item.thumbnail_url}
                alt={item.title}
                className="w-full h-48 object-cover rounded-md mb-4"
              />
            )}
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">${item.price}</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
