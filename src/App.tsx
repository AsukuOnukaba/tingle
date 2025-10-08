import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { Web3Provider } from '@/hooks/useWeb3';
import { web3Config } from '@/config/web3Config';
import '@rainbow-me/rainbowkit/styles.css';
import Index from "./pages/Index";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Explore from "./pages/Explore";
import Profile from "./pages/Profile";
import MyProfile from "./pages/MyProfile";
import Wallet from "./pages/Wallet";
import Chat from "./pages/Chat";
import Creator from "./pages/Creator";
import CreatorPending from "./pages/CreatorPending";
import CreatorApplication from "./pages/CreatorApplication";
import CreatorDashboard from "./pages/CreatorDashboard";
import MediaGallery from "./pages/MediaGallery";
import AdminDashboard from "./pages/AdminDashboard";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Help from "./pages/Help";
import PremiumGallery from "./pages/PremiumGallery";
import PremiumChat from "./pages/PremiumChat";
import NotFound from "./pages/NotFound";
import { wagmiClient } from "src/integrations/wagmiClient";

const queryClient = new QueryClient();

const App = () => (
 
    <WagmiProvider config={web3Config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Web3Provider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AuthProvider>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/profile/:id" element={<Profile />} />
                    <Route path="/my-profile" element={<MyProfile />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/creator" element={<Creator />} />
                    <Route path="/creator/pending" element={<CreatorPending />} />
                    <Route path="/creator-application" element={<CreatorApplication />} />
                    <Route path="/creator-dashboard" element={<CreatorDashboard />} />
                    <Route path="/media-gallery" element={<MediaGallery />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/help" element={<Help />} />
                    <Route path="/premium/:id/gallery" element={<PremiumGallery />} />
                    <Route path="/premium/:id/chat" element={<PremiumChat />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AuthProvider>
              </BrowserRouter>
            </TooltipProvider>
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
 
);

export default App;
