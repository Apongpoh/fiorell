"use client";

import { useState } from "react";
// import ReCAPTCHA from "react-google-recaptcha";
import { motion } from "framer-motion";
import { Heart, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const signupSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    dateOfBirth: z.string().min(1, "Please enter your date of birth"),
    gender: z.string().min(1, "Please select your gender"),
    location: z.string().min(2, "Please enter your location"),
    interests: z.array(z.string()).min(3, "Please select at least 3 interests"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showAllInterests, setShowAllInterests] = useState(false);
  const INTERESTS_COLLAPSED_COUNT = 12;
  // const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const { signup, isAuthenticated } = useAuth();
  const router = useRouter();

  // Available interests list
  const availableInterests = [
    "Photography",
    "Travel",
    "Cooking",
    "Yoga",
    "Music",
    "Technology",
    "Food",
    "Rock Climbing",
    "Art",
    "Design",
    "Dogs",
    "Wine Tasting",
    "Hiking",
    "Reading",
    "Movies",
    "Dancing",
    "Sports",
    "Gaming",
    "Fitness",
    "Nature",
    "Fashion",
    "Coffee",
    "Beach",
    "Adventure",
  ];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      interests: [],
    },
  });

  const watchedInterests = watch("interests");

  // Handle interest selection
  const toggleInterest = (interest: string) => {
    const currentInterests = watchedInterests || [];
    let newInterests;

    if (currentInterests.includes(interest)) {
      newInterests = currentInterests.filter((i) => i !== interest);
    } else {
      newInterests = [...currentInterests, interest];
    }

    setSelectedInterests(newInterests);
    setValue("interests", newInterests, { shouldValidate: true });
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push("/dashboard");
    return null;
  }

  const onSubmit = async (data: SignupForm) => {
    // reCAPTCHA logic disabled for local/dev
    // if (!recaptchaToken) {
    //   setError("Please complete the reCAPTCHA challenge.");
    //   return;
    // }
    try {
      setError(null);
      setSuccess(null);
      // Send signup data with recaptchaToken
      // await signup({ ...data, recaptchaToken });
      await signup(data);
      setSuccess(
        "Account created! Please check your email to verify your account."
      );
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as { response?: { error?: string } }).response?.error
      ) {
        setError((error as { response: { error: string } }).response.error);
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
      ) {
        setError((error as { message: string }).message);
      } else {
        setError("Signup failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="flex items-center space-x-4 max-w-2xl mx-auto">
          <Link
            href="/"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <div className="flex items-center space-x-2">
            <Heart className="h-6 w-6 text-pink-500" />
            <span className="text-xl font-bold text-gray-900">Fiorell</span>
          </div>
        </div>
      </header>

      {/* Signup Form */}
      <main className="px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Join Fiorell
              </h1>
              <p className="text-gray-600">
                Start your journey to find meaningful connections
              </p>
            </div>

            {/* Error/Success Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    {...register("firstName")}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    {...register("lastName")}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      {...register("confirmPassword")}
                      type={showConfirmPassword ? "text" : "password"}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    {...register("dateOfBirth")}
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  {errors.dateOfBirth && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.dateOfBirth.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    {...register("gender")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="">Select your gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                  {errors.gender && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.gender.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  {...register("location")}
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Enter your city/location"
                />
                {errors.location && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.location.message}
                  </p>
                )}
              </div>

              {/* Interests Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Interests{" "}
                  <span className="text-gray-500">(Select at least 3)</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                  {(showAllInterests
                    ? availableInterests
                    : availableInterests.slice(0, INTERESTS_COLLAPSED_COUNT)
                  ).map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? "bg-pink-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                  {availableInterests.length > INTERESTS_COLLAPSED_COUNT && (
                    <button
                      type="button"
                      onClick={() => setShowAllInterests((v) => !v)}
                      className="px-3 py-2 rounded-full text-sm font-medium border border-dashed border-pink-400 text-pink-600 bg-white hover:bg-pink-50 transition-colors"
                    >
                      {showAllInterests
                        ? "Show Less"
                        : `Show ${
                            availableInterests.length -
                            INTERESTS_COLLAPSED_COUNT
                          } More`}
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Selected: {selectedInterests.length} interests
                </p>
                {errors.interests && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.interests.message}
                  </p>
                )}
              </div>

              {/* Google reCAPTCHA (disabled for local/dev) */}
              {/* <div className="flex justify-center mb-4">
                <ReCAPTCHA
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "YOUR_RECAPTCHA_SITE_KEY"}
                  onChange={(token: string | null) => setRecaptchaToken(token)}
                />
              </div> */}
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:transform-none"
              >
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </button>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-pink-500 hover:text-pink-600 font-semibold"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
