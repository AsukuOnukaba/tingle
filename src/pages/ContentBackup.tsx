import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Database, Clock } from "lucide-react";

export default function ContentBackup() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    
    // Simulate export process
    setTimeout(() => {
      toast({
        title: "Export complete",
        description: "Your data has been exported successfully",
      });
      setExporting(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Content Backup & Export</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Your Data
              </CardTitle>
              <CardDescription>
                Download a copy of all your content and data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">What's included:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Profile information</li>
                  <li>All messages and conversations</li>
                  <li>Media files and content</li>
                  <li>Subscription history</li>
                  <li>Transaction records</li>
                </ul>
              </div>
              <Button onClick={handleExportData} disabled={exporting} className="w-full">
                {exporting ? "Exporting..." : "Export All Data"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Automatic Backups
              </CardTitle>
              <CardDescription>
                Your content is automatically backed up
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Last Backup</span>
                </div>
                <span className="text-sm font-semibold">2 hours ago</span>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Backup Features:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Daily automatic backups</li>
                  <li>30-day retention period</li>
                  <li>Encrypted storage</li>
                  <li>One-click restore</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Data
            </CardTitle>
            <CardDescription>
              Import content from a previous export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You can restore your data from a previous export. This will restore all your content, 
              settings, and preferences.
            </p>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your export file here, or click to browse
              </p>
              <Button variant="outline">Choose File</Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
