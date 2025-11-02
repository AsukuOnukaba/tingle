import { useState } from "react";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProfileCard from "@/components/ProfileCard";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useInView } from 'react-intersection-observer';

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
  // Premium/Creator Profiles (with prices in Naira)
  {
    id: 1,
    name: "Emmanuel",
    age: 25,
    location: "Lagos, Nigeria",
    image: profile1,
    isLocked: true,
    rating: 4.9,
    price: "₦39,999",
    isOnline: true,
    isCreator: true,
  },
  {
    id: 2,
    name: "Jane",
    age: 28,
    location: "Abuja, Nigeria",
    image: profile2,
    isLocked: true,
    rating: 4.7,
    price: "₦31,999",
    isOnline: false,
    isCreator: true,
  },
  {
    id: 3,
    name: "Sophia",
    age: 24,
    location: "Port Harcourt, Nigeria",
    image: profile3,
    isLocked: true,
    rating: 4.8,
    price: "₦47,999",
    isOnline: true,
    isCreator: true,
  },
  {
    id: 4,
    name: "Marcus",
    age: 26,
    location: "Ibadan, Nigeria",
    image: profile4,
    isLocked: true,
    rating: 4.6,
    price: "₦36,799",
    isOnline: true,
    isCreator: true,
  },
  {
    id: 5,
    name: "Zara",
    age: 27,
    location: "Kano, Nigeria",
    image: profile5,
    isLocked: true,
    rating: 4.9,
    price: "₦55,999",
    isOnline: false,
    isCreator: true,
  },
  {
    id: 6,
    name: "Ryan",
    age: 29,
    location: "Benin City, Nigeria",
    image: profile6,
    isLocked: true,
    rating: 4.5,
    price: "₦30,399",
    isOnline: true,
    isCreator: true,
  },
  {
    id: 7,
    name: "Lucky",
    age: 24,
    location: "Enugu, Nigeria",
    image: profile7,
    isLocked: true,
    rating: 4.8,
    price: "₦44,799",
    isOnline: true,
    isCreator: true,
  },
  {
    id: 8,
    name: "Alex",
    age: 26,
    location: "Calabar, Nigeria",
    image: profile8,
    isLocked: true,
    rating: 4.7,
    price: "₦35,199",
    isOnline: false,
    isCreator: true,
  },
  {
    id: 9,
    name: "Maya",
    age: 23,
    location: "Jos, Nigeria",
    image: profile9,
    isLocked: true,
    rating: 4.9,
    price: "₦52,799",
    isOnline: true,
    isCreator: true,
  },
  {
    id: 10,
    name: "Tyler",
    age: 28,
    location: "Owerri, Nigeria",
    image: profile10,
    isLocked: true,
    rating: 4.6,
    price: "₦33,599",
    isOnline: true,
    isCreator: true,
  },
  {
    id: 11,
    name: "Ruby",
    age: 25,
    location: "Warri, Nigeria",
    image: profile11,
    isLocked: true,
    rating: 4.8,
    price: "₦43,199",
    isOnline: false,
    isCreator: true,
  },
  {
    id: 12,
    name: "Devon",
    age: 27,
    location: "Kaduna, Nigeria",
    image: profile12,
    isLocked: true,
    rating: 4.7,
    price: "₦38,399",
    isOnline: true,
    isCreator: true,
  },
  // Free/Non-Creator Profiles (no price)
  {
    id: 13,
    name: "Chioma",
    age: 22,
    location: "Lagos, Nigeria",
    image: profile1,
    isLocked: false,
    rating: 4.5,
    isOnline: true,
    isCreator: false,
  },
  {
    id: 14,
    name: "Tunde",
    age: 26,
    location: "Abuja, Nigeria",
    image: profile4,
    isLocked: false,
    rating: 4.6,
    isOnline: false,
    isCreator: false,
  },
  {
    id: 15,
    name: "Amara",
    age: 24,
    location: "Port Harcourt, Nigeria",
    image: profile3,
    isLocked: false,
    rating: 4.4,
    isOnline: true,
    isCreator: false,
  },
  {
    id: 16,
    name: "Segun",
    age: 28,
    location: "Ibadan, Nigeria",
    image: profile6,
    isLocked: false,
    rating: 4.7,
    isOnline: true,
    isCreator: false,
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

  const filters = ["All", "Online", "New", "Premium", "Free"];

  const filteredProfiles = fakeProfiles.filter(profile => {
    const matchesSearch = profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = selectedFilter === "All" ||
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProfiles.map((profile) => (
              <ProfileItem key={profile.id} profile={profile} />
            ))}
          </div>

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