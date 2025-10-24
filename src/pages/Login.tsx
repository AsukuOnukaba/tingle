import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Heart, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
  });

  useEffect(() => {
    // Check if user is already logged in and redirect admins accordingly
    const checkUserAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);
        
        const roles = rolesData?.map(r => r.role) || [];
        if (roles.includes('admin')) {
          navigate("/admin");
        } else {
          navigate("/home");
        }
      }
    };
    checkUserAndRedirect();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(formData.email);

      if (isResetMode) {
        // Password reset flow
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/login?reset=true`,
        });

        if (error) throw error;

        toast({
          title: "Password reset email sent",
          description: "Check your email for the password reset link",
        });
        
        setIsResetMode(false);
        setFormData({ email: "", password: "", confirmPassword: "", username: "" });
      } else if (isLogin) {
        // Login flow
        passwordSchema.parse(formData.password);

        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        // Check if user is admin and redirect accordingly
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id);

        const roles = rolesData?.map(r => r.role) || [];
        
        toast({
          title: "Login successful",
          description: roles.includes('admin') ? "Welcome back, Admin!" : "Welcome back!",
        });
        
        if (roles.includes('admin')) {
          navigate("/admin");
        } else {
          navigate("/home");
        }
      } else {
        // Sign up flow
        passwordSchema.parse(formData.password);

        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        if (!formData.username.trim()) {
          throw new Error("Username is required");
        }

        const redirectUrl = `${window.location.origin}/`;

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              username: formData.username,
            },
          },
        });

        if (error) throw error;

        // Create profile
        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              display_name: formData.username,
              age: 18,
            });

          if (profileError) {
            console.error("Profile creation error:", profileError);
          }
        }

        toast({
          title: "Account created successfully",
          description: "You can now log in with your credentials",
        });

        setIsLogin(true);
        setFormData({ ...formData, password: "", confirmPassword: "" });
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: validationError.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });
        navigate("/explore");
      } else {
        // Sign up
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Error",
            description: "Passwords do not match.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              display_name: formData.username?.trim(),
              username: formData.username?.trim(),
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/explore`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 animate-gradient-shift" 
             style={{ backgroundSize: "200% 200%" }} />
      </div>

      {/* Floating Hearts Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <Heart
            key={i}
            className={`absolute text-primary/20 animate-pulse-neon`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              fontSize: `${Math.random() * 20 + 10}px`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card p-8 rounded-3xl animate-fade-up neon-glow">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center animate-pulse-neon">
                <Heart className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              Welcome to Tingle
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? "Sign in to your account" : "Create your account"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 bg-muted/50 border-border/50 focus:border-primary transition-smooth"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 bg-muted/50 border-border/50 focus:border-primary transition-smooth"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-smooth"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-foreground">Username</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Choose a username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="bg-muted/50 border-border/50 focus:border-primary transition-smooth"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="pl-10 bg-muted/50 border-border/50 focus:border-primary transition-smooth"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full gradient-primary hover:opacity-90 transition-smooth neon-glow font-semibold py-6 text-white"
              disabled={loading}
            >
              {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full mt-4 bg-card border-border hover:bg-muted transition-smooth"
              onClick={handleGoogleLogin}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-smooth"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-primary font-semibold">
                {isLogin ? "Sign up" : "Sign in"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;