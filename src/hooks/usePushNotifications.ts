import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// VAPID public key from environment - this is safe to expose in frontend
const VAPID_PUBLIC_KEY = "BPWmnkrLExvOSYROSkyfPjumwQ5XK2jpJek7-A6z-IYDtCAXEVJNQ6i4-dd-DwJmaCIYk0GVRUmT_iITyo8pJB0";

// Helper to access pushManager with proper typing
const getPushManager = (reg: ServiceWorkerRegistration) => (reg as any).pushManager;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications and push
    const supported = "Notification" in window && 
                      "serviceWorker" in navigator && 
                      "PushManager" in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, [user]);

  const checkExistingSubscription = useCallback(async () => {
    if (!user) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await getPushManager(registration).getSubscription();
      
      if (subscription) {
        // Verify it exists in database
        const { data } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint)
          .maybeSingle();
        
        setIsSubscribed(!!data);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  }, [user]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn("Push notifications not supported");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!user) {
      console.warn("User must be logged in to subscribe");
      return false;
    }

    if (!isSupported) {
      console.warn("Push notifications not supported");
      return false;
    }

    setIsLoading(true);

    try {
      // First request permission
      const permissionGranted = await requestPermission();
      if (!permissionGranted) {
        setIsLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await getPushManager(registration).getSubscription();

      // If no subscription, create one
      if (!subscription) {
        subscription = await getPushManager(registration).subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Extract keys from subscription
      const subscriptionJson = subscription.toJSON();
      const p256dh = subscriptionJson.keys?.p256dh || "";
      const auth = subscriptionJson.keys?.auth || "";

      // Store in database
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,endpoint",
        });

      if (error) {
        console.error("Error storing subscription:", error);
        throw error;
      }

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      setIsLoading(false);
      return false;
    }
  }, [user, isSupported, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await getPushManager(registration).getSubscription();

      if (subscription) {
        // Remove from database
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);

        // Unsubscribe from push
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Error unsubscribing:", error);
      setIsLoading(false);
      return false;
    }
  }, [user]);

  const showPushNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== "granted") {
        return null;
      }

      try {
        // Try to use Service Worker notification (works in background)
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              requireInteraction: false,
              ...options,
            });
          });
          return null;
        }

        // Fallback to regular notification
        const notification = new Notification(title, {
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          requireInteraction: false,
          ...options,
        });

        setTimeout(() => notification.close(), 5000);

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return notification;
      } catch (error) {
        console.error("Error showing notification:", error);
        return null;
      }
    },
    [isSupported, permission]
  );

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    requestPermission,
    showPushNotification,
  };
}
