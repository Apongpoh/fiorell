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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<any>;
  signup: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
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

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(credentials as any);

      // Check if 2FA is required
      if (
        response &&
        typeof response === "object" &&
        "requiresTwoFA" in response &&
        (response as { requiresTwoFA?: boolean }).requiresTwoFA
      ) {
        setIsLoading(false);
        return response; // Return 2FA response
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
      return response;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const signup = async (userData: any) => {
    setIsLoading(true);
    try {
      await authAPI.signup(userData as any);
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

  const updateUser = async (userData: Partial<User>) => {
    try {
      const response = await userAPI.updateProfile(userData as any);
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
