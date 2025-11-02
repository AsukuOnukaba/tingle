import { useState, useEffect } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProfileCard from "@/components/ProfileCard";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useInView } from 'react-intersection-observer';
import { supabase } from "@/integrations/supabase/client";

// Import profile images
import profile1 from "@/assets/profiles/profile-1.jpg";
import profile2 from "@/assets/profiles/profile-2.jpg";
import profile3 from "@/assets/profiles/profile-3.jpg";
import profile4 from "@/assets/profiles/profile-4.jpg";
import profile5 from "@/assets/profiles/profile-5.jpg";
import profile6 from "@/assets/profiles/profile-6.jpg";
import profile7 from "@/assets/profiles/profile-7.jpg";
import profile8 from "@/assets/profiles/profile-8.jpg";
import profile9 from "@/assets/profiles/profile-9.jpg";
import profile10 from "@/assets/profiles/profile-10.jpg";
import profile11 from "@/assets/profiles/profile-11.jpg";
import profile12 from "@/assets/profiles/profile-12.jpg";

const fakeProfiles = [
  {
    id: 1,
    name: "Emmanuel",
    age: 25,
    location: "New York, NY",
    image: profile1,
    isLocked: true,
    rating: 4.9,
    price: "$24.99",
    isOnline: true,
  },
  {
    id: 2,
    name: "Jane",
    age: 28,
    location: "Los Angeles, CA",
    image: profile2,
    isLocked: true,
    rating: 4.7,
    price: "$19.99",
    isOnline: false,
  },
  {
    id: 3,
    name: "Sophia",
    age: 24,
    location: "Miami, FL",
    image: profile3,
    isLocked: true,
    rating: 4.8,
    price: "$29.99",
    isOnline: true,
  },
  {
    id: 4,
    name: "Marcus",
    age: 26,
    location: "Chicago, IL",
    image: profile4,
    isLocked: true,
    rating: 4.6,
    price: "$22.99",
    isOnline: true,
  },
  {
    id: 5,
    name: "Zara",
    age: 27,
    location: "Austin, TX",
    image: profile5,
    isLocked: true,
    rating: 4.9,
    price: "$34.99",
    isOnline: false,
  },
  {
    id: 6,
    name: "Ryan",
    age: 29,
    location: "Seattle, WA",
    image: profile6,
    isLocked: true,
    rating: 4.5,
    price: "$18.99",
    isOnline: true,
  },
  {
    id: 7,
    name: "Lucky",
    age: 24,
    location: "Portland, OR",
    image: profile7,
    isLocked: true,
    rating: 4.8,
    price: "$27.99",
    isOnline: true,
  },
  {
    id: 8,
    name: "Alex",
    age: 26,
    location: "Denver, CO",
    image: profile8,
    isLocked: true,
    rating: 4.7,
    price: "$21.99",
    isOnline: false,
  },
  {
    id: 9,
    name: "Maya",
    age: 23,
    location: "San Francisco, CA",
    image: profile9,
    isLocked: true,
    rating: 4.9,
    price: "$32.99",
    isOnline: true,
  },
  {
    id: 10,
    name: "Tyler",
    age: 28,
    location: "Atlanta, GA",
    image: profile10,
    isLocked: true,
    rating: 4.6,
    price: "$20.99",
    isOnline: true,
  },
  {
    id: 11,
    name: "Ruby",
    age: 25,
    location: "Nashville, TN",
    image: profile11,
    isLocked: true,
    rating: 4.8,
    price: "$26.99",
    isOnline: false,
  },
  {
    id: 12,
    name: "Devon",
    age: 27,
    location: "Boston, MA",
    image: profile12,
    isLocked: true,
    rating: 4.7,
    price: "$23.99",
    isOnline: true,
  },
];

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
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const filters = ["All", "Online", "Premium", "Free"];

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await (supabase as any)
        .from('profiles')
        .select('*')
        .order('rating', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch creator info separately
      const { data: creatorsData } = await (supabase as any)
        .from('creators')
        .select('user_id, status')
        .eq('status', 'approved');

      const creatorIds = new Set(creatorsData?.map((c: any) => c.user_id) || []);

      // Transform to match the expected format
      const transformedProfiles = profilesData?.map((p: any) => ({
        id: p.id,
        name: p.display_name,
        age: p.age,
        location: p.location || "Nigeria",
        image: p.profile_image || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + p.id,
        isLocked: creatorIds.has(p.id),
        rating: p.rating || 0,
        price: "₦" + (p.price || 0).toLocaleString(),
        isOnline: p.is_online || false,
        coverImage: p.cover_image,
      })) || [];

      setProfiles(transformedProfiles);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = selectedFilter === "All" ||
      (selectedFilter === "Online" && profile.isOnline) ||
      (selectedFilter === "Premium" && profile.isLocked) ||
      (selectedFilter === "Free" && !profile.isLocked);

    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    // Sort by rating (highest first) and premium status
    if (selectedFilter === "All") {
      if (a.isLocked !== b.isLocked) return a.isLocked ? -1 : 1;
      return b.rating - a.rating;
    }
    return b.rating - a.rating;
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
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-muted rounded-xl animate-pulse h-64 w-full" />
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
          {filteredProfiles.length === 0 && (
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