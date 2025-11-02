import { useState, useEffect } from "react";
import { Star, Flag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer?: {
    display_name: string;
    profile_image: string | null;
  };
}

interface ProfileReviewsProps {
  profileId: string;
}

export function ProfileReviews({ profileId }: ProfileReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flaggedReviewId, setFlaggedReviewId] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [profileId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('profile_reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id(display_name, profile_image)
        `)
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedReviews: Review[] = data?.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        reviewer_id: r.reviewer_id,
        reviewer: r.reviewer,
      })) || [];

      setReviews(typedReviews);
      
      // Check if current user has already reviewed
      if (user) {
        const myReview = typedReviews.find((r) => r.reviewer_id === user.id);
        setUserReview(myReview || null);
        if (myReview) {
          setRating(myReview.rating);
          setComment(myReview.comment || "");
        }
      }
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
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

    setLoading(true);
    try {
      if (userReview) {
        // Update existing review
        const { error } = await (supabase as any)
          .from('profile_reviews')
          .update({
            rating,
            comment: comment.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userReview.id);

        if (error) throw error;
        toast.success("Review updated successfully!");
      } else {
        // Create new review
        const { error } = await (supabase as any)
          .from('profile_reviews')
          .insert({
            profile_id: profileId,
            reviewer_id: user.id,
            rating,
            comment: comment.trim() || null,
          });

        if (error) throw error;
        toast.success("Review submitted successfully!");
      }

      await fetchReviews();
      setComment("");
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error("Failed to submit review: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('profile_reviews')
        .delete()
        .eq('id', userReview.id);

      if (error) throw error;

      setUserReview(null);
      setRating(0);
      setComment("");
      await fetchReviews();
      toast.success("Review deleted successfully!");
    } catch (error: any) {
      console.error('Error deleting review:', error);
      toast.error("Failed to delete review");
    } finally {
      setLoading(false);
    }
  };

  const handleFlagReview = async () => {
    if (!user || !flaggedReviewId) return;

    try {
      const { error } = await (supabase as any)
        .from('content_flags')
        .insert({
          content_type: 'profile_review',
          content_id: flaggedReviewId,
          flagged_by: user.id,
          reason: flagReason,
          description: 'Inappropriate review content',
        });

      if (error) throw error;

      toast.success("Review flagged for moderation");
      setFlagDialogOpen(false);
      setFlagReason("");
      setFlaggedReviewId(null);
    } catch (error: any) {
      console.error('Error flagging review:', error);
      toast.error("Failed to flag review");
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{averageRating}</div>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(parseFloat(averageRating))
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>

          {/* Leave/Edit Review */}
          {user && profileId !== user.id && (
            <div className="space-y-4 border-t pt-6">
              <h4 className="font-semibold">
                {userReview ? "Edit Your Review" : "Leave a Review"}
              </h4>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-8 h-8 cursor-pointer transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted"
                    }`}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
              <Textarea
                placeholder="Share your experience (optional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitReview}
                  disabled={loading || rating === 0}
                >
                  {loading ? "Submitting..." : userReview ? "Update Review" : "Submit Review"}
                </Button>
                {userReview && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteReview}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarImage src={review.reviewer?.profile_image || undefined} />
                    <AvatarFallback>
                      {review.reviewer?.display_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{review.reviewer?.display_name || "Anonymous"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                </div>
                {user && review.reviewer_id !== user.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFlaggedReviewId(review.id);
                      setFlagDialogOpen(true);
                    }}
                  >
                    <Flag className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Flag Dialog */}
      <AlertDialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Flag Review</AlertDialogTitle>
            <AlertDialogDescription>
              Please select a reason for flagging this review:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            {["harassment", "spam", "inappropriate", "other"].map((reason) => (
              <Button
                key={reason}
                variant={flagReason === reason ? "default" : "outline"}
                onClick={() => setFlagReason(reason)}
                className="w-full justify-start capitalize"
              >
                {reason}
              </Button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFlagReview}
              disabled={!flagReason}
            >
              Submit Flag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
