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

  // Enhanced harassment and bullying patterns
  const harassmentPatterns = [
    /\b(kill yourself|kys|die|hurt yourself|suicide|hang yourself)\b/gi,
    /\b(ugly|disgusting|hideous|repulsive|worthless|pathetic|loser)\b/gi,
    /\b(nobody likes you|everyone hates you|waste of space)\b/gi,
    /\b(fat|obese|pig|cow)\s*(ass|bitch|fuck|shit)?\b/gi,
    /\b(stupid|dumb|idiot|moron|retard)\s*(bitch|fuck|ass)?\b/gi,
  ];

  // Explicit offensive and hate speech
  const offensivePatterns = [
    /\b(fuck|shit|bitch|cunt|dick|pussy|cock|whore|slut)\b/gi,
    /\b(nigger|nigga|fag|faggot|tranny)\b/gi,
  ];

  // Cyberbullying and intimidation
  const bullyingPatterns = [
    /\b(i will (find|get|hurt|beat|kill) you)\b/gi,
    /\b(watch your back|you're dead|threat|attack)\b/gi,
    /\b(exposed|leak|share your|post your)\s*(nudes|pictures|photos|address)\b/gi,
  ];

  // Sexual harassment
  const sexualHarassmentPatterns = [
    /\b(send (nudes|pics|photos)|show me your|wanna (fuck|sex))\b/gi,
    /\b(dick pic|pussy pic|tits|boobs)\b/gi,
  ];

  // Spam and scam patterns
  const spamPatterns = [
    /(click here|buy now|limited offer|act now|make money fast)/gi,
    /\b(http|https|www\.)[^\s]+/gi, // URLs
    /(\$\$\$|!!!!!|FREE FREE FREE)/gi,
  ];

  // Check harassment (highest priority - block immediately)
  for (const pattern of harassmentPatterns) {
    if (pattern.test(text)) {
      result.isAllowed = false;
      result.warnings.push("Your message contains harassment or bullying. This is not allowed.");
      result.reasons.push("harassment");
      break;
    }
  }

  // Check bullying/threats
  for (const pattern of bullyingPatterns) {
    if (pattern.test(text)) {
      result.isAllowed = false;
      result.warnings.push("Your message contains threats or intimidation. This is not allowed.");
      result.reasons.push("bullying");
      break;
    }
  }

  // Check sexual harassment
  for (const pattern of sexualHarassmentPatterns) {
    if (pattern.test(text)) {
      result.isAllowed = false;
      result.warnings.push("Your message contains inappropriate sexual content. This is not allowed.");
      result.reasons.push("sexual_harassment");
      break;
    }
  }

  // Check offensive language (warning, but allow)
  for (const pattern of offensivePatterns) {
    if (pattern.test(text)) {
      result.warnings.push("Your message contains offensive language that may violate community guidelines");
      result.reasons.push("offensive_language");
      break;
    }
  }

  // Check spam
  for (const pattern of spamPatterns) {
    if (pattern.test(text)) {
      result.warnings.push("Your message may be flagged as spam");
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
