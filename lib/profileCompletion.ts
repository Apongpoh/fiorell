import { IUser } from "@/models/User";

export interface ProfileCompletionResult {
  percentage: number; // 0-1
  score: number; // 0-100
  breakdown: {
    photos: number;
    bio: number;
    interests: number;
    location: number;
    dob: number;
    lifestyle: number;
    verification: number;
  };
}

// Weights total 100
const WEIGHTS = {
  photos: 30,
  bio: 15,
  interests: 20,
  location: 5,
  dob: 5,
  lifestyle: 15, // split across up to 3 lifestyle fields
  verification: 10,
};

export function computeProfileCompletion(
  user: Partial<IUser> & {
    photos?: { url: string; key: string; isMain: boolean; createdAt: Date }[];
    interests?: string[];
    lifestyle?: {
      hasKids?: boolean;
      smoking?: "no" | "occasionally" | "yes";
      maritalStatus?: "single" | "divorced" | "widowed" | "separated";
    };
    verification?: {
      isVerified: boolean;
      verificationPhoto?: string;
      verifiedAt?: Date;
    };
    location?: { type: string; coordinates: number[]; city: string };
    dateOfBirth?: Date;
    bio?: string;
  }
): ProfileCompletionResult {
  let photosScore = 0;
  const photoCount = user.photos?.length || 0;
  if (photoCount > 0) {
    photosScore = (Math.min(photoCount, 6) / 6) * WEIGHTS.photos; // up to 6 photos counts fully
  }

  let bioScore = 0;
  const bioLen = (user.bio || "").trim().length;
  if (bioLen > 0) {
    bioScore = (Math.min(bioLen, 80) / 80) * WEIGHTS.bio; // full credit at 80 chars
  }

  let interestsScore = 0;
  const interestCount = user.interests?.length || 0;
  if (interestCount > 0) {
    interestsScore = (Math.min(interestCount, 10) / 10) * WEIGHTS.interests; // full at 10
  }

  const locationScore = user.location?.city ? WEIGHTS.location : 0;
  const dobScore = user.dateOfBirth ? WEIGHTS.dob : 0;

  const lifestyleFields = ["smoking", "maritalStatus", "hasKids"] as const;
  let lifestyleFilled = 0;
  lifestyleFields.forEach((f) => {
    if (user.lifestyle && user.lifestyle[f] !== undefined) lifestyleFilled += 1;
  });
  const lifestyleScore =
    lifestyleFilled === 0
      ? 0
      : (lifestyleFilled / lifestyleFields.length) * WEIGHTS.lifestyle;

  const verificationScore = user.verification?.isVerified
    ? WEIGHTS.verification
    : 0;

  const total =
    photosScore +
    bioScore +
    interestsScore +
    locationScore +
    dobScore +
    lifestyleScore +
    verificationScore;
  const percentage = total / 100; // 0-1

  // Profile score: base completeness * 80 + verification bonus + photo richness bonus
  const richnessBonus = (Math.min(photoCount, 6) / 6) * 10; // up to +10
  const verificationBonus = user.verification?.isVerified ? 10 : 0; // +10 if verified
  const score = Math.round(
    Math.min(100, percentage * 80 + richnessBonus + verificationBonus)
  );

  return {
    percentage: Number(percentage.toFixed(4)),
    score,
    breakdown: {
      photos: Number(photosScore.toFixed(2)),
      bio: Number(bioScore.toFixed(2)),
      interests: Number(interestsScore.toFixed(2)),
      location: Number(locationScore.toFixed(2)),
      dob: Number(dobScore.toFixed(2)),
      lifestyle: Number(lifestyleScore.toFixed(2)),
      verification: Number(verificationScore.toFixed(2)),
    },
  };
}
