"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SubscriptionPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to crypto subscription page by default
    router.replace("/subscription/crypto");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to payment options...</p>
      </div>
    </div>
  );
}