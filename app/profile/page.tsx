"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { useAuth, withAuth } from "@/contexts/AuthContext";
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
  location: z
    .object({
      city: z.string().min(2, "Please enter your city"),
      coordinatesLng: z
        .number()
        .min(-180, "Longitude must be ≥ -180")
        .max(180, "Longitude must be ≤ 180")
        .optional(),
      coordinatesLat: z
        .number()
        .min(-90, "Latitude must be ≥ -90")
        .max(90, "Latitude must be ≤ 90")
        .optional(),
    })
    .refine(
      (loc) =>
        (loc.coordinatesLng === undefined &&
          loc.coordinatesLat === undefined) ||
        (typeof loc.coordinatesLng === "number" &&
          typeof loc.coordinatesLat === "number"),
      {
        message: "Provide both longitude and latitude, or leave both empty",
        path: ["coordinatesLng"],
      }
    ),
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

// Photo interface & parsing helper hoisted outside component so its identity is stable
// and does not trigger react-hooks/exhaustive-deps warnings.
interface Photo {
  url: string;
  key: string;
  isMain: boolean;
  createdAt: Date;
  _id?: string;
}

function parsePhotos(raw: unknown): Photo[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (
        p
      ): p is {
        url?: unknown;
        key?: unknown;
        isMain?: unknown;
        createdAt?: unknown;
        _id?: unknown;
      } => typeof p === "object" && p !== null
    )
    .map((p) => {
      const obj = p as {
        url?: unknown;
        key?: unknown;
        isMain?: unknown;
        createdAt?: unknown;
        _id?: unknown;
      };
      const createdAtVal = obj.createdAt;
      return {
        url: typeof obj.url === "string" ? obj.url : "/api/placeholder/profile",
        key: typeof obj.key === "string" ? obj.key : "",
        isMain: obj.isMain === true,
        createdAt:
          createdAtVal instanceof Date
            ? createdAtVal
            : typeof createdAtVal === "string"
            ? new Date(createdAtVal)
            : new Date(),
        _id: typeof obj._id === "string" ? obj._id : undefined,
      };
    });
}

function ProfilePage() {
  const { logout } = useAuth();
  const router = useRouter();
  const { showNotification } = useNotification();
  type ProfileStats = {
    likes: number;
    matches: number;
    views: number;
    totalLikesReceived?: number;
    totalSuperLikesReceived?: number;
    totalMatches?: number;
    profileViews?: number;
    viewsToday?: number;
    totalLikes?: number;
    profileCompleteness?: number;
    profileScore?: number;
    profileBreakdown?: Record<string, number>;
    mutualInterests?: string[];
    mutualInterestsCount?: number;
  };

  interface Profile extends Omit<import("@/models/User").IUser, "stats"> {
    age?: number;
    stats: ProfileStats;
    blockedByYou?: boolean;
    blockedYou?: boolean;
  }

  // (parsePhotos moved above)

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [hardDelete, setHardDelete] = useState(false);
  const [dealBreakers, setDealBreakers] = useState({
    requireVerified: false,
    mustHaveInterests: "",
    excludeInterests: "",
    excludeSmoking: [] as string[],
    excludeMaritalStatuses: [] as string[],
    requireHasKids: null as boolean | null,
  });
  const [lifestyle, setLifestyle] = useState<{
    hasKids?: boolean;
    smoking?: "no" | "occasionally" | "yes" | undefined;
    maritalStatus?: "single" | "divorced" | "widowed" | "separated" | undefined;
  }>({});
  const [savingDealBreakers, setSavingDealBreakers] = useState(false);
  const [savingLifestyle, setSavingLifestyle] = useState(false);

  // Load current user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        const response = await userAPI.getProfile();
        if (
          !response ||
          typeof response !== "object" ||
          !("user" in response)
        ) {
          throw new Error("Invalid profile response");
        }
        const userData = (response as { user: typeof currentUser })
          .user as typeof currentUser;
        setCurrentUser(userData);
        if (userData) {
          const interestsRaw = (userData as { interests?: unknown }).interests;
          const interests = Array.isArray(interestsRaw)
            ? interestsRaw.filter((i): i is string => typeof i === "string")
            : [];
          const photosArr = parsePhotos(
            (userData as { photos?: unknown }).photos
          );
          setSelectedInterests(interests);
          setPhotos(photosArr as Photo[]);
        }
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
          coordinatesLng: Array.isArray(currentUser.location?.coordinates)
            ? (currentUser.location!.coordinates as [number, number])[0]
            : undefined,
          coordinatesLat: Array.isArray(currentUser.location?.coordinates)
            ? (currentUser.location!.coordinates as [number, number])[1]
            : undefined,
        },
        interests: currentUser.interests || [],
      };
      reset(formData);
      setSelectedInterests(formData.interests);
      // Hydrate lifestyle
      if (currentUser.lifestyle) {
        setLifestyle({
          hasKids: currentUser.lifestyle.hasKids,
          smoking: currentUser.lifestyle.smoking,
          maritalStatus: currentUser.lifestyle.maritalStatus,
        });
      }
      // Hydrate deal breakers
      const db = currentUser.preferences?.dealBreakers;
      if (db) {
        setDealBreakers({
          requireVerified: !!db.requireVerified,
          mustHaveInterests: (db.mustHaveInterests || []).join(", "),
          excludeInterests: (db.excludeInterests || []).join(", "),
          excludeSmoking: db.excludeSmoking || [],
          excludeMaritalStatuses: db.excludeMaritalStatuses || [],
          requireHasKids: db.requireHasKids ?? null,
        });
      }
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
          ...(typeof data.location.coordinatesLng === "number" &&
          typeof data.location.coordinatesLat === "number"
            ? {
                coordinates: [
                  Number(data.location.coordinatesLng),
                  Number(data.location.coordinatesLat),
                ] as [number, number],
              }
            : {}),
        },
        lifestyle: {
          // Send nulls for cleared fields so the API can delete them
          hasKids:
            typeof lifestyle.hasKids === "undefined" ? null : lifestyle.hasKids,
          smoking:
            typeof lifestyle.smoking === "undefined" ? null : lifestyle.smoking,
          maritalStatus:
            typeof lifestyle.maritalStatus === "undefined"
              ? null
              : lifestyle.maritalStatus,
        },
      };

      await userAPI.updateProfile(updateData);

      // Refresh user data
      const response = await userAPI.getProfile();
      if (response && typeof response === "object" && "user" in response) {
        setCurrentUser(
          (response as { user: typeof currentUser }).user as typeof currentUser
        );
      }

      showNotification("Profile updated successfully!", "success");
    } catch (error) {
      console.error("Failed to update profile:", error);
      showNotification("Failed to update profile. Please try again.", "error");
    }
  };

  const saveDealBreakers = async () => {
    try {
      setSavingDealBreakers(true);
      await userAPI.updateProfile({
        preferences: {
          ageRange: currentUser?.preferences?.ageRange || { min: 18, max: 60 },
          maxDistance: currentUser?.preferences?.maxDistance || 50,
          dealBreakers: {
            requireVerified: dealBreakers.requireVerified,
            mustHaveInterests: dealBreakers.mustHaveInterests
              .split(",")
              .map((i) => i.trim())
              .filter(Boolean),
            excludeInterests: dealBreakers.excludeInterests
              .split(",")
              .map((i) => i.trim())
              .filter(Boolean),
            excludeSmoking: dealBreakers.excludeSmoking,
            excludeMaritalStatuses: dealBreakers.excludeMaritalStatuses,
            requireHasKids: dealBreakers.requireHasKids,
          },
        },
      });
      const refreshed = await userAPI.getProfile();
      if (refreshed && typeof refreshed === "object" && "user" in refreshed) {
        setCurrentUser(
          (refreshed as { user: typeof currentUser }).user as typeof currentUser
        );
      }
      showNotification("Deal breakers saved", "success");
    } catch {
      showNotification("Failed to save deal breakers", "error");
    } finally {
      setSavingDealBreakers(false);
    }
  };

  const saveLifestyle = async () => {
    try {
      setSavingLifestyle(true);
      const updateResp = (await userAPI.updateProfile({
        lifestyle: {
          // Send nulls for cleared fields so the API can delete them
          hasKids:
            typeof lifestyle.hasKids === "undefined" ? null : lifestyle.hasKids,
          smoking:
            typeof lifestyle.smoking === "undefined" ? null : lifestyle.smoking,
          maritalStatus:
            typeof lifestyle.maritalStatus === "undefined"
              ? null
              : lifestyle.maritalStatus,
        },
      })) as unknown;
      // Prefer using the update response to avoid race conditions
      if (
        updateResp &&
        typeof updateResp === "object" &&
        "user" in updateResp
      ) {
        const u = (updateResp as { user: typeof currentUser })
          .user as typeof currentUser;
        setCurrentUser(u);
        if (u && u.lifestyle) {
          setLifestyle({
            hasKids: u.lifestyle.hasKids,
            smoking: u.lifestyle.smoking as typeof lifestyle.smoking,
            maritalStatus: u.lifestyle
              .maritalStatus as typeof lifestyle.maritalStatus,
          });
        }
      } else {
        // Fallback to fetching fresh profile if response didn't include user
        const refreshed = await userAPI.getProfile();
        if (refreshed && typeof refreshed === "object" && "user" in refreshed) {
          const u = (refreshed as { user: typeof currentUser })
            .user as typeof currentUser;
          setCurrentUser(u);
          if (u && u.lifestyle) {
            setLifestyle({
              hasKids: u.lifestyle.hasKids,
              smoking: u.lifestyle.smoking as typeof lifestyle.smoking,
              maritalStatus: u.lifestyle
                .maritalStatus as typeof lifestyle.maritalStatus,
            });
          }
        }
      }
      showNotification("Lifestyle saved", "success");
    } catch {
      showNotification("Failed to save lifestyle", "error");
    } finally {
      setSavingLifestyle(false);
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
              {currentUser?.firstName}&apos;s Profile
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
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-500">
                  {(currentUser?.stats?.totalLikesReceived ?? 0) +
                    (currentUser?.stats?.totalSuperLikesReceived ?? 0)}
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
                  {/* Calculate total views from stats or fallback to 0 */}
                  {typeof currentUser?.stats?.profileViews === "number"
                    ? currentUser.stats.profileViews
                    : 0}
                </div>
                <div className="text-sm text-gray-600">Total Views</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-500">
                  {/* Calculate views today from stats or fallback to 0 */}
                  {typeof currentUser?.stats?.viewsToday === "number"
                    ? currentUser.stats.viewsToday
                    : 0}
                </div>
                <div className="text-sm text-gray-600">Views Today</div>
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
                  <Image
                    src={photo.url || "/api/placeholder?width=200&height=300"}
                    alt={`Profile photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                    width={200}
                    height={300}
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
                        if (
                          response &&
                          typeof response === "object" &&
                          "user" in response
                        ) {
                          const u = (response as { user: typeof currentUser })
                            .user as typeof currentUser;
                          setCurrentUser(u);
                          if (u && typeof u === "object") {
                            setPhotos(
                              parsePhotos(
                                (u as { photos?: unknown }).photos
                              ) as Photo[]
                            );
                          }
                        }
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
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center cursor-pointer"
                    title="Delete Photo"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                  {/* Set main photo button */}
                  {!photo.isMain && (
                    <button
                      onClick={async () => {
                        try {
                          if (photo._id) {
                            await userAPI.setMainPhoto(photo._id);
                          }
                          // Refresh user data and photos
                          const response = await userAPI.getProfile();
                          if (
                            response &&
                            typeof response === "object" &&
                            "user" in response
                          ) {
                            const u = (response as { user: typeof currentUser })
                              .user as typeof currentUser;
                            setCurrentUser(u);
                            if (u && typeof u === "object") {
                              setPhotos(
                                parsePhotos(
                                  (u as { photos?: unknown }).photos
                                ) as Photo[]
                              );
                            }
                          }
                          showNotification("Main photo updated!", "success");
                        } catch (error) {
                          console.error("Set main photo failed:", error);
                          showNotification(
                            "Failed to set main photo. Please try again.",
                            "error"
                          );
                        }
                      }}
                      className="absolute bottom-2 left-2 bg-gray-800 text-white text-xs px-2 py-1 rounded cursor-pointer"
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
                          // Prevent video uploads
                          const validImages = Array.from(files).filter(
                            (f) => !f.type.startsWith("video/")
                          );
                          const hasVideo = Array.from(files).some((f) =>
                            f.type.startsWith("video/")
                          );
                          if (hasVideo) {
                            showNotification(
                              "Video uploads are not allowed. Please select image files only.",
                              "error"
                            );
                          }
                          if (validImages.length === 0) return;
                          setUploading(true);
                          try {
                            // Upload only valid image files
                            const dt = new DataTransfer();
                            validImages.forEach((file) => dt.items.add(file));
                            await userAPI.uploadPhotos(dt.files);
                            // Refresh user data and photos
                            const response = await userAPI.getProfile();
                            if (
                              response &&
                              typeof response === "object" &&
                              "user" in response
                            ) {
                              const u = (
                                response as { user: typeof currentUser }
                              ).user as typeof currentUser;
                              setCurrentUser(u);
                              if (u && typeof u === "object") {
                                setPhotos(
                                  parsePhotos(
                                    (u as { photos?: unknown }).photos
                                  ) as Photo[]
                                );
                              }
                            }
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
                  Location{" "}
                  <span className="text-gray-500">(City, Country)</span>
                </label>
                <input
                  {...register("location.city")}
                  type="text"
                  placeholder="e.g., Accra, Ghana"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                {errors.location?.city && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.location.city.message}
                  </p>
                )}
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Longitude (°)
                    </label>
                    <input
                      {...register("location.coordinatesLng", {
                        valueAsNumber: true,
                      })}
                      type="number"
                      step="any"
                      min={-180}
                      max={180}
                      placeholder="e.g., -0.1276"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    {errors.location?.coordinatesLng && (
                      <p className="text-red-500 text-sm mt-1">
                        {
                          errors.location.coordinatesLng
                            .message as unknown as string
                        }
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Latitude (°)
                    </label>
                    <input
                      {...register("location.coordinatesLat", {
                        valueAsNumber: true,
                      })}
                      type="number"
                      step="any"
                      min={-90}
                      max={90}
                      placeholder="e.g., 5.6037"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    {errors.location?.coordinatesLat && (
                      <p className="text-red-500 text-sm mt-1">
                        {
                          errors.location.coordinatesLat
                            .message as unknown as string
                        }
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter coordinates to find people near you. Order is Longitude,
                  Latitude. Example (New York): -74.0060, 40.7128
                </p>
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

          {/* Lifestyle */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Lifestyle</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setLifestyle({
                      hasKids: undefined,
                      smoking: undefined,
                      maritalStatus: undefined,
                    })
                  }
                  disabled={savingLifestyle}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={saveLifestyle}
                  disabled={savingLifestyle}
                  className="px-3 py-1.5 text-xs rounded-md bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40"
                >
                  {savingLifestyle ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Smoking
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    ["no", "occasionally", "yes"] as (
                      | "no"
                      | "occasionally"
                      | "yes"
                    )[]
                  ).map((s) => {
                    const active = lifestyle.smoking === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setLifestyle((ls) => ({ ...ls, smoking: s }))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                          active
                            ? "bg-pink-500 border-pink-500 text-white"
                            : "border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {s === "no"
                          ? "Non-smoker"
                          : s === "yes"
                          ? "Smoker"
                          : "Occasional"}
                      </button>
                    );
                  })}
                  {lifestyle.smoking && (
                    <button
                      type="button"
                      onClick={() =>
                        setLifestyle((ls) => ({ ...ls, smoking: undefined }))
                      }
                      className="px-2 py-1.5 rounded-full text-xs border border-gray-300 text-gray-500 hover:bg-gray-100"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Marital Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    ["single", "divorced", "widowed", "separated"] as (
                      | "single"
                      | "divorced"
                      | "widowed"
                      | "separated"
                    )[]
                  ).map((m) => {
                    const active = lifestyle.maritalStatus === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setLifestyle((ls) => ({ ...ls, maritalStatus: m }))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                          active
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                  {lifestyle.maritalStatus && (
                    <button
                      type="button"
                      onClick={() =>
                        setLifestyle((ls) => ({
                          ...ls,
                          maritalStatus: undefined,
                        }))
                      }
                      className="px-2 py-1.5 rounded-full text-xs border border-gray-300 text-gray-500 hover:bg-gray-100"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Has Kids
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Not Set", val: undefined },
                    { label: "Yes", val: true },
                    { label: "No", val: false },
                  ].map((opt) => {
                    const active = lifestyle.hasKids === opt.val;
                    return (
                      <button
                        key={String(opt.val)}
                        type="button"
                        onClick={() =>
                          setLifestyle((ls) => ({ ...ls, hasKids: opt.val }))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                          active
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Deal Breakers */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Deal Breakers
              </h2>
              <button
                type="button"
                onClick={saveDealBreakers}
                disabled={savingDealBreakers}
                className="px-3 py-2 text-xs rounded-md bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-40"
              >
                {savingDealBreakers ? "Saving..." : "Save"}
              </button>
            </div>
            <div className="space-y-5 text-xs">
              <label className="flex items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  checked={dealBreakers.requireVerified}
                  onChange={(e) =>
                    setDealBreakers((db) => ({
                      ...db,
                      requireVerified: e.target.checked,
                    }))
                  }
                  className="rounded text-pink-500 border-gray-300 focus:ring-pink-500"
                />
                Require verified profiles
              </label>
              <div>
                <div className="flex justify-between mb-1 font-medium text-gray-700">
                  Must Have ALL Interests
                  <button
                    type="button"
                    onClick={() =>
                      setDealBreakers((db) => ({
                        ...db,
                        mustHaveInterests: "",
                      }))
                    }
                    className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                  >
                    Clear
                  </button>
                </div>
                <input
                  type="text"
                  value={dealBreakers.mustHaveInterests}
                  onChange={(e) =>
                    setDealBreakers((db) => ({
                      ...db,
                      mustHaveInterests: e.target.value,
                    }))
                  }
                  placeholder="e.g. Hiking, Cooking"
                  className="w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1 font-medium text-gray-700">
                  Exclude ANY Interests
                  <button
                    type="button"
                    onClick={() =>
                      setDealBreakers((db) => ({ ...db, excludeInterests: "" }))
                    }
                    className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                  >
                    Clear
                  </button>
                </div>
                <input
                  type="text"
                  value={dealBreakers.excludeInterests}
                  onChange={(e) =>
                    setDealBreakers((db) => ({
                      ...db,
                      excludeInterests: e.target.value,
                    }))
                  }
                  placeholder="e.g. Smoking, Gambling"
                  className="w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1 font-medium text-gray-700">
                  Exclude Smoking
                  <button
                    type="button"
                    onClick={() =>
                      setDealBreakers((db) => ({ ...db, excludeSmoking: [] }))
                    }
                    className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["no", "occasionally", "yes"].map((s) => {
                    const active = dealBreakers.excludeSmoking.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setDealBreakers((db) => ({
                            ...db,
                            excludeSmoking: active
                              ? db.excludeSmoking.filter((x) => x !== s)
                              : [...db.excludeSmoking, s],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium border ${
                          active
                            ? "bg-rose-500 border-rose-500 text-white"
                            : "border-gray-300 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {s === "no"
                          ? "Non-smoker"
                          : s === "yes"
                          ? "Smoker"
                          : "Occasional"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1 font-medium text-gray-700">
                  Exclude Marital Status
                  <button
                    type="button"
                    onClick={() =>
                      setDealBreakers((db) => ({
                        ...db,
                        excludeMaritalStatuses: [],
                      }))
                    }
                    className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["single", "divorced", "widowed", "separated"].map((m) => {
                    const active =
                      dealBreakers.excludeMaritalStatuses.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setDealBreakers((db) => ({
                            ...db,
                            excludeMaritalStatuses: active
                              ? db.excludeMaritalStatuses.filter((x) => x !== m)
                              : [...db.excludeMaritalStatuses, m],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium border ${
                          active
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "border-gray-300 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1 font-medium text-gray-700">
                  Has Kids Preference
                  <button
                    type="button"
                    onClick={() =>
                      setDealBreakers((db) => ({ ...db, requireHasKids: null }))
                    }
                    className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                  >
                    Any
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Any", val: null },
                    { label: "Must Have", val: true },
                    { label: "Must Not Have", val: false },
                  ].map((opt) => {
                    const active = dealBreakers.requireHasKids === opt.val;
                    return (
                      <button
                        key={String(opt.val)}
                        type="button"
                        onClick={() =>
                          setDealBreakers((db) => ({
                            ...db,
                            requireHasKids: opt.val,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium border ${
                          active
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-gray-300 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
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
                      Are you sure you want to delete your account?
                      <br />
                      You can either deactivate your account (soft delete) so
                      your profile no longer appears anywhere, or permanently
                      delete it. Permanent deletion cannot be undone and will
                      remove your messages, matches, likes, and other related
                      data.
                    </p>
                    <div className="mb-4">
                      <label className="flex items-center space-x-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={hardDelete}
                          onChange={(e) => setHardDelete(e.target.checked)}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span>
                          Permanently delete my account (cannot be undone)
                        </span>
                      </label>
                      <p className="mt-2 text-xs text-gray-500">
                        If unchecked, your account will be deactivated. You can
                        contact support later to request permanent deletion.
                      </p>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type your first name to confirm
                      </label>
                      <input
                        type="text"
                        value={confirmDeleteName}
                        onChange={(e) => setConfirmDeleteName(e.target.value)}
                        placeholder="Enter your first name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                      />
                    </div>
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
                            setDeleteSubmitting(true);
                            const resp = await fetch("/api/user/delete", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${localStorage.getItem(
                                  "fiorell_auth_token"
                                )}`,
                              },
                              body: JSON.stringify({
                                confirmName: confirmDeleteName,
                                hardDelete,
                              }),
                            });
                            const data = await resp.json();
                            if (!resp.ok)
                              throw new Error(
                                data.error || "Failed to delete account"
                              );
                            showNotification(
                              hardDelete
                                ? "Account permanently deleted. Logging out."
                                : "Account deactivated. You will be logged out.",
                              "success"
                            );
                            // Log out and redirect
                            await fetch("/api/auth/logout", { method: "POST" });
                            logout();
                            setShowDeleteConfirm(false);
                          } catch (e: unknown) {
                            const msg =
                              typeof e === "object" && e && "message" in e
                                ? (e as { message: string }).message
                                : String(e);
                            showNotification(
                              msg ||
                                "Failed to delete account. Please try again.",
                              "error"
                            );
                          } finally {
                            setDeleteSubmitting(false);
                          }
                        }}
                        disabled={
                          deleteSubmitting ||
                          !currentUser?.firstName ||
                          currentUser.firstName.trim().toLowerCase() !==
                            confirmDeleteName.trim().toLowerCase()
                        }
                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deleteSubmitting
                          ? "Processing..."
                          : hardDelete
                          ? "Delete Permanently"
                          : "Deactivate Account"}
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

export default withAuth(ProfilePage);
