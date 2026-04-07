import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Volume2, VolumeX, ArrowRightLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Notification {
  id: string;
  type: "overdue" | "low_stock" | "return_reminder";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("notification-sound") !== "disabled";
  });
  
  const { playNotificationSound } = useNotificationSound();
  const { permission, isSupported, isSubscribed, subscribe, unsubscribe, requestPermission, showPushNotification } = usePushNotifications();
  const previousNotificationIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  // Auto-subscribe if permission already granted but not subscribed
  useEffect(() => {
    if (isSupported && permission === "granted" && !isSubscribed && user) {
      subscribe();
    }
  }, [isSupported, permission, isSubscribed, user, subscribe]);

  const handleNewNotification = useCallback((notification: Notification) => {
    // Show toast popup
    toast(notification.title, {
      description: notification.message,
      duration: 5000,
      action: {
        label: "Ver",
        onClick: () => setOpen(true),
      },
    });

    // Play sound if enabled
    if (soundEnabled) {
      playNotificationSound();
    }

    // Show push notification if permitted
    if (permission === "granted") {
      showPushNotification(notification.title, {
        body: notification.message,
        tag: notification.id,
      });
    }
  }, [soundEnabled, playNotificationSound, permission, showPushNotification]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Subscribe to new notifications
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            
            // Add to list
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Trigger popup, sound, and push
            handleNewNotification(newNotification);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, handleNewNotification]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const notificationData = (data as Notification[]) || [];
      setNotifications(notificationData);
      setUnreadCount(notificationData.filter(n => !n.read).length);
      
      // Store initial IDs to detect new ones
      if (isInitialLoad.current) {
        previousNotificationIds.current = new Set(notificationData.map(n => n.id));
        isInitialLoad.current = false;
      }
    } catch (error: any) {
      console.error("Error loading notifications:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      toast.error("Erro ao marcar notificação", {
        description: error.message,
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("Todas as notificações foram marcadas como lidas");
    } catch (error: any) {
      toast.error("Erro ao marcar notificações", {
        description: error.message,
      });
    }
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem("notification-sound", newValue ? "enabled" : "disabled");
    toast.success(newValue ? "Som de notificação ativado" : "Som de notificação desativado");
  };

  const handleEnablePush = async () => {
    const success = await subscribe();
    if (success) {
      toast.success("Notificações push ativadas e registradas!");
    } else {
      toast.error("Erro ao ativar notificações push. Verifique a permissão do navegador.");
    }
  };

  const sendTestNotification = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title: "🔔 Notificação de Teste",
          body: "Esta é uma notificação de teste para verificar se o sistema está funcionando corretamente.",
          type: "return_reminder",
        },
      });

      if (error) throw error;

      setOpen(false);

      const sentCount = data?.sentCount || 0;
      const subscriptionsCount = data?.subscriptionsCount || 0;

      if (subscriptionsCount === 0) {
        toast.error("Nenhum dispositivo inscrito para push", {
          description: "Ative as notificações push neste aparelho para validar o envio.",
        });
        return;
      }

      if (sentCount === 0) {
        toast.error("Push não foi entregue", {
          description: "A notificação foi salva, mas o push falhou em todos os dispositivos inscritos.",
        });
        return;
      }

      toast.success("Notificação de teste enviada!", {
        description: `Push entregue em ${sentCount} de ${subscriptionsCount} dispositivo(s).`,
      });
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      toast.error("Erro ao enviar notificação de teste", {
        description: error.message || "Não foi possível validar o push agora.",
      });
    }
  };

  const isTransferNotification = (type: string) =>
    type.startsWith("transfer_");

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "overdue":
        return "text-destructive";
      case "low_stock":
        return "text-orange-500";
      case "return_reminder":
        return "text-primary";
      case "transfer_request":
      case "transfer_accepted":
      case "transfer_approved":
      case "transfer_rejected":
        return "text-primary";
      default:
        return "";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) markAsRead(notification.id);
    if (isTransferNotification(notification.type)) {
      setOpen(false);
      navigate("/transferencias");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 bg-popover border shadow-lg z-50" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificações</h3>
            <div className="flex items-center gap-1">
              {/* Sound toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleSound}
                  >
                    {soundEnabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {soundEnabled ? "Desativar som" : "Ativar som"}
                </TooltipContent>
              </Tooltip>

              {/* Push notification toggle */}
              {isSupported && permission !== "granted" && !isSubscribed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEnablePush}
                  className="text-xs"
                >
                  Ativar push
                </Button>
              )}

              {/* Test notification button - only for admins */}
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={sendTestNotification}
                      className="text-xs"
                    >
                      Testar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Enviar notificação de teste
                  </TooltipContent>
                </Tooltip>
              )}

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Marcar lidas
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhuma notificação
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      notification.read
                        ? "bg-background"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`font-semibold text-sm ${getNotificationColor(
                            notification.type
                          )}`}
                        >
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <Badge
                            variant="default"
                            className="h-2 w-2 p-0 rounded-full"
                          />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(notification.created_at),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
