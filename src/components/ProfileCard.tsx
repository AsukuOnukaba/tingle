import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, Lock, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWeb3 } from "@/hooks/useWeb3";
import { toast } from "@/hooks/use-toast";

interface ProfileCardProps {
  id: string;
  name: string;
  age: number;
  location: string;
  image: string;
  isLocked?: boolean;
  rating?: number;
  price?: string;
  isOnline?: boolean;
}

const ProfileCard = ({ 
  id, 
  name, 
  age, 
  location, 
  image, 
  isLocked = true, 
  rating = 4.8,
  price = "$19.99",
  isOnline = Math.random() > 0.5 
}: ProfileCardProps) => {
  const { user } = useAuth();
  const { isConnected, subscribe: web3Subscribe, unsubscribe: web3Unsubscribe } = useWeb3();
  const [isLiked, setIsLiked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Only fetch data when card is visible
  useEffect(() => {
    if (!user || !isVisible) return;

    const checkLikeAndSubscription = async () => {
      const [likeData, subData] = await Promise.all([
        supabase
          .from('likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('profile_id', id)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('id')
          .eq('subscriber_id', user.id)
          .eq('creator_id', id)
          .eq('is_active', true)
          .maybeSingle()
      ]);

      setIsLiked(!!likeData.data);
      setIsSubscribed(!!subData.data);
    };

    checkLikeAndSubscription();
  }, [user, id, isVisible]);

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to like profiles.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('profile_id', id);
        setIsLiked(false);
      } else {
        const { error } = await supabase
          .from('likes')
          .insert([{ user_id: user.id, profile_id: id }]);
        if (error) throw error;
        setIsLiked(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like status.",
        variant: "destructive",
      });
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to subscribe.",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your Web3 wallet to subscribe.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isSubscribed) {
        // Unsubscribe via smart contract
        await web3Unsubscribe(id);
        
        // Update Supabase record
        await supabase
          .from('subscriptions')
          .delete()
          .eq('subscriber_id', user.id)
          .eq('creator_id', id);
        
        setIsSubscribed(false);
        toast({
          title: "Unsubscribed",
          description: "You've unsubscribed from this creator.",
        });
      } else {
        // Subscribe via smart contract (payment handled on-chain)
        await web3Subscribe(id, price);

        // Record subscription in Supabase for off-chain tracking
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert([{ 
            subscriber_id: user.id, 
            creator_id: id,
            is_active: true
          }]);
        if (subError) throw subError;

        setIsSubscribed(true);
        toast({
          title: "Subscribed!",
          description: `You're now subscribed to ${name}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update subscription.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={cardRef} className="group relative glass-card rounded-2xl overflow-hidden hover:scale-105 transition-smooth hover:neon-glow">
      {/* Profile Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {!imageLoaded && <Skeleton className="absolute inset-0" />}
        <img
          src={image}
          alt={name}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-smooth ${
            isLocked ? "profile-blur group-hover:filter-none" : ""
          } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* Online Status */}
        {isOnline && (
          <div className="absolute top-3 left-3">
            <div className="flex items-center space-x-1 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>Online</span>
            </div>
          </div>
        )}

        {/* Status Icons - Top Right */}
        <div className="absolute top-3 right-3 flex flex-col space-y-2">
          {/* Rating */}
          <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm text-white border-none">
            <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
            {rating}
          </Badge>
          
          {/* Lock Icon */}
          {isLocked && (
            <div className="bg-black/50 backdrop-blur-sm p-2 rounded-full self-end">
              <Lock className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Like Button */}
        <button
          onClick={handleLike}
          className={`absolute bottom-3 right-3 p-2 rounded-full transition-smooth hover-scale ${
            isLiked
              ? "bg-primary text-white animate-pulse-neon"
              : "bg-black/50 backdrop-blur-sm text-white hover:bg-primary/80"
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
        </button>

        {/* Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold">{name}, {age}</h3>
            <div className="flex items-center text-sm text-gray-300">
              <MapPin className="w-3 h-3 mr-1" />
              {location}
            </div>
          </div>
          <div className="text-right">
            <div className="text-primary font-semibold">{price}</div>
            <div className="text-xs text-gray-400">per month</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-smooth"
          >
            <Link to={`/profile/${id}`}>View Profile</Link>
          </Button>
          <Button
            size="sm"
            onClick={handleSubscribe}
            disabled={loading}
            className={`flex-1 transition-smooth ${
              isSubscribed 
                ? "bg-green-500 hover:bg-green-600 text-white border-green-500" 
                : "gradient-primary hover:opacity-90 neon-glow"
            }`}
          >
            {loading ? "..." : (isSubscribed ? "✓ Subscribed" : "Subscribe")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;