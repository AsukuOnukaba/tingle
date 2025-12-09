/**
 * Content Moderation Utilities
 * 
 * Provides client-side content validation and warnings for user-generated content
 * to help maintain platform safety and community guidelines.
 * 
 * NOTE: Adult nudity is ALLOWED on this platform. Only illegal/harmful content is blocked.
 */

export interface ModerationResult {
  isAllowed: boolean;
  warnings: string[];
  reasons: string[];
}

/**
 * Validates text content for harassment, threats, or illegal content
 * Adult content and nudity are ALLOWED - only harmful/illegal content is blocked
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

  // CRITICAL: Block child exploitation and abuse content (CSAM indicators)
  const csam_patterns = [
    /\b(child|kid|minor|underage|young|little)\s*(porn|sex|nude|naked|abuse)\b/gi,
    /\b(cp|pedo|pedophile|paedophile|lolita)\b/gi,
    /\b(preteen|pre-teen)\s*(nude|naked|sex)\b/gi,
  ];

  // Block extreme illegal content
  const illegalPatterns = [
    /\b(bestiality|zoophilia|animal\s*sex)\b/gi,
    /\b(snuff|murder\s*porn|real\s*death)\b/gi,
    /\b(rape|forced\s*sex|non-?consensual)\b/gi,
    /\b(human\s*trafficking|sex\s*slave)\b/gi,
  ];

  // Harassment and threats (block immediately)
  const harassmentPatterns = [
    /\b(kill yourself|kys|die|hurt yourself|suicide|hang yourself)\b/gi,
    /\b(nobody likes you|everyone hates you|waste of space)\b/gi,
  ];

  // Cyberbullying and threats
  const bullyingPatterns = [
    /\b(i will (find|get|hurt|beat|kill) you)\b/gi,
    /\b(watch your back|you're dead|threat|attack)\b/gi,
    /\b(exposed|leak|share your|post your)\s*(nudes|pictures|photos|address)\b/gi,
    /\b(dox|doxx|swat)\b/gi,
  ];

  // Check CSAM (highest priority - block immediately)
  for (const pattern of csam_patterns) {
    if (pattern.test(text)) {
      result.isAllowed = false;
      result.warnings.push("Content involving minors is strictly prohibited and illegal.");
      result.reasons.push("csam");
      return result;
    }
  }

  // Check illegal content
  for (const pattern of illegalPatterns) {
    if (pattern.test(text)) {
      result.isAllowed = false;
      result.warnings.push("This content violates our terms and is not allowed.");
      result.reasons.push("illegal_content");
      return result;
    }
  }

  // Check harassment
  for (const pattern of harassmentPatterns) {
    if (pattern.test(text)) {
      result.isAllowed = false;
      result.warnings.push("Your message contains harassment. This is not allowed.");
      result.reasons.push("harassment");
      return result;
    }
  }

  // Check bullying/threats
  for (const pattern of bullyingPatterns) {
    if (pattern.test(text)) {
      result.isAllowed = false;
      result.warnings.push("Your message contains threats or intimidation. This is not allowed.");
      result.reasons.push("bullying");
      return result;
    }
  }

  // Spam patterns (warning only)
  const spamPatterns = [
    /(click here|buy now|limited offer|act now|make money fast)/gi,
    /(\$\$\$|!!!!!|FREE FREE FREE)/gi,
  ];

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
 * Checks file size and type - adult content is ALLOWED
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

  return result;
};

/**
 * Community guidelines text for display to users
 */
export const COMMUNITY_GUIDELINES = {
  title: "Community Content Guidelines",
  rules: [
    "No content involving minors in any context",
    "No bestiality or animal abuse content",
    "No violence, gore, or non-consensual content",
    "No harassment, bullying, or doxxing",
    "No spam, scams, or misleading content",
    "Respect others' privacy and consent",
  ],
  consequences: "Violating these guidelines may result in content removal, account suspension, or permanent ban.",
};
