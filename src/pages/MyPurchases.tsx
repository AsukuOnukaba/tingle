import { useEffect, useState } from "react";
import { ArrowLeft, Download, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const sb = supabase as unknown as SupabaseClient<any>;

interface Purchase {
  id: string;
  amount: number;
  created_at: string;
  premium_content: {
    id: string;
    title: string;
    description: string;
    type: string;
    url: string;
    thumbnail_url: string;
  };
}

const MyPurchases = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPurchases();
    }
  }, [user]);

  const fetchPurchases = async () => {
    try {
    const { data, error } = await sb
      .from("media_purchases")
      .select(`
        id,
        price_paid,
        created_at,
        media_id,
        media (
          id,
          title,
          description,
          file_url,
          thumbnail_url
        )
      `)
      .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized: Purchase[] = (data || []).map((p: any) => ({
        id: p.id,
        amount: Number(p.price_paid),
        created_at: p.created_at,
        premium_content: {
          id: p.media?.id || p.media_id,
          title: p.media?.title || 'Unknown',
          description: p.media?.description || '',
          type: 'media',
          url: p.media?.file_url || '',
          thumbnail_url: p.media?.thumbnail_url || ''
        },
      }));

      setPurchases(normalized);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      toast({
        title: "Error",
        description: "Failed to load your purchases.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string, title: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = title;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading your purchases...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 animate-fade-up">
            <div>
              <Button
                asChild
                variant="ghost"
                className="hover:bg-muted/50 transition-smooth mb-4"
              >
                <Link to="/explore">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Explore
                </Link>
              </Button>
              <h1 className="text-4xl font-bold">My Purchases</h1>
              <p className="text-muted-foreground mt-2">
                View and access all your premium content
              </p>
            </div>
          </div>

          {/* Purchases Grid */}
          {purchases.length === 0 ? (
            <div className="text-center py-12 animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Purchases Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start exploring premium content and make your first purchase.
              </p>
              <Button asChild className="gradient-primary">
                <Link to="/explore">Explore Content</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchases.map((purchase, index) => (
                <Card
                  key={purchase.id}
                  className="glass-card overflow-hidden hover-scale animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative aspect-video bg-gradient-to-r from-primary/20 to-secondary/20">
                    <img
                      src={purchase.premium_content.thumbnail_url || purchase.premium_content.url}
                      alt={purchase.premium_content.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <div className="px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm flex items-center space-x-1">
                        {purchase.premium_content.type === "video" ? (
                          <Video className="w-3 h-3 text-white" />
                        ) : (
                          <ImageIcon className="w-3 h-3 text-white" />
                        )}
                        <span className="text-xs text-white capitalize">
                          {purchase.premium_content.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">
                      {purchase.premium_content.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {purchase.premium_content.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>Purchased for ${purchase.amount.toFixed(2)}</span>
                      <span>{new Date(purchase.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        asChild
                        className="flex-1 gradient-primary"
                      >
                        <Link to={`/premium-gallery/${purchase.premium_content.id}`}>
                          View
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          handleDownload(
                            purchase.premium_content.url,
                            purchase.premium_content.title
                          )
                        }
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPurchases;
