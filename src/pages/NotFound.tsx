import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center animate-fade-up">
        <div className="w-24 h-24 rounded-full gradient-primary mx-auto mb-8 flex items-center justify-center opacity-50">
          <span className="text-4xl font-bold text-white">404</span>
        </div>
        <h1 className="mb-4 text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Page Not Found
        </h1>
        <p className="mb-8 text-xl text-muted-foreground">
          Oops! This page doesn't exist on Tingle.
        </p>
        <a 
          href="/" 
          className="inline-flex items-center px-6 py-3 rounded-lg gradient-primary text-white hover:opacity-90 transition-smooth neon-glow font-semibold"
        >
          Return to Explore
        </a>
      </div>
    </div>
  );
};

export default NotFound;
