import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, User, MessageCircle, Settings, Sparkles, LogOut, ShoppingBag, LayoutDashboard, Shield, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isCreator } = useRoles();
  const { currentProfileId } = useCurrentProfile();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const chatPath = currentProfileId ? `/chat/${currentProfileId}` : "/chat";

  const navItems = [
    { path: "/explore", icon: Heart, label: "Explore" },
    { path: "/my-purchases", icon: ShoppingBag, label: "My Purchases" },
    { path: "/wallet", icon: Wallet, label: "Wallet" },
    { path: "/my-profile", icon: User, label: "Profile" },
    { path: chatPath, icon: MessageCircle, label: "Chat" },
    // Hide Creator application page for approved creators
    ...(!isCreator ? [{ path: "/creator", icon: Sparkles, label: "Creator" }] : []),
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
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1.5 lg:space-x-2 px-2 lg:px-3 py-2 rounded-lg transition-smooth hover-scale ${isActive
                      ? "gradient-primary text-white neon-glow"
                      : "text-muted-foreground hover:text-primary"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs lg:text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}

            {/* Conditional Dashboard Links */}
            {(isCreator || isAdmin) && (
              <Link
                to="/creator-dashboard"
                className={`flex items-center space-x-1.5 lg:space-x-2 px-2 lg:px-3 py-2 rounded-lg transition-smooth hover-scale ${location.pathname === "/creator-dashboard"
                    ? "gradient-primary text-white neon-glow"
                    : "text-muted-foreground hover:text-primary"
                  }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-xs lg:text-sm font-medium">Dashboard</span>
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center space-x-1.5 lg:space-x-2 px-2 lg:px-3 py-2 rounded-lg transition-smooth hover-scale ${location.pathname === "/admin"
                    ? "gradient-primary text-white neon-glow"
                    : "text-muted-foreground hover:text-primary"
                  }`}
              >
                <Shield className="w-4 h-4" />
                <span className="text-xs lg:text-sm font-medium">Admin</span>
              </Link>
            )}

            {user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            ) : (
              <Button
                asChild
                className="gradient-primary hover:opacity-90 transition-smooth neon-glow"
              >
                <Link to="/login">
                  <User className="w-4 h-4 mr-2" />
                  Login
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
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-smooth ${isActive
                        ? "gradient-primary text-white"
                        : "text-muted-foreground hover:text-primary hover:bg-muted/20"
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}

              {/* Conditional Dashboard Links for Mobile */}
              {(isCreator || isAdmin) && (
                <Link
                  to="/creator-dashboard"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-smooth ${location.pathname === "/creator-dashboard"
                      ? "gradient-primary text-white"
                      : "text-muted-foreground hover:text-primary hover:bg-muted/20"
                    }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="font-medium">Dashboard</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-smooth ${location.pathname === "/admin"
                      ? "gradient-primary text-white"
                      : "text-muted-foreground hover:text-primary hover:bg-muted/20"
                    }`}
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Admin</span>
                </Link>
              )}
              {user ? (
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="flex items-center space-x-3 w-full justify-start"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </Button>
              ) : (
                <Button
                  asChild
                  className="gradient-primary hover:opacity-90 transition-smooth neon-glow w-full justify-start"
                >
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    <User className="w-5 h-5 mr-2" />
                    <span className="font-medium">Login</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;