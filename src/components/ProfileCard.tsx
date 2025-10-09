import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Lock, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProfileCardProps {
  id: number;
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
  const [isLiked, setIsLiked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  return (
    <div className="group relative glass-card rounded-2xl overflow-hidden hover:scale-105 transition-smooth hover:neon-glow">
      {/* Profile Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={image}
          alt={name}
          className={`w-full h-full object-cover transition-smooth ${
            isLocked ? "profile-blur group-hover:filter-none" : ""
          }`}
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
          onClick={() => setIsLiked(!isLiked)}
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
            onClick={() => setIsSubscribed(!isSubscribed)}
            className={`flex-1 transition-smooth ${
              isSubscribed 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "gradient-primary hover:opacity-90 neon-glow"
            }`}
          >
            {isSubscribed ? "Subscribed" : "Subscribe"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;