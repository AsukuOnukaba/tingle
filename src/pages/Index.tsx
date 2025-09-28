// Tingle Welcome/Landing Page - Redirects to Login for new users

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate checking if user is logged in
    const isLoggedIn = localStorage.getItem("tingle_user");
    
    if (isLoggedIn) {
      // If logged in, go to explore
      navigate("/");
    } else {
      // If not logged in, redirect to login after a brief moment
      const timer = setTimeout(() => {
        navigate("/login");
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 animate-gradient-shift" 
             style={{ backgroundSize: "200% 200%" }} />
      </div>

      {/* Loading Screen */}
      <div className="relative z-10 text-center animate-fade-up">
        <div className="w-24 h-24 rounded-full gradient-primary mx-auto mb-8 flex items-center justify-center animate-pulse-neon">
          <Heart className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Tingle
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Where connections spark into something more...
        </p>
        <div className="flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
