/**
 * Content Moderation Utilities
 * 
 * Provides client-side content validation and warnings for user-generated content
 * to help maintain platform safety and community guidelines.
 */

export interface ModerationResult {
  isAllowed: boolean;
  warnings: string[];
  reasons: string[];
}

/**
 * Validates text content for inappropriate language, harassment, or spam
 */
export const moderateText = (text: string): ModerationResult => {
  const result: ModerationResult = {
    isAllowed: true,
    warnings: [],
    reasons: [],
  };

  if (!text || text.trim().length === 0) {
    return result;
  }

  const lowerText = text.toLowerCase();

  // Check for explicit offensive language
  const offensivePatterns = [
    /\b(fuck|shit|bitch|ass|damn|cunt|dick|pussy)\b/gi,
    /\b(nigger|nigga|fag|retard)\b/gi,
  ];

  // Check for harassment patterns
  const harassmentPatterns = [
    /\b(kill yourself|kys|die|hurt yourself)\b/gi,
    /\b(ugly|fat|stupid|worthless|loser)\b/gi,
  ];

  // Check for spam patterns
  const spamPatterns = [
    /(click here|buy now|limited offer|act now)/gi,
    /(http|https|www\.)[^\s]+/gi, // URLs
  ];

  // Check offensive language
  for (const pattern of offensivePatterns) {
    if (pattern.test(text)) {
      result.warnings.push("Your content contains language that may violate community guidelines");
      result.reasons.push("offensive_language");
      break;
    }
  }

  // Check harassment
  for (const pattern of harassmentPatterns) {
    if (pattern.test(text)) {
      result.isAllowed = false;
      result.warnings.push("Your content appears to contain harassment or hate speech");
      result.reasons.push("harassment");
      break;
    }
  }

  // Check spam
  for (const pattern of spamPatterns) {
    if (pattern.test(text)) {
      result.warnings.push("Your content may be flagged as spam");
      result.reasons.push("spam");
      break;
    }
  }

  return result;
};

/**
 * Validates image files before upload
 * Checks file size, type, and provides guidance on acceptable content
 */
export const moderateImageFile = (file: File): ModerationResult => {
  const result: ModerationResult = {
    isAllowed: true,
    warnings: [],
    reasons: [],
  };

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    result.isAllowed = false;
    result.warnings.push("File size too large. Maximum size is 10MB");
    result.reasons.push("file_size");
    return result;
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    result.isAllowed = false;
    result.warnings.push("Invalid file type. Please upload JPEG, PNG, GIF, or WebP images");
    result.reasons.push("file_type");
    return result;
  }

  // Add general content policy reminder
  result.warnings.push(
    "Please ensure your image follows our content policy: No nudity, violence, harassment, or illegal content"
  );

  return result;
};

/**
 * Community guidelines text for display to users
 */
export const COMMUNITY_GUIDELINES = {
  title: "Community Content Guidelines",
  rules: [
    "No nudity or sexually explicit content",
    "No violence, gore, or graphic content",
    "No harassment, bullying, or hate speech",
    "No spam, scams, or misleading content",
    "No illegal activities or content",
    "Respect others' privacy and dignity",
  ],
  consequences: "Violating these guidelines may result in content removal, account suspension, or permanent ban.",
};
