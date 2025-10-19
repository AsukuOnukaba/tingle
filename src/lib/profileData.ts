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
    subscriptionPrice: "$24.99",
    photos: [profile1, profile2, profile3],
    tiers: [
      { name: "Basic", price: "$9.99", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "$24.99", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "$49.99", features: ["All content", "Video calls", "Personal attention"] },
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
    subscriptionPrice: "$19.99",
    photos: [profile2, profile1, profile3],
    tiers: [
      { name: "Basic", price: "$9.99", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "$19.99", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "$39.99", features: ["All content", "Video calls", "Personal attention"] },
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
    subscriptionPrice: "$29.99",
    photos: [profile3, profile2, profile1],
    tiers: [
      { name: "Basic", price: "$14.99", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "$29.99", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "$59.99", features: ["All content", "Video calls", "Personal attention"] },
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
    subscriptionPrice: "$22.99",
    photos: [profile4, profile1, profile2],
    tiers: [
      { name: "Basic", price: "$9.99", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "$22.99", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "$44.99", features: ["All content", "Video calls", "Personal attention"] },
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
    subscriptionPrice: "$34.99",
    photos: [profile5, profile2, profile3],
    tiers: [
      { name: "Basic", price: "$14.99", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "$34.99", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "$69.99", features: ["All content", "Video calls", "Personal attention"] },
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
    subscriptionPrice: "$18.99",
    photos: [profile6, profile1, profile2],
    tiers: [
      { name: "Basic", price: "$9.99", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "$18.99", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "$37.99", features: ["All content", "Video calls", "Personal attention"] },
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
    subscriptionPrice: "$27.99",
    photos: [profile7, profile2, profile3],
    tiers: [
      { name: "Basic", price: "$12.99", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "$27.99", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "$54.99", features: ["All content", "Video calls", "Personal attention"] },
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
    subscriptionPrice: "$21.99",
    photos: [profile8, profile1, profile2],
    tiers: [
      { name: "Basic", price: "$9.99", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "$21.99", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "$43.99", features: ["All content", "Video calls", "Personal attention"] },
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
    subscriptionPrice: "$32.99",
    photos: [profile9, profile2, profile3],
    tiers: [
      { name: "Basic", price: "$14.99", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "$32.99", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "$64.99", features: ["All content", "Video calls", "Personal attention"] },
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
    subscriptionPrice: "$20.99",
    photos: [profile10, profile1, profile2],
    tiers: [
      { name: "Basic", price: "$9.99", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "$20.99", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "$41.99", features: ["All content", "Video calls", "Personal attention"] },
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
    subscriptionPrice: "$26.99",
    photos: [profile11, profile2, profile3],
    tiers: [
      { name: "Basic", price: "$12.99", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "$26.99", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "$52.99", features: ["All content", "Video calls", "Personal attention"] },
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
    subscriptionPrice: "$23.99",
    photos: [profile12, profile1, profile2],
    tiers: [
      { name: "Basic", price: "$9.99", features: ["Weekly photos", "Basic chat access"] },
      { name: "Premium", price: "$23.99", features: ["Daily content", "Priority messages", "Custom requests"] },
      { name: "VIP", price: "$47.99", features: ["All content", "Video calls", "Personal attention"] },
    ]
  }
};

export const getProfile = (id: number): Profile => {
  return profiles[id] || profiles[1];
};
