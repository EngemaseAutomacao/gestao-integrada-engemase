import { useCallback, useEffect, useState } from "react";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn("Notifications not supported");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        setIsSubscribed(true);
      }
      
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    return requestPermission();
  }, [requestPermission]);

  const unsubscribe = useCallback(async () => {
    setIsSubscribed(false);
    return true;
  }, []);

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
    subscribe,
    unsubscribe,
    requestPermission,
    showPushNotification,
  };
}
