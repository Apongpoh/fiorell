"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to privacy settings by default
    router.replace("/settings/privacy");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Redirecting to settings...</span>
      </div>
    </div>
  );
}