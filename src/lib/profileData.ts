// Import all profile images
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

export interface Profile {
  id: number;
  name: string;
  age: number;
  location: string;
  image: string;
  bio: string;
  rating: number;
  subscribers: string;
  posts: number;
  joined: string;
  isOnline: boolean;
  subscriptionPrice: string;
  photos: string[];
  tiers: Array<{
    name: string;
    price: string;
    features: string[];
  }>;
}

export const profiles: Record<number, Profile> = {
  1: {
    id: 1,
    name: "Emmanuel",
    age: 25,
    location: "New York, NY",
    image: profile1,
    bio: "Professional model and content creator. I love connecting with my fans and sharing exclusive content. Join me for behind-the-scenes content, personal messages, and so much more! ✨",
    rating: 4.9,
    subscribers: "12.5K",
    posts: 156,
    joined: "January 2023",
    isOnline: true,
    subscriptionPrice: "₦10,000",
    photos: [profile1, profile2, profile3],
    tiers: [
      { name: "Basic", price: "Free", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "₦10,000", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "₦20,000", features: ["All content", "Video calls", "Personal attention"] },
    ]
  },
  2: {
    id: 2,
    name: "Jane",
    age: 28,
    location: "Los Angeles, CA",
    image: profile2,
    bio: "Fashion enthusiast and lifestyle creator. I share my journey through fashion, fitness, and everything in between. Let's connect and create amazing memories together! 💫",
    rating: 4.7,
    subscribers: "9.8K",
    posts: 132,
    joined: "March 2023",
    isOnline: false,
    subscriptionPrice: "₦8,000",
    photos: [profile2, profile1, profile3],
    tiers: [
      { name: "Basic", price: "Free", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "₦8,000", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "₦16,000", features: ["All content", "Video calls", "Personal attention"] },
    ]
  },
  3: {
    id: 3,
    name: "Sophia",
    age: 24,
    location: "Miami, FL",
    image: profile3,
    bio: "Beach lover and adventure seeker. Join me as I explore the world and share my experiences. Exclusive content for my subscribers! 🌊",
    rating: 4.8,
    subscribers: "15.2K",
    posts: 189,
    joined: "February 2023",
    isOnline: true,
    subscriptionPrice: "₦12,000",
    photos: [profile3, profile2, profile1],
    tiers: [
      { name: "Basic", price: "Free", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "₦12,000", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "₦24,000", features: ["All content", "Video calls", "Personal attention"] },
    ]
  },
  4: {
    id: 4,
    name: "Marcus",
    age: 26,
    location: "Chicago, IL",
    image: profile4,
    bio: "Fitness enthusiast and motivational creator. Let's get fit together and achieve our goals! 💪",
    rating: 4.6,
    subscribers: "8.5K",
    posts: 145,
    joined: "April 2023",
    isOnline: true,
    subscriptionPrice: "₦9,500",
    photos: [profile4, profile1, profile2],
    tiers: [
      { name: "Basic", price: "Free", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "₦9,500", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "₦18,000", features: ["All content", "Video calls", "Personal attention"] },
    ]
  },
  5: {
    id: 5,
    name: "Zara",
    age: 27,
    location: "Austin, TX",
    image: profile5,
    bio: "Artist and creative soul. I share my art journey and behind-the-scenes of my creative process. 🎨",
    rating: 4.9,
    subscribers: "18.3K",
    posts: 201,
    joined: "January 2023",
    isOnline: false,
    subscriptionPrice: "₦14,000",
    photos: [profile5, profile2, profile3],
    tiers: [
      { name: "Basic", price: "Free", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "₦14,000", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "₦28,500", features: ["All content", "Video calls", "Personal attention"] },
    ]
  },
  6: {
    id: 6,
    name: "Ryan",
    age: 29,
    location: "Seattle, WA",
    image: profile6,
    bio: "Tech enthusiast and gamer. Join me for gaming streams and tech reviews! 🎮",
    rating: 4.5,
    subscribers: "7.2K",
    posts: 98,
    joined: "May 2023",
    isOnline: true,
    subscriptionPrice: "₦7,500",
    photos: [profile6, profile1, profile2],
    tiers: [
      { name: "Basic", price: "Free", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "₦7,500", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "₦15,000", features: ["All content", "Video calls", "Personal attention"] },
    ]
  },
  7: {
    id: 7,
    name: "Lucky",
    age: 24,
    location: "Portland, OR",
    image: profile7,
    bio: "Photographer and visual storyteller. Capturing moments that matter. 📸",
    rating: 4.8,
    subscribers: "11.5K",
    posts: 167,
    joined: "February 2023",
    isOnline: true,
    subscriptionPrice: "₦11,500",
    photos: [profile7, profile2, profile3],
    tiers: [
      { name: "Basic", price: "Free", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "₦11,500", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "₦22,500", features: ["All content", "Video calls", "Personal attention"] },
    ]
  },
  8: {
    id: 8,
    name: "Alex",
    age: 26,
    location: "Denver, CO",
    image: profile8,
    bio: "Outdoor enthusiast and nature lover. Join me on my adventures! 🏔️",
    rating: 4.7,
    subscribers: "10.1K",
    posts: 143,
    joined: "March 2023",
    isOnline: false,
    subscriptionPrice: "₦9,000",
    photos: [profile8, profile1, profile2],
    tiers: [
      { name: "Basic", price: "Free", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "₦9,000", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "₦18,000", features: ["All content", "Video calls", "Personal attention"] },
    ]
  },
  9: {
    id: 9,
    name: "Maya",
    age: 23,
    location: "San Francisco, CA",
    image: profile9,
    bio: "Yoga instructor and wellness advocate. Let's find balance together. 🧘‍♀️",
    rating: 4.9,
    subscribers: "16.7K",
    posts: 178,
    joined: "January 2023",
    isOnline: true,
    subscriptionPrice: "₦13,500",
    photos: [profile9, profile2, profile3],
    tiers: [
      { name: "Basic", price: "Free", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "₦13,500", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "₦26,500", features: ["All content", "Video calls", "Personal attention"] },
    ]
  },
  10: {
    id: 10,
    name: "Tyler",
    age: 28,
    location: "Atlanta, GA",
    image: profile10,
    bio: "Musician and music producer. Let's create magic together! 🎵",
    rating: 4.6,
    subscribers: "9.3K",
    posts: 127,
    joined: "April 2023",
    isOnline: true,
    subscriptionPrice: "₦8,500",
    photos: [profile10, profile1, profile2],
    tiers: [
      { name: "Basic", price: "Free", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "₦8,500", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "₦17,000", features: ["All content", "Video calls", "Personal attention"] },
    ]
  },
  11: {
    id: 11,
    name: "Ruby",
    age: 25,
    location: "Nashville, TN",
    image: profile11,
    bio: "Singer-songwriter sharing my musical journey. Join me for exclusive performances! 🎤",
    rating: 4.8,
    subscribers: "13.4K",
    posts: 154,
    joined: "February 2023",
    isOnline: false,
    subscriptionPrice: "₦11,000",
    photos: [profile11, profile2, profile3],
    tiers: [
      { name: "Basic", price: "Free", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "₦11,000", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "₦21,500", features: ["All content", "Video calls", "Personal attention"] },
    ]
  },
  12: {
    id: 12,
    name: "Devon",
    age: 27,
    location: "Boston, MA",
    image: profile12,
    bio: "Food blogger and culinary enthusiast. Let's explore flavors together! 🍽️",
    rating: 4.7,
    subscribers: "10.8K",
    posts: 139,
    joined: "March 2023",
    isOnline: true,
    subscriptionPrice: "₦10,000",
    photos: [profile12, profile1, profile2],
    tiers: [
      { name: "Basic", price: "Free", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "₦10,000", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "₦19,500", features: ["All content", "Video calls", "Personal attention"] },
    ]
  }
};

export const getProfile = (id: number): Profile => {
  return profiles[id] || profiles[1];
};
