"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Plus,
  X,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { userAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useNotification } from "@/contexts/NotificationContext";

const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  age: z
    .number()
    .min(18, "You must be at least 18 years old")
    .max(120, "Please enter a valid age"),
  gender: z.enum(["male", "female", "non-binary", "prefer-not-to-say"]),
  dateOfBirth: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return date instanceof Date && !isNaN(date.getTime());
      },
      { message: "Please enter a valid date" }
    )
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        const age = Math.floor(
          (new Date().getTime() - date.getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        );
        return age >= 18;
      },
      { message: "You must be at least 18 years old" }
    ),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  location: z.object({
    city: z.string().min(2, "Please enter your city"),
  }),
  interests: z.array(z.string()).min(3, "Please select at least 3 interests"),
});

type ProfileForm = z.infer<typeof profileSchema>;

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

export default function ProfilePage() {
  const { logout } = useAuth();
  const router = useRouter();
  const { showNotification } = useNotification();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load current user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        const response = await userAPI.getProfile();
        const userData = response.user;
        setCurrentUser(userData);
        setSelectedInterests(userData.interests || []);
        setPhotos(userData.photos || []);
      } catch (error) {
        console.error("Failed to load user profile:", error);
        if (error instanceof Error && error.message.includes("Unauthorized")) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [logout]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
    watch,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      interests: selectedInterests,
    },
  });

  // Reset form when user data loads
  useEffect(() => {
    if (currentUser) {
      const formData = {
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        age: currentUser.age || undefined,
        gender: currentUser.gender || undefined,
        dateOfBirth: currentUser.dateOfBirth
          ? new Date(currentUser.dateOfBirth).toISOString().split("T")[0]
          : "",
        bio: currentUser.bio || "",
        location: {
          city: currentUser.location?.city || "",
        },
        interests: currentUser.interests || [],
      };
      reset(formData);
      setSelectedInterests(formData.interests);
    }
  }, [currentUser, reset]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      const updateData = {
        firstName: data.firstName,
        lastName: data.lastName,
        age: Number(data.age),
        gender: data.gender,
        dateOfBirth: data.dateOfBirth
          ? new Date(
              new Date(data.dateOfBirth).getTime() -
                new Date().getTimezoneOffset() * 60000
            ).toISOString()
          : undefined,
        bio: data.bio || "",
        interests: data.interests,
        location: {
          city: data.location.city,
        },
      };

      await userAPI.updateProfile(updateData);

      // Refresh user data
      const response = await userAPI.getProfile();
      setCurrentUser(response.user);

      showNotification("Profile updated successfully!", "success");
    } catch (error) {
      console.error("Failed to update profile:", error);
      showNotification("Failed to update profile. Please try again.", "error");
    }
  };

  const toggleInterest = (interest: string) => {
    const currentInterests = watch("interests") || [];
    const newInterests = currentInterests.includes(interest)
      ? currentInterests.filter((i) => i !== interest)
      : [...currentInterests, interest];
    setValue("interests", newInterests);
    setSelectedInterests(newInterests);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Profile not found
          </h2>
          <p className="text-gray-600 mb-4">
            Unable to load your profile data.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <div className="flex-1 flex items-center justify-center">
            <User className="h-6 w-6 text-pink-500" />
            <span className="text-xl font-bold text-gray-900 ml-2">
              {currentUser?.firstName}'s Profile
            </span>
          </div>
          <button
            onClick={logout}
            className="flex cursor-pointer space-x-1 text-gray-600 hover:text-red-600 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Profile Stats */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Profile Overview
              </h2>
              {currentUser?.verification?.isVerified && (
                <div className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">Verified</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-500">
                  {currentUser?.stats?.totalLikesReceived +
                    currentUser?.stats?.totalSuperLikesReceived || 0}
                </div>
                <div className="text-sm text-gray-600">Likes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-500">
                  {currentUser?.stats?.totalMatches || 0}
                </div>
                <div className="text-sm text-gray-600">Matches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-500">
                  {currentUser?.stats?.profileViews || 0}
                </div>
                <div className="text-sm text-gray-600">Views</div>
              </div>
            </div>
          </div>

          {/* Profile Photos */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Profile Photos
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div
                  key={photo._id || index}
                  className="relative aspect-[3/4] group"
                >
                  <img
                    src={photo.url || "/api/placeholder?width=200&height=300"}
                    alt={`Profile photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {/* Delete photo button */}
                  <button
                    onClick={async () => {
                      if (!photo._id) {
                        showNotification(
                          "Cannot delete photo: Invalid photo ID",
                          "error"
                        );
                        return;
                      }
                      try {
                        await userAPI.deletePhoto(photo._id);
                        // Refresh user data and photos
                        const response = await userAPI.getProfile();
                        setCurrentUser(response.user);
                        setPhotos(response.user.photos || []);
                        showNotification(
                          "Photo deleted successfully!",
                          "success"
                        );
                      } catch (error) {
                        console.error("Photo deletion failed:", error);
                        if (error instanceof Error) {
                          showNotification(
                            `Failed to delete photo: ${error.message}`,
                            "error"
                          );
                        } else {
                          showNotification(
                            "Failed to delete photo. Please try again.",
                            "error"
                          );
                        }
                      }
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete Photo"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                  {/* Set main photo button */}
                  {!photo.isMain && (
                    <button
                      onClick={async () => {
                        try {
                          await userAPI.setMainPhoto(photo._id);
                          // Refresh user data and photos
                          const response = await userAPI.getProfile();
                          setCurrentUser(response.user);
                          setPhotos(response.user.photos || []);
                          showNotification("Main photo updated!", "success");
                        } catch (error) {
                          console.error("Set main photo failed:", error);
                          showNotification(
                            "Failed to set main photo. Please try again.",
                            "error"
                          );
                        }
                      }}
                      className="absolute bottom-2 left-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Set as Main Photo"
                    >
                      Set Main
                    </button>
                  )}
                  {photo.isMain && (
                    <div className="absolute bottom-2 left-2 bg-pink-500 text-white text-xs px-2 py-1 rounded">
                      Main Photo
                    </div>
                  )}
                </div>
              ))}
              {photos.length < 6 && (
                <label className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-pink-300 hover:text-pink-500 transition-colors cursor-pointer relative">
                  {uploading ? (
                    <>
                      <div className="absolute inset-0 bg-white bg-opacity-70 flex flex-col items-center justify-center z-10 rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-2"></div>
                        <span className="text-sm text-pink-500">
                          Uploading...
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Plus className="h-8 w-8 mb-2" />
                      <span className="text-sm">Add Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={uploading}
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;
                          setUploading(true);
                          try {
                            // Upload photos to backend
                            await userAPI.uploadPhotos(files);
                            // Refresh user data and photos
                            const response = await userAPI.getProfile();
                            setCurrentUser(response.user);
                            setPhotos(response.user.photos || []);
                            showNotification(
                              "Photo(s) uploaded successfully!",
                              "success"
                            );
                          } catch (error) {
                            console.error("Photo upload failed:", error);
                            showNotification(
                              "Photo upload failed. Please try again.",
                              "error"
                            );
                          } finally {
                            setUploading(false);
                          }
                        }}
                      />
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Basic Information
              </h2>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    {...register("firstName")}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    {...register("age", { valueAsNumber: true })}
                    type="number"
                    min={18}
                    max={120}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  {errors.age && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.age.message}
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
                    <option value="">Select gender</option>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    {...register("dateOfBirth")}
                    type="date"
                    max={
                      new Date(
                        new Date().getFullYear() - 18,
                        new Date().getMonth(),
                        new Date().getDate()
                      )
                        .toISOString()
                        .split("T")[0]
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                      errors.dateOfBirth ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.dateOfBirth.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  {...register("location.city")}
                  type="text"
                  placeholder="Enter your city"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                {errors.location?.city && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.location.city.message}
                  </p>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                About Me
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  {...register("bio")}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                  placeholder="Tell people about yourself..."
                />
                {errors.bio && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.bio.message}
                  </p>
                )}
              </div>
            </div>

            {/* Interests */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Interests ({selectedInterests.length})
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Select at least 3 interests to help us find better matches for
                you.
              </p>
              <div className="flex flex-wrap gap-2">
                {availableInterests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedInterests.includes(interest)
                        ? "bg-pink-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              {selectedInterests.length < 3 && (
                <p className="text-red-500 text-sm mt-2">
                  Please select at least 3 interests
                </p>
              )}
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isSubmitting || selectedInterests.length < 3}
              className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:transform-none cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </form>

          {/* Subscription Status */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Subscription
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-medium text-gray-900 capitalize">
                    {currentUser?.subscription?.type || "free"} Plan
                  </span>
                  {currentUser?.subscription?.type === "premium" && (
                    <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-2 py-1 rounded text-xs font-medium">
                      PREMIUM
                    </span>
                  )}
                </div>
                {currentUser?.subscription?.expiresAt && (
                  <p className="text-sm text-gray-600 mt-1">
                    Expires:{" "}
                    {new Date(
                      currentUser.subscription.expiresAt
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
              {currentUser?.subscription?.type === "free" && (
                <button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all cursor-pointer">
                  Upgrade
                </button>
              )}
            </div>
          </div>

          {/* Settings Menu */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <h2 className="text-xl font-semibold text-gray-900 p-6 pb-4">
              Settings
            </h2>
            <div className="divide-y divide-gray-100">
              <Link
                href="/settings/notifications"
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Bell className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">Notifications</span>
                </div>
                <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
              </Link>

              <Link
                href="/settings/privacy"
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">Privacy & Safety</span>
                </div>
                <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
              </Link>

              <Link
                href="/help"
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <HelpCircle className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">Help & Support</span>
                </div>
                <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
              </Link>

              <button
                className="flex items-center justify-between w-full p-6 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <div className="flex items-center space-x-3">
                  <Trash className="h-5 w-5 text-red-500" />
                  <span className="text-red-500">Delete Account</span>
                </div>
              </button>

              {/* Delete Account Confirmation Dialog */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-gray-500/30 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-white/95 rounded-2xl p-6 max-w-md w-full mx-4 shadow-lg border border-gray-100">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Delete Account
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Are you sure you want to delete your account? This action
                      cannot be undone and all your data will be permanently
                      deleted.
                    </p>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await userAPI.deleteAccount();
                            showNotification(
                              "Account deleted successfully.",
                              "success"
                            );
                            logout();
                          } catch (error) {
                            showNotification(
                              "Failed to delete account. Please try again.",
                              "error"
                            );
                          } finally {
                            setShowDeleteConfirm(false);
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
