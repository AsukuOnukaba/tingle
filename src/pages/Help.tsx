import { useState } from "react";
import { Search, ChevronDown, MessageCircle, Shield, CreditCard, User, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Help = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const categories = [
    {
      icon: User,
      title: "Getting Started",
      description: "Learn the basics of using Tingle",
      color: "from-primary to-secondary"
    },
    {
      icon: CreditCard,
      title: "Billing & Payments",
      description: "Manage subscriptions and payments",
      color: "from-secondary to-accent"
    },
    {
      icon: Shield,
      title: "Safety & Privacy",
      description: "Stay safe and protect your privacy",
      color: "from-accent to-primary"
    },
    {
      icon: MessageCircle,
      title: "Creator Support",
      description: "Help for content creators",
      color: "from-primary to-accent"
    }
  ];

  const faqs = [
    {
      category: "Getting Started",
      question: "How do I create an account?",
      answer: "To create an account, click the 'Sign Up' button on our homepage, enter your email and create a password. You'll need to verify your email address and confirm you're 18 or older."
    },
    {
      category: "Getting Started", 
      question: "How do I find creators to follow?",
      answer: "Use our Explore page to browse creators by category, popularity, or search for specific interests. You can also use filters to find creators based on location, content type, or subscription price."
    },
    {
      category: "Billing & Payments",
      question: "How do subscriptions work?",
      answer: "Subscriptions are recurring monthly payments that give you access to a creator's content. You can cancel anytime, but you'll retain access until the end of your billing period."
    },
    {
      category: "Billing & Payments",
      question: "What payment methods do you accept?",
      answer: "We accept major credit cards (Visa, Mastercard, American Express), PayPal, and various digital wallets. All payments are processed securely through our encrypted payment system."
    },
    {
      category: "Safety & Privacy",
      question: "How do you protect my privacy?",
      answer: "We use advanced encryption to protect your data, never share personal information without consent, and offer anonymous browsing options. You can control what information is visible on your profile."
    },
    {
      category: "Safety & Privacy",
      question: "How do I report inappropriate content?",
      answer: "Click the 'Report' button on any post or profile, select the reason for reporting, and our moderation team will review within 24 hours. You can also block users to prevent them from contacting you."
    },
    {
      category: "Creator Support",
      question: "How do I become a creator?",
      answer: "Click 'Become a Creator' in the navigation, complete the application including identity verification, set your subscription price and content guidelines, then wait for approval (usually 1-3 business days)."
    },
    {
      category: "Creator Support",
      question: "When do I get paid?",
      answer: "Creator earnings are paid out weekly on Fridays for the previous week's earnings. Minimum payout is $20. Payments are sent to your connected bank account or PayPal."
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-up">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              How Can We Help?
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Find answers to common questions or get in touch with our support team.
            </p>
            
            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search for help..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted/50 border-border/50 focus:border-primary transition-smooth text-lg py-6"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            {categories.map((category, index) => (
              <Card 
                key={category.title}
                className="glass-card border-border/50 hover-scale cursor-pointer transition-smooth"
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${category.color} mx-auto mb-4 flex items-center justify-center`}>
                    <category.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{category.title}</h3>
                  <p className="text-muted-foreground text-sm">{category.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="glass-card rounded-3xl p-8 md:p-12 mb-16 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            
            <Accordion type="single" collapsible className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="glass-card border-border/50 rounded-xl px-6"
                >
                  <AccordionTrigger className="text-left hover:text-primary transition-smooth py-6">
                    <div>
                      <div className="text-sm text-primary mb-1">{faq.category}</div>
                      <div className="font-semibold">{faq.question}</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {filteredFaqs.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full gradient-primary mx-auto mb-4 flex items-center justify-center opacity-50">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try different keywords or contact our support team directly.
                </p>
              </div>
            )}
          </div>

          {/* Contact Support */}
          <div className="glass-card rounded-3xl p-8 md:p-12 text-center animate-fade-up" style={{ animationDelay: "0.6s" }}>
            <Heart className="w-16 h-16 mx-auto mb-6 text-primary" />
            <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Our support team is available 24/7 to help you with any questions or issues.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="gradient-primary hover:opacity-90 transition-smooth neon-glow"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Live Chat
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="bg-background/50 border-primary/30 hover:bg-primary/10 transition-smooth"
              >
                Email Support
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Help;