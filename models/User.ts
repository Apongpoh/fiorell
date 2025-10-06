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
    maritalStatus?: "single" | "divorced" | "widowed" | "separated";
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
  };
  subscription: {
    type: "free" | "premium" | "premium_plus";
    expiresAt?: Date;
    features: string[];
  };
  stats: {
    likes: number;
    matches: number;
    views: number;
  };
  isActive: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
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
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: [true, "First name is required"], trim: true, maxlength: [50, "First name cannot exceed 50 characters"] },
    lastName: { type: String, required: [true, "Last name is required"], trim: true, maxlength: [50, "Last name cannot exceed 50 characters"] },
    email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"] },
    password: { type: String, required: true, minlength: 6 },
    id: { type: Schema.Types.ObjectId, index: true },
    dateOfBirth: { type: Date, required: false, validate: { validator: function (date: Date) { if (!date) return true; const age = new Date().getFullYear() - date.getFullYear(); return age >= 18 && age <= 100; }, message: "You must be at least 18 years old" } },
    gender: { type: String, required: [true, "Gender is required"], enum: ["male", "female", "non-binary", "prefer-not-to-say"] },
    location: { type: { type: String, default: "Point", enum: ["Point"] }, coordinates: { type: [Number], required: false }, city: { type: String, required: [true, "Location is required"], trim: true } },
    bio: { type: String, maxlength: [500, "Bio cannot exceed 500 characters"], trim: true },
    interests: [{ type: String, trim: true }],
    photos: [{ url: { type: String, required: true }, key: { type: String, required: true }, isMain: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now } }],
    defaultPhoto: { type: String, default: "/api/placeholder/profile" },
    preferences: { ageRange: { min: { type: Number, default: 18, min: 18 }, max: { type: Number, default: 99, max: 99 } }, maxDistance: { type: Number, default: 50, min: 1, max: 100 }, lookingFor: [{ type: String }], dealBreakers: { requireVerified: { type: Boolean, default: false }, mustHaveInterests: [{ type: String, trim: true }], excludeInterests: [{ type: String, trim: true }], excludeSmoking: [{ type: String, trim: true }], excludeMaritalStatuses: [{ type: String, trim: true }], requireHasKids: { type: Boolean, required: false, default: null } } },
    lifestyle: { hasKids: { type: Boolean, required: false }, smoking: { type: String, enum: ["no", "occasionally", "yes"], required: false }, maritalStatus: { type: String, enum: ["single", "divorced", "widowed", "separated"], required: false } },
    verification: { isVerified: { type: Boolean, default: false }, verificationPhoto: { type: String }, verifiedAt: { type: Date } },
    privacy: { showAge: { type: Boolean, default: true }, showLocation: { type: Boolean, default: true }, onlineStatus: { type: Boolean, default: true }, readReceipts: { type: Boolean, default: true }, visibility: { type: String, enum: ["everyone", "mutual", "hidden"], default: "everyone" } },
    subscription: { type: { type: String, enum: ["free", "premium", "premium_plus"], default: "free" }, expiresAt: { type: Date }, features: [{ type: String }] },
    stats: { totalLikesReceived: { type: Number, default: 0 }, totalSuperLikesReceived: { type: Number, default: 0 }, totalMatches: { type: Number, default: 0 }, profileViews: { type: Number, default: 0 }, lastStatsUpdate: { type: Date, default: Date.now } },
    isActive: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now },
    twoFA: { enabled: { type: Boolean, default: false }, secret: { type: String }, tempSecret: { type: String }, verified: { type: Boolean, default: false }, recoveryCodes: [{ type: String }], enabledAt: { type: Date }, disabledAt: { type: Date } },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
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
  } catch (error: any) {
    next(error);
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
