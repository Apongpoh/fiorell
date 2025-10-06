"use client";

import { usePathname, useRouter } from "next/navigation";
import { Users, Heart, MessageCircle, User } from "lucide-react";

interface BottomNavProps {
  unreadMessages?: number;
}

const NAV_HEIGHT = 64; // px (py-3 + icon area)

export function getNavSpacerClass() {
  return `pb-[${NAV_HEIGHT}px]`;
}

export default function BottomNav({ unreadMessages = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const hide = /^\/chat\/[A-Za-z0-9]/.test(pathname || "");
  const isActive = (base: string) => pathname === base;

  if (hide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-40">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className={`flex flex-col items-center space-y-1 transition-colors ${
            isActive("/dashboard")
              ? "text-pink-500"
              : "text-gray-400 hover:text-pink-500"
          }`}
        >
          <Users className="h-6 w-6" />
          <span className="text-xs">Discover</span>
        </button>
        <button
          onClick={() => router.push("/matches")}
          className={`flex flex-col items-center space-y-1 transition-colors ${
            isActive("/matches")
              ? "text-pink-500"
              : "text-gray-400 hover:text-pink-500"
          }`}
        >
          <Heart className="h-6 w-6" />
          <span className="text-xs">Matches</span>
        </button>
        <button
          onClick={() => router.push("/chat")}
          className={`relative flex flex-col items-center space-y-1 transition-colors ${
            isActive("/chat")
              ? "text-pink-500"
              : "text-gray-400 hover:text-pink-500"
          }`}
        >
          <MessageCircle className="h-6 w-6" />
          <span className="text-xs">Messages</span>
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-2 bg-pink-500 text-white text-[10px] px-1.5 py-[2px] rounded-full font-semibold">
              {unreadMessages > 99 ? "99+" : unreadMessages}
            </span>
          )}
        </button>
        <button
          onClick={() => router.push("/profile")}
          className={`flex flex-col items-center space-y-1 transition-colors ${
            isActive("/profile")
              ? "text-pink-500"
              : "text-gray-400 hover:text-pink-500"
          }`}
        >
          <User className="h-6 w-6" />
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </nav>
  );
}
