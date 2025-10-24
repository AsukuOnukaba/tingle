import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import Index from "./pages/Index";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Explore from "./pages/Explore";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import ChatList from "./pages/ChatList";
import Creator from "./pages/Creator";
import CreatorPending from "./pages/CreatorPending";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Help from "./pages/Help";
import PremiumGallery from "./pages/PremiumGallery";
import PremiumChat from "./pages/PremiumChat";
import MyPurchases from "./pages/MyPurchases";
import CreatorDashboard from "./pages/CreatorDashboard";
import AdminPanel from "./pages/AdminPanel";
import Wallet from "./pages/Wallet";
import NotFound from "./pages/NotFound";

import SubscriptionPlans from "./pages/SubscriptionPlans";
import ManagePlans from "./pages/ManagePlans";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Analytics />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/chat" element={<ChatList />} />
          <Route path="/chat/:recipientId" element={<Chat />} />
          <Route path="/creator" element={<Creator />} />
          <Route path="/creator/pending" element={<CreatorPending />} />
          <Route path="/subscription/:creatorId" element={<SubscriptionPlans />} />
          <Route path="/manage-plans" element={<ManagePlans />} />
          <Route path="/about" element={<About />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/help" element={<Help />} />
          <Route path="/premium/:id/gallery" element={<PremiumGallery />} />
          <Route path="/premium/:id/chat" element={<PremiumChat />} />
          <Route path="/my-purchases" element={<MyPurchases />} />
          <Route path="/creator-dashboard" element={<CreatorDashboard />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
