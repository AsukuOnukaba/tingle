import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, Upload, Shield } from "lucide-react";

export default function Verification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!idDocument || !selfie) {
      toast({
        title: "Missing documents",
        description: "Please upload both ID document and selfie",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // Simulate verification submission
    setTimeout(() => {
      toast({
        title: "Verification submitted",
        description: "Your verification request has been submitted and will be reviewed within 24-48 hours",
      });
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Account Verification</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <Upload className="h-12 w-12 text-primary" />
                <h3 className="font-semibold">Upload Documents</h3>
                <p className="text-sm text-muted-foreground">
                  Submit your ID and verification photo
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <Shield className="h-12 w-12 text-primary" />
                <h3 className="font-semibold">Review Process</h3>
                <p className="text-sm text-muted-foreground">
                  Our team reviews your submission
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <CheckCircle2 className="h-12 w-12 text-primary" />
                <h3 className="font-semibold">Get Verified</h3>
                <p className="text-sm text-muted-foreground">
                  Receive your verification badge
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Verification Documents</CardTitle>
            <CardDescription>
              Upload the required documents to verify your identity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="idDocument">Government-issued ID</Label>
                <Input
                  id="idDocument"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Upload a clear photo of your passport, driver's license, or national ID
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="selfie">Selfie Verification</Label>
                <Input
                  id="selfie"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Upload a clear selfie holding your ID document
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Verification Guidelines:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Ensure all documents are clear and readable</li>
                  <li>Your face must be clearly visible in the selfie</li>
                  <li>Documents must be valid and not expired</li>
                  <li>All information must match your account details</li>
                </ul>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Submitting..." : "Submit for Verification"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
