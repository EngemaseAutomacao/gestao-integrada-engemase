import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
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

interface Notification {
  id: string;
  type: "overdue" | "low_stock" | "return_reminder";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

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
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications((data as Notification[]) || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
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

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "overdue":
        return "text-destructive";
      case "low_stock":
        return "text-warning";
      case "return_reminder":
        return "text-primary";
      default:
        return "";
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
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificações</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                Marcar todas como lidas
              </Button>
            )}
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