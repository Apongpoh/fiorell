import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "non-binary" | "prefer-not-to-say";
  location: {
    type: string;
    coordinates: number[];
    city: string;
  };
  bio: string;
  interests: string[];
  photos: {
    url: string;
    key: string;
    isMain: boolean;
    createdAt: Date;
  }[];
  defaultPhoto: string;
  preferences: {
    ageRange: {
      min: number;
      max: number;
    };
    maxDistance: number;
    lookingFor: string[];
    dealBreakers?: {
      requireVerified?: boolean;
      mustHaveInterests?: string[];
      excludeInterests?: string[];
      excludeSmoking?: string[];
      excludeMaritalStatuses?: string[];
      requireHasKids?: boolean | null;
    };
  };
  lifestyle?: {
    hasKids?: boolean;
    smoking?: "no" | "occasionally" | "yes";
    drinking?: "never" | "socially" | "regularly";
    exercise?: "never" | "sometimes" | "regularly" | "daily";
    diet?: "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "other";
    maritalStatus?: "single" | "divorced" | "widowed" | "separated";
  };
  education?: {
    level?: "high_school" | "bachelor" | "master" | "phd" | "other";
    field?: string;
  };
  physicalAttributes?: {
    height?: number; // in cm
  };
  verification: {
    isVerified: boolean;
    verificationPhoto?: string;
    verifiedAt?: Date;
  };
  privacy: {
    showAge: boolean;
    showLocation: boolean;
    onlineStatus: boolean;
    readReceipts: boolean;
    incognitoMode?: boolean;
  };
  travel?: {
    isActive: boolean;
    currentLocation?: {
      city: string;
      country: string;
      coordinates: [number, number];
    };
    originalLocation?: {
      city: string;
      country: string;
      coordinates: [number, number];
    };
  };
  subscription: {
    type: "free" | "premium" | "premium_plus";
    expiresAt?: Date;
    features: string[];
  };
  stats: {
    totalLikesReceived: number;
    totalSuperLikesReceived: number;
    totalMatches: number;
    profileViews: number;
    lastStatsUpdate: Date;
  };
  isActive: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  isAdmin?: boolean;
  twoFA?: {
    enabled: boolean;
    secret?: string;
    tempSecret?: string;
    verified?: boolean;
    recoveryCodes?: string[];
    enabledAt?: Date;
    disabledAt?: Date;
  };
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  notificationSettings?: {
    matches?: { push: boolean; email: boolean; sound: boolean };
    messages?: { push: boolean; email: boolean; sound: boolean };
    likes?: { push: boolean; email: boolean; sound: boolean };
    views?: { push: boolean; email: boolean; sound: boolean };
    quietHours?: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };
  pushSubscriptions?: Array<{
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
    createdAt: Date;
    userAgent?: string;
  }>;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: { type: String, required: true, minlength: 6 },
    id: { type: Schema.Types.ObjectId, index: true },
    dateOfBirth: {
      type: Date,
      required: false,
      validate: {
        validator: function (date: Date) {
          if (!date) return true;
          const age = new Date().getFullYear() - date.getFullYear();
          return age >= 18 && age <= 100;
        },
        message: "You must be at least 18 years old",
      },
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: ["male", "female", "non-binary", "prefer-not-to-say"],
    },
    location: {
      type: { type: String, default: "Point", enum: ["Point"] },
      coordinates: { type: [Number], required: false },
      city: {
        type: String,
        required: [true, "Location is required"],
        trim: true,
      },
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      trim: true,
    },
    interests: [{ type: String, trim: true }],
    photos: [
      {
        url: { type: String, required: true },
        key: { type: String, required: true },
        isMain: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    defaultPhoto: { type: String, default: "/api/placeholder/profile" },
    preferences: {
      ageRange: {
        min: { type: Number, default: 18, min: 18 },
        max: { type: Number, default: 99, max: 99 },
      },
      maxDistance: { type: Number, default: 50, min: 1, max: 100 },
      lookingFor: [{ type: String }],
      dealBreakers: {
        requireVerified: { type: Boolean, default: false },
        mustHaveInterests: [{ type: String, trim: true }],
        excludeInterests: [{ type: String, trim: true }],
        excludeSmoking: [{ type: String, trim: true }],
        excludeMaritalStatuses: [{ type: String, trim: true }],
        requireHasKids: { type: Boolean, required: false, default: null },
      },
    },
    lifestyle: {
      hasKids: { type: Boolean, required: false },
      smoking: {
        type: String,
        enum: ["no", "occasionally", "yes"],
        required: false,
      },
      drinking: {
        type: String,
        enum: ["never", "socially", "regularly"],
        required: false,
      },
      exercise: {
        type: String,
        enum: ["never", "sometimes", "regularly", "daily"],
        required: false,
      },
      diet: {
        type: String,
        enum: ["omnivore", "vegetarian", "vegan", "pescatarian", "other"],
        required: false,
      },
      maritalStatus: {
        type: String,
        enum: ["single", "divorced", "widowed", "separated"],
        required: false,
      },
    },
    education: {
      level: {
        type: String,
        enum: ["high_school", "bachelor", "master", "phd", "other"],
        required: false,
      },
      field: {
        type: String,
        trim: true,
        maxlength: [100, "Education field cannot exceed 100 characters"],
        required: false,
      },
    },
    physicalAttributes: {
      height: {
        type: Number,
        min: [100, "Height must be at least 100cm"],
        max: [250, "Height cannot exceed 250cm"],
        required: false,
      },
    },
    verification: {
      isVerified: { type: Boolean, default: false },
      verificationPhoto: { type: String },
      verifiedAt: { type: Date },
    },
    privacy: {
      showAge: { type: Boolean, default: true },
      showLocation: { type: Boolean, default: true },
      onlineStatus: { type: Boolean, default: true },
      readReceipts: { type: Boolean, default: true },
      visibility: {
        type: String,
        enum: ["everyone", "mutual", "hidden"],
        default: "everyone",
      },
      // Premium Features
      incognitoMode: { type: Boolean, default: false },
      incognitoModeUpdatedAt: { type: Date },
      blockUnmatchedMessages: { type: Boolean, default: false },
    },
    subscription: {
      type: {
        type: String,
        enum: ["free", "premium", "premium_plus"],
        default: "free",
      },
      expiresAt: { type: Date },
      features: [{ type: String }],
    },
    stats: {
      totalLikesReceived: { type: Number, default: 0 },
      totalSuperLikesReceived: { type: Number, default: 0 },
      totalMatches: { type: Number, default: 0 },
      profileViews: { type: Number, default: 0 },
      lastStatsUpdate: { type: Date, default: Date.now },
    },
    isActive: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now },
    isAdmin: { type: Boolean, default: false },
    twoFA: {
      enabled: { type: Boolean, default: false },
      secret: { type: String },
      tempSecret: { type: String },
      verified: { type: Boolean, default: false },
      recoveryCodes: [{ type: String }],
      enabledAt: { type: Date },
      disabledAt: { type: Date },
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    notificationSettings: {
      matches: {
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        sound: { type: Boolean, default: true },
      },
      messages: {
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        sound: { type: Boolean, default: true },
      },
      likes: {
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        sound: { type: Boolean, default: false },
      },
      views: {
        push: { type: Boolean, default: false },
        email: { type: Boolean, default: true },
        sound: { type: Boolean, default: false },
      },
      quietHours: {
        enabled: { type: Boolean, default: false },
        startTime: { type: String, default: "22:00" },
        endTime: { type: String, default: "08:00" },
      },
    },
    // Travel Mode (Premium Plus Feature)
    travel: {
      isActive: { type: Boolean, default: false },
      currentLocation: {
        city: { type: String },
        country: { type: String },
        coordinates: [{ type: Number }],
      },
      originalLocation: {
        city: { type: String },
        country: { type: String },
        coordinates: [{ type: Number }],
      },
    },
    pushSubscriptions: [
      {
        endpoint: { type: String, required: true },
        keys: {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true },
        },
        createdAt: { type: Date, default: Date.now },
        userAgent: { type: String },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
// Removed duplicate and misplaced twoFA field
UserSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  return Math.floor(
    (Date.now() - this.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );
});

// Pre-save middleware to hash password
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error('Hashing failed'));
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes for better query performance
// GeoJSON 2dsphere index must be on the field that stores the geometry object
UserSchema.index({ location: "2dsphere" });
UserSchema.index({ "preferences.ageRange": 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ lastSeen: 1 });

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
