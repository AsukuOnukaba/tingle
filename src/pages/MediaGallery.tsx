import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Lock, Check } from 'lucide-react';

export default function MediaGallery() {
  const { user } = useAuth();
  const [media, setMedia] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedia();
    if (user) {
      fetchPurchases();
    }
  }, [user]);

  const fetchMedia = async () => {
    const { data, error } = await supabase
      .from('media')
      .select(`
        *,
        creators (
          display_name
        )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load media');
      return;
    }

    setMedia(data || []);
    setLoading(false);
  };

  const fetchPurchases = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('media_purchases')
      .select('media_id')
      .eq('buyer_id', user.id);

    if (error) {
      console.error('Failed to load purchases:', error);
      return;
    }

    setPurchases(new Set(data.map(p => p.media_id)));
  };

  const handlePurchase = async (mediaId: string, price: number) => {
    if (!user) {
      toast.error('Please login to purchase content');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('media-purchase', {
        body: { mediaId }
      });

      if (error) throw error;

      toast.success('Content purchased!');
      setPurchases(prev => new Set([...prev, mediaId]));
      
      // Open the signed URL
      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      toast.error(error.message || 'Purchase failed');
    }
  };

  const handleViewPurchased = async (mediaId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('media-purchase', {
        body: { mediaId, viewOnly: true }
      });

      if (error) throw error;

      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to access content');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Premium Content Gallery</h1>
          <p className="text-muted-foreground">Discover exclusive content from our creators</p>
        </div>

        {media.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No content available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {media.map((item) => {
              const isPurchased = purchases.has(item.id);
              
              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle>{item.title}</CardTitle>
                        <CardDescription>
                          by {item.creators?.display_name || 'Unknown'}
                        </CardDescription>
                      </div>
                      {isPurchased && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Purchased
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  {item.thumbnail_url && (
                    <div className="relative">
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-64 object-cover"
                      />
                      {!isPurchased && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Lock className="h-12 w-12 text-white" />
                        </div>
                      )}
                    </div>
                  )}

                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {item.description}
                    </p>
                  </CardContent>

                  <CardFooter className="flex justify-between items-center">
                    <span className="text-2xl font-bold">${item.price}</span>
                    {isPurchased ? (
                      <Button onClick={() => handleViewPurchased(item.id)}>
                        View Content
                      </Button>
                    ) : (
                      <Button onClick={() => handlePurchase(item.id, item.price)}>
                        Purchase
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
