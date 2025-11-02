import { useState, useEffect } from "react";
import { Star, ThumbsUp, Flag, Trash2, Edit2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ReportContent } from "./ReportContent";
import { moderateText } from "@/lib/contentModeration";

interface ProfileReviewsProps {
  profileId: string;
}

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_profile?: {
    display_name: string;
    profile_image?: string;
  };
}

export function ProfileReviews({ profileId }: ProfileReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingReview, setEditingReview] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [profileId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("profile_reviews")
        .select(`
          id,
          reviewer_id,
          rating,
          comment,
          created_at,
          reviewer:profiles!profile_reviews_reviewer_id_fkey(display_name, profile_image)
        `)
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReviews(
        data.map((review: any) => ({
          ...review,
          reviewer_profile: review.reviewer,
        }))
      );
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error("Please log in to leave a review");
      return;
    }

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    // Moderate comment content
    const moderation = moderateText(comment);
    if (!moderation.isAllowed) {
      toast.error("Your comment violates community guidelines: " + moderation.warnings.join(". "));
      return;
    }

    if (moderation.warnings.length > 0) {
      toast.warning("Please review your comment: " + moderation.warnings[0]);
    }

    setSubmitting(true);

    try {
      const { error } = await (supabase as any).from("profile_reviews").insert({
        profile_id: profileId,
        reviewer_id: user.id,
        rating,
        comment: comment.trim(),
      });

      if (error) throw error;

      toast.success("Review submitted successfully!");
      setRating(0);
      setComment("");
      fetchReviews();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error(error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("profile_reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;

      toast.success("Review deleted successfully!");
      fetchReviews();
    } catch (error: any) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
        <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Write Review Section */}
      {user && user.id !== profileId && (
        <Card className="p-6 glass-card">
          <h3 className="text-lg font-semibold mb-4">Leave a Review</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Comment</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Please follow our community guidelines: No harassment, hate speech, or explicit content.
              </p>
            </div>
            <Button
              onClick={handleSubmitReview}
              disabled={submitting || rating === 0 || !comment.trim()}
              className="gradient-primary"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Reviews ({reviews.length})
        </h3>
        {reviews.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No reviews yet. Be the first to leave a review!
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="p-6 glass-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={review.reviewer_profile?.profile_image} />
                    <AvatarFallback>
                      {review.reviewer_profile?.display_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {review.reviewer_profile?.display_name || "Anonymous"}
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {user?.id === review.reviewer_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReview(review.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <ReportContent contentType="review" contentId={review.id} />
                </div>
              </div>
              <p className="text-muted-foreground">{review.comment}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
