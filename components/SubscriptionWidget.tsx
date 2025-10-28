import React, { useState, useEffect } from "react";
import { Crown, Calendar, Settings, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface SubscriptionWidgetProps {
  compact?: boolean;
  showManageButton?: boolean;
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  subscriptionType: "traditional" | "crypto" | null;
  planType?: string;
  daysRemaining?: number;
  expiresAt?: string;
  isExpiringSoon?: boolean;
}

export default function SubscriptionWidget({ 
  compact = false, 
  showManageButton = true 
}: SubscriptionWidgetProps) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      const response = await fetch("/api/subscription/comprehensive", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        
        const status: SubscriptionStatus = {
          hasSubscription: data.hasSubscription,
          subscriptionType: data.subscriptionType,
        };

        if (data.traditionalSubscription?.isActive) {
          status.planType = data.traditionalSubscription.planId;
          status.daysRemaining = data.traditionalSubscription.daysRemaining;
          status.isExpiringSoon = data.traditionalSubscription.daysRemaining <= 7;
        } else if (data.cryptoSubscription?.isActive) {
          status.planType = data.cryptoSubscription.planType;
          status.daysRemaining = data.cryptoSubscription.daysRemaining;
          status.expiresAt = data.cryptoSubscription.expiresAt;
          status.isExpiringSoon = data.cryptoSubscription.daysRemaining <= 7;
        }

        setSubscriptionStatus(status);
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={`p-4 ${compact ? "bg-gray-50" : ""}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  if (!subscriptionStatus) {
    return null;
  }

  const getStatusColor = () => {
    if (!subscriptionStatus.hasSubscription) return "text-gray-600";
    if (subscriptionStatus.isExpiringSoon) return "text-orange-600";
    return "text-green-600";
  };

  const getStatusIcon = () => {
    if (!subscriptionStatus.hasSubscription) return <AlertCircle className="w-5 h-5 text-gray-500" />;
    if (subscriptionStatus.isExpiringSoon) return <Calendar className="w-5 h-5 text-orange-500" />;
    return <Crown className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (!subscriptionStatus.hasSubscription) {
      return "Free Plan";
    }
    
    const planName = subscriptionStatus.planType === "premium_plus" ? "Premium Plus" : "Premium";
    const paymentMethod = subscriptionStatus.subscriptionType === "crypto" ? "(Crypto)" : "(Traditional)";
    
    if (subscriptionStatus.isExpiringSoon) {
      return `${planName} ${paymentMethod} - Expires in ${subscriptionStatus.daysRemaining} days`;
    }
    
    return `${planName} ${paymentMethod} - ${subscriptionStatus.daysRemaining} days remaining`;
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <p className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </div>
        {showManageButton && (
          <Button
            onClick={() => router.push("/subscription/manage-comprehensive")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
          >
            Manage
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Subscription Status
            </h3>
            <p className={`text-sm ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </div>
      </div>

      {subscriptionStatus.isExpiringSoon && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-800">
              <strong>Renewal Reminder:</strong> Your subscription expires soon. 
              Renew now to continue enjoying premium features.
            </div>
          </div>
        </div>
      )}

      {!subscriptionStatus.hasSubscription && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>Upgrade to Premium:</strong> Unlock unlimited matches, advanced filters, 
            and more features to enhance your dating experience.
          </div>
        </div>
      )}

      {showManageButton && (
        <div className="flex space-x-3">
          <Button
            onClick={() => router.push("/subscription/manage-comprehensive")}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage Subscription
          </Button>
          
          {!subscriptionStatus.hasSubscription && (
            <Button
              onClick={() => router.push("/subscription")}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}