import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function CreatorApplication() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    application_note: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const checkExistingApplication = async () => {
      const { data } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setExistingApplication(data);
        setFormData({
          display_name: data.display_name || '',
          bio: data.bio || '',
          application_note: data.application_note || ''
        });
      }
    };

    checkExistingApplication();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('creators')
        .upsert({
          user_id: user.id,
          display_name: formData.display_name,
          bio: formData.bio,
          application_note: formData.application_note,
          status: existingApplication ? existingApplication.status : 'pending'
        });

      if (error) throw error;

      toast.success(existingApplication ? 'Application updated!' : 'Application submitted!');
      navigate('/creator');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (existingApplication && existingApplication.status !== 'rejected') {
    return (
      <div className="min-h-screen p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Your Creator Application</CardTitle>
            <CardDescription>
              Status: <span className="font-semibold capitalize">{existingApplication.status}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Display Name</Label>
                <p className="text-lg">{existingApplication.display_name}</p>
              </div>
              <div>
                <Label>Bio</Label>
                <p>{existingApplication.bio}</p>
              </div>
              {existingApplication.status === 'approved' && (
                <Button onClick={() => navigate('/creator')}>
                  Go to Creator Dashboard
                </Button>
              )}
              {existingApplication.status === 'pending' && (
                <p className="text-muted-foreground">
                  Your application is under review. You'll be notified once it's processed.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Apply to Become a Creator</CardTitle>
          <CardDescription>
            Share your content and earn money on Tingle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                required
                placeholder="Your creator name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio *</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                required
                placeholder="Tell us about yourself and what content you'll create"
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="application_note">Why do you want to become a creator?</Label>
              <Textarea
                id="application_note"
                value={formData.application_note}
                onChange={(e) => setFormData({ ...formData, application_note: e.target.value })}
                placeholder="Optional: Share your motivation"
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
