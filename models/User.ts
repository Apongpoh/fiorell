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
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
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
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: false,
      },
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
    interests: [
      {
        type: String,
        trim: true,
      },
    ],
    photos: [
      {
        url: { type: String, required: true },
        key: { type: String, required: true },
        isMain: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    defaultPhoto: { 
      type: String, 
      default: "/api/placeholder/profile" 
    },
    preferences: {
      ageRange: {
        min: { type: Number, default: 18, min: 18 },
        max: { type: Number, default: 99, max: 99 },
      },
      maxDistance: { type: Number, default: 50, min: 1, max: 100 },
      lookingFor: [{ type: String }],
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
      totalLikesReceived: { type: Number, default: 0 }, // Total likes received all time
      totalSuperLikesReceived: { type: Number, default: 0 }, // Total super likes received all time
      totalMatches: { type: Number, default: 0 }, // Total matches all time
      profileViews: { type: Number, default: 0 }, // Profile views
      lastStatsUpdate: { type: Date, default: Date.now }, // Track when stats were last updated
    },
    isActive: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for age calculation
UserSchema.virtual("age").get(function () {
  return new Date().getFullYear() - this.dateOfBirth.getFullYear();
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
UserSchema.index({ "location.coordinates": "2dsphere" });
UserSchema.index({ "preferences.ageRange": 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ lastSeen: 1 });

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
