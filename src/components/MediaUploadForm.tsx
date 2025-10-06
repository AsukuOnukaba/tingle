import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';

interface MediaUploadFormProps {
  creatorId: string;
}

export default function MediaUploadForm({ creatorId }: MediaUploadFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: ''
  });
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentFile) {
      toast.error('Please select a content file');
      return;
    }

    setLoading(true);

    try {
      // Upload content file
      const contentFileName = `${Date.now()}_${contentFile.name}`;
      const { data: contentData, error: contentError } = await supabase.storage
        .from('media-content')
        .upload(contentFileName, contentFile);

      if (contentError) throw contentError;

      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (thumbnailFile) {
        const thumbnailFileName = `${Date.now()}_${thumbnailFile.name}`;
        const { data: thumbnailData, error: thumbnailError } = await supabase.storage
          .from('media-thumbnails')
          .upload(thumbnailFileName, thumbnailFile);

        if (thumbnailError) throw thumbnailError;

        const { data: { publicUrl } } = supabase.storage
          .from('media-thumbnails')
          .getPublicUrl(thumbnailData.path);
        
        thumbnailUrl = publicUrl;
      }

      // Create media record
      const { error: dbError } = await supabase
        .from('media')
        .insert({
          creator_id: creatorId,
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price),
          file_url: contentData.path,
          thumbnail_url: thumbnailUrl,
          is_premium: true,
          status: 'pending'
        });

      if (dbError) throw dbError;

      toast.success('Content uploaded! Waiting for admin approval.');
      setFormData({ title: '', description: '', price: '' });
      setContentFile(null);
      setThumbnailFile(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          placeholder="Content title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your content"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Price (USD) *</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          required
          placeholder="9.99"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content File *</Label>
        <Input
          id="content"
          type="file"
          onChange={(e) => setContentFile(e.target.files?.[0] || null)}
          required
          accept="image/*,video/*"
        />
        <p className="text-sm text-muted-foreground">Images or videos only</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="thumbnail">Thumbnail (Optional)</Label>
        <Input
          id="thumbnail"
          type="file"
          onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
          accept="image/*"
        />
        <p className="text-sm text-muted-foreground">Preview image for your content</p>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload Content
          </>
        )}
      </Button>
    </form>
  );
}
