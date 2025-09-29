import { Link } from "react-router-dom";
import { Heart, Twitter, Instagram, Facebook } from "lucide-react";
import tingleLogo from "@/assets/tingle-logo.png";

const Footer = () => {
  return (
    <footer className="bg-card/50 border-t border-border/50 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <img src={tingleLogo} alt="Tingle" className="w-8 h-8" />
              <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Tingle
              </h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Where connections spark into something more. The ultimate platform for creators and fans to connect intimately.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Explore Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/explore" className="text-muted-foreground hover:text-primary transition-smooth">
                  Discover Creators
                </Link>
              </li>
              <li>
                <Link to="/creator" className="text-muted-foreground hover:text-primary transition-smooth">
                  Become a Creator
                </Link>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                  Top Creators
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                  Categories
                </a>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/help" className="text-muted-foreground hover:text-primary transition-smooth">
                  Help Center
                </Link>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                  Safety & Guidelines
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                  Report Content
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-smooth">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-smooth">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-smooth">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-smooth">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border/50 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground mb-4 md:mb-0">
            © {new Date().getFullYear()} Tingle. All rights reserved. Made with <Heart className="inline w-4 h-4 text-primary mx-1" /> for creators.
          </div>
          <div className="text-sm text-muted-foreground">
            18+ Adult Content Platform
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;