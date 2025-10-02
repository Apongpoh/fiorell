import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { generateToken } from "@/lib/auth";
import { z } from "zod";
import SignupAttempt from "@/models/SignupAttempt";
import EmailVerification from "@/models/EmailVerification";
// import { sendVerificationEmail } from "@/lib/sendVerificationEmail";
// Use the native fetch API available in Next.js

// Define signup validation schema
const signupSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name cannot exceed 50 characters")
      .regex(
        /^[a-zA-Z\s-]+$/,
        "First name can only contain letters, spaces, and hyphens"
      ),

    lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name cannot exceed 50 characters")
      .regex(
        /^[a-zA-Z\s-]+$/,
        "Last name can only contain letters, spaces, and hyphens"
      ),

    email: z
      .string()
      .email("Please enter a valid email address")
      .max(100, "Email cannot exceed 100 characters")
      .toLowerCase(),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password cannot exceed 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character"
      ),

    confirmPassword: z.string(),

    dateOfBirth: z
      .string()
      .refine((val) => {
        const date = new Date(val);
        return date instanceof Date && !isNaN(date.getTime());
      }, "Please enter a valid date")
      .refine((val) => {
        const date = new Date(val);
        const age = Math.floor(
          (new Date().getTime() - date.getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        );
        return age >= 18;
      }, "You must be at least 18 years old to create an account"),

    gender: z.enum(["male", "female", "non-binary", "prefer-not-to-say"], {
      message: "Please select a valid gender option",
    }),

    location: z
      .string()
      .min(2, "Location is required")
      .max(100, "Location cannot exceed 100 characters"),

    interests: z
      .array(z.string())
      .min(3, "Please select at least 3 interests")
      .max(10, "Maximum 10 interests allowed"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

export async function POST(request: NextRequest) {
  // Get client IP address
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limiting: max 5 signups per IP per hour
  await connectToDatabase();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentAttempts = await SignupAttempt.countDocuments({
    ip,
    createdAt: { $gte: oneHourAgo },
  });
  if (recentAttempts >= 5) {
    return NextResponse.json(
      {
        error: "Too many signup attempts from your IP. Please try again later.",
      },
      {
        status: 429,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
  try {
    await connectToDatabase();

    const body = await request.json();
    // reCAPTCHA logic disabled for local/dev
    // const recaptchaToken = body.recaptchaToken;
    // if (!recaptchaToken) {
    //   return NextResponse.json(
    //     { error: 'reCAPTCHA validation failed. Please try again.' },
    //     { status: 400 }
    //   );
    // }
    // const recaptchaSecret = process.env.RECAPTCHA_SECRET;
    // const recaptchaRes = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //   body: `secret=${recaptchaSecret}&response=${recaptchaToken}`,
    // });
    // const recaptchaData = await recaptchaRes.json();
    // if (!recaptchaData.success) {
    //   return NextResponse.json(
    //     { error: 'reCAPTCHA validation failed. Please try again.' },
    //     { status: 400 }
    //   );
    // }
    // Log this attempt
    await SignupAttempt.create({ ip });

    // Validate input data
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      const error = result.error.issues[0];
      return NextResponse.json(
        { error: error.message },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // Password matching is already handled by Zod schema refinement
    const {
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      gender,
      location,
      interests,
    } = result.data;

    // Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({
      email: { $regex: `^${email}$`, $options: "i" },
    });
    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Please try logging in instead or use a different email address",
        },
        {
          status: 409,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // Create new user with validated data
    const newUser = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      password,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      location: {
        type: "Point",
        coordinates: [0, 0], // Default coordinates [longitude, latitude]
        city: location || "Unknown",
      },
      bio: "",
      interests: interests,
      photos: [],
      preferences: {
        ageRange: { min: 18, max: 35 },
        maxDistance: 25,
        interests: [],
      },
      verification: {
        isVerified: false,
        verificationMethod: null,
      },
      isActive: true,
      lastSeen: new Date(),
    });

    const savedUser = await newUser.save();

    // Generate email verification code
    const verificationCode =
      Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    await EmailVerification.create({
      userId: savedUser._id.toString(),
      email: savedUser.email,
      code: verificationCode,
      verified: false,
    });
    // await sendVerificationEmail(savedUser.email, verificationCode); // Disabled for local/dev

    // Generate JWT token
    const token = generateToken({
      userId: savedUser._id.toString(),
      email: savedUser.email,
    });

    return NextResponse.json(
      {
        message:
          "Welcome to Fiorell! Please check your email to verify your account.",
        user: {
          id: savedUser._id,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          email: savedUser.email,
          age: savedUser.dateOfBirth
            ? new Date().getFullYear() - savedUser.dateOfBirth.getFullYear()
            : null,
          gender: savedUser.gender,
          location: savedUser.location,
          bio: savedUser.bio,
          interests: savedUser.interests,
          photos: savedUser.photos,
          isActive: savedUser.isActive,
          createdAt: savedUser.createdAt,
        },
        token,
      },
      {
        status: 201,
        headers: {
          "Access-Control-Allow-Origin":
            process.env.FRONTEND_ORIGIN || "https://yourfrontend.com",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (error) {
    // Handle validation errors specifically
    if (error instanceof Error && error.message.includes("validation failed")) {
      const validationError = error.message.includes(
        "You must be at least 18 years old"
      )
        ? "You must be at least 18 years old to create an account"
        : error.message.includes("Please enter a valid email")
        ? "Please enter a valid email address"
        : error.message.includes("Password must be at least 8 characters")
        ? "Password must be at least 8 characters long"
        : "Please check your information and try again";

      return NextResponse.json(
        { error: validationError },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating your account. Please try again",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}
