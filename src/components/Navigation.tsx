import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart, User, MessageCircle, Settings, Sparkles, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { WalletDisplay } from "./WalletDisplay";

const Navigation = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { path: "/explore", icon: Heart, label: "Explore" },
    { path: "/profile/1", icon: User, label: "Profile" },
    { path: "/chat", icon: MessageCircle, label: "Chat" },
    { path: "/creator", icon: Sparkles, label: "Creator" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/home" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center animate-pulse-neon">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Tingle
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-smooth hover-scale ${
                    isActive
                      ? "gradient-primary text-white neon-glow"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Wallet & Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user && <WalletDisplay />}
            {user ? (
              <Button 
                variant="ghost" 
                className="text-foreground hover:text-primary"
                onClick={signOut}
              >
                <LogOut className="w-5 h-5" />
                <span className="ml-1">Logout</span>
              </Button>
            ) : (
              <Button asChild variant="ghost" className="text-foreground hover:text-primary">
                <Link to="/login" className="flex items-center space-x-1">
                  <LogIn className="w-5 h-5" />
                  <span>Login</span>
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-primary transition-smooth"
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <div className={`h-0.5 w-6 bg-current transition-all ${isOpen ? "rotate-45 translate-y-1.5" : ""}`} />
              <div className={`h-0.5 w-6 bg-current transition-all ${isOpen ? "opacity-0" : ""}`} />
              <div className={`h-0.5 w-6 bg-current transition-all ${isOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </div>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 animate-fade-up">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-smooth ${
                      isActive
                        ? "gradient-primary text-white"
                        : "text-muted-foreground hover:text-primary hover:bg-muted/20"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;