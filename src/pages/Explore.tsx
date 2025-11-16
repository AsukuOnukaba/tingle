import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProfileCard from "@/components/ProfileCard";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useInView } from 'react-intersection-observer';
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";

// Default placeholder image
import defaultProfile from "@/assets/profiles/profile-1.jpg";

interface ProfileData {
  id: string;
  display_name: string;
  age: number;
  location: string | null;
  profile_image: string | null;
  price: number | null;
  rating: number | null;
  is_online: boolean | null;
  created_at: string | null;
}

interface CreatorData {
  user_id: string;
  status: string;
}

const ProfileItem = ({ profile }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <div ref={ref} className="animate-smooth-fade">
      {inView ? (
        <ProfileCard {...profile} />
      ) : (
        <div className="bg-muted rounded-xl animate-pulse h-64 w-full" />
      )}
    </div>
  );
};

const Explore = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const filters = ["All", "Online", "Premium", "Free"];

  // Fetch real profiles from database
  const { data: profiles, isLoading: isLoadingProfiles } = useOptimizedQuery<ProfileData[]>(
    ["profiles"],
    async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, age, location, profile_image, price, rating, is_online, created_at")
        .order("rating", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ProfileData[];
    }
  );

  // Fetch creators with their lowest plan price
  const { data: creators, isLoading: isLoadingCreators } = useOptimizedQuery<any[]>(
    ["creators"],
    async () => {
      const { data, error } = await (supabase as any)
        .from("creators")
        .select(`
          user_id, 
          status,
          id
        `)
        .eq("status", "approved");
      if (error) throw error;
      return (data || []);
    }
  );

  // Fetch all subscription plans for creators
  const { data: subscriptionPlans } = useOptimizedQuery<any[]>(
    ["subscription_plans"],
    async () => {
      const { data, error } = await (supabase as any)
        .from("subscription_plans")
        .select("creator_id, name, price")
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return (data || []);
    }
  );

  const isLoading = isLoadingProfiles || isLoadingCreators;

  // Create a map of creator IDs to their user_id
  const creatorMap = new Map(
    (creators || []).map(c => [c.user_id, c])
  );

  // Create a map of lowest plan prices per creator
  const lowestPlanMap = new Map<string, any>();
  (subscriptionPlans || []).forEach(plan => {
    const existing = lowestPlanMap.get(plan.creator_id);
    if (!existing || plan.price < existing.price) {
      lowestPlanMap.set(plan.creator_id, plan);
    }
  });

  // Transform and filter profiles
  const filteredProfiles = (profiles || [])
    .map((profile) => {
      const creator = creatorMap.get(profile.id);
      const isCreator = creator?.status === 'approved';
      
      // Get lowest plan for this creator
      const lowestPlan = isCreator ? lowestPlanMap.get(creator.id) : null;
      
      return {
        id: profile.id,
        name: profile.display_name || "Unknown",
        age: profile.age || 18,
        location: profile.location || "Location not set",
        image: profile.profile_image || defaultProfile,
        isLocked: isCreator,
        rating: Number(profile.rating) || 4.8,
        price: lowestPlan ? `${lowestPlan.name} – ₦${Number(lowestPlan.price).toLocaleString()}/month` : undefined,
        isOnline: profile.is_online || false,
        isCreator: isCreator,
      };
    })
    .filter((profile) => {
      const matchesSearch = 
        profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.location?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = 
        selectedFilter === "All" ||
        (selectedFilter === "Online" && profile.isOnline) ||
        (selectedFilter === "Premium" && profile.isCreator) ||
        (selectedFilter === "Free" && !profile.isCreator);

      return matchesSearch && matchesFilter;
    });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 animate-smooth-fade">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Discover Amazing People
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect with creators, build relationships, and unlock exclusive content from people you love.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 animate-smooth-fade">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-muted/50 border-border/50 focus:border-primary transition-all duration-200"
                />
              </div>

              {/* Filter Button */}
              <Button
                variant="outline"
                className="bg-muted/50 border-border/50 hover:bg-muted transition-all duration-200"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Filter Tags */}
            <div className="flex flex-wrap gap-2 justify-center">
              {filters.map((filter) => (
                <Badge
                  key={filter}
                  variant={selectedFilter === filter ? "default" : "secondary"}
                  className={`cursor-pointer transition-all duration-200 ${selectedFilter === filter
                    ? "bg-gradient-to-r from-primary to-secondary text-white"
                    : "bg-muted/50 text-muted-foreground hover:text-primary"
                    }`}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedFilter(filter);
                  }}
                >
                  {filter}
                </Badge>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 animate-smooth-fade">
            <div className="p-6 rounded-2xl text-center bg-muted/30 shadow-sm">
              <div className="text-3xl font-bold text-primary mb-2">120K+</div>
              <div className="text-sm text-muted-foreground">Active Creators</div>
            </div>
            <div className="p-6 rounded-2xl text-center bg-muted/30 shadow-sm">
              <div className="text-3xl font-bold text-secondary mb-2">2.5M+</div>
              <div className="text-sm text-muted-foreground">Connections Made</div>
            </div>
            <div className="p-6 rounded-2xl text-center bg-muted/30 shadow-sm">
              <div className="text-3xl font-bold text-accent mb-2">500K+</div>
              <div className="text-sm text-muted-foreground">Messages Sent</div>
            </div>
            <div className="p-6 rounded-2xl text-center bg-muted/30 shadow-sm">
              <div className="text-3xl font-bold text-primary mb-2">98%</div>
              <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
            </div>
          </div>

          {/* Profile Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-muted rounded-xl animate-pulse h-96 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProfiles.map((profile) => (
                <ProfileItem key={profile.id} profile={profile} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredProfiles.length === 0 && (
            <div className="text-center py-20 animate-smooth-fade">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary to-secondary mx-auto mb-6 flex items-center justify-center opacity-60">
                <Search className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">No profiles found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search or filters to find more people.
              </p>
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedFilter("All");
                }}
                className="bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition-all duration-200"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Explore;