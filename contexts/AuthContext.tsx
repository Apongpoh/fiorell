"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authAPI, userAPI } from "@/lib/api";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  bio?: string;
  location: {
    city: string;
    coordinates?: [number, number];
  };
  interests: string[];
  photos: Array<{
    id: string;
    url: string;
    isMain: boolean;
  }>;
  preferences: {
    ageRange: { min: number; max: number };
    maxDistance: number;
    genderPreference?: string;
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
    height?: number;
  };
  privacy: {
    showAge: boolean;
    showDistance: boolean;
    showOnline: boolean;
  };
  verification: {
    isVerified: boolean;
    verifiedAt?: string;
  };
  subscription: {
    type: "free" | "premium" | "plus";
    expiresAt?: string;
  };
  stats: {
    likes: number;
    matches: number;
    profileViews: number;
  };
  isAdmin?: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  gender: string;
  location: string;
}

interface LoginResponse {
  token?: string;
  requiresTwoFA?: boolean;
  tempUserId?: string;
  expiresAt?: Date | string;
}

interface UpdateUserData {
  bio?: string;
  interests?: string[];
  preferences?: {
    ageRange: { min: number; max: number };
    maxDistance: number;
    genderPreference?: string;
    dealBreakers?: {
      requireVerified?: boolean;
      mustHaveInterests?: string[];
      excludeInterests?: string[];
      excludeSmoking?: string[];
      excludeMaritalStatuses?: string[];
      requireHasKids?: boolean | null;
    };
  };
  location?: {
    city: string;
    coordinates?: [number, number];
  };
  lifestyle?: {
    hasKids?: boolean | null;
    smoking?: "no" | "occasionally" | "yes" | null;
    drinking?: "never" | "socially" | "regularly" | null;
    exercise?: "never" | "sometimes" | "regularly" | "daily" | null;
    diet?: "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "other" | null;
    maritalStatus?: "single" | "divorced" | "widowed" | "separated" | null;
  };
  education?: {
    level?: "high_school" | "bachelor" | "master" | "phd" | "other" | null;
    field?: string | null;
  };
  physicalAttributes?: {
    height?: number | null;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  signup: (userData: SignupData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: UpdateUserData) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && authAPI.isAuthenticated();

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (authAPI.isAuthenticated()) {
        try {
          const userData = await userAPI.getProfile();
          if (
            userData &&
            typeof userData === "object" &&
            "user" in userData &&
            (userData as { user: unknown }).user &&
            typeof (userData as { user: unknown }).user === "object"
          ) {
            setUser((userData as { user: User }).user);
          }
        } catch (error) {
          console.error("Failed to load user:", error);
          authAPI.logout();
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(credentials);

      // Check if 2FA is required
      if (
        response &&
        typeof response === "object" &&
        "requiresTwoFA" in response &&
        (response as { requiresTwoFA?: boolean }).requiresTwoFA
      ) {
        setIsLoading(false);
        const twoFAResponse: LoginResponse = { requiresTwoFA: true };
        
        // Include tempUserId and expiresAt if present
        if ("tempUserId" in response && (response as { tempUserId?: unknown }).tempUserId) {
          twoFAResponse.tempUserId = (response as { tempUserId: string }).tempUserId;
        }
        if ("expiresAt" in response && (response as { expiresAt?: unknown }).expiresAt) {
          twoFAResponse.expiresAt = (response as { expiresAt: Date | string }).expiresAt;
        }
        
        return twoFAResponse;
      }

      // Normal login - set user
      if (
        response &&
        typeof response === "object" &&
        "user" in response &&
        (response as { user: unknown }).user &&
        typeof (response as { user: unknown }).user === "object"
      ) {
        setUser((response as { user: User }).user);
      }
      setIsLoading(false);
      
      // Return token if present
      if (
        response &&
        typeof response === "object" &&
        "token" in response &&
        typeof (response as { token?: unknown }).token === "string"
      ) {
        return { token: (response as { token: string }).token };
      }
      
      return {};
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const signup = async (userData: SignupData): Promise<void> => {
    setIsLoading(true);
    try {
      await authAPI.signup(userData);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    authAPI.logout();
  };

  const updateUser = async (userData: UpdateUserData): Promise<void> => {
    try {
      const response = await userAPI.updateProfile(userData);
      if (
        response &&
        typeof response === "object" &&
        "user" in response &&
        (response as { user: unknown }).user &&
        typeof (response as { user: unknown }).user === "object"
      ) {
        setUser((response as { user: User }).user);
      }
    } catch (error) {
      console.error("Failed to update user:", error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (authAPI.isAuthenticated()) {
      try {
        const userData = await userAPI.getProfile();
        if (
          userData &&
          typeof userData === "object" &&
          "user" in userData &&
          (userData as { user: unknown }).user &&
          typeof (userData as { user: unknown }).user === "object"
        ) {
          setUser((userData as { user: User }).user);
        }
      } catch (error) {
        console.error("Failed to refresh user:", error);
        throw error;
      }
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        window.location.href = "/login";
      }
    }, [isAuthenticated, isLoading]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
};
