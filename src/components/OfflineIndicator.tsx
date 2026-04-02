import { useOffline } from "@/contexts/OfflineContext";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function OfflineIndicator() {
  const { isOnline, pendingOperations, syncPendingOperations } = useOffline();

  if (isOnline && pendingOperations.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-orange-500" />
          )}
          {pendingOperations.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5">
              {pendingOperations.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Online</p>
                  <p className="text-xs text-muted-foreground">
                    Conectado à internet
                  </p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium">Modo Offline</p>
                  <p className="text-xs text-muted-foreground">
                    Suas operações serão sincronizadas quando reconectar
                  </p>
                </div>
              </>
            )}
          </div>

          {pendingOperations.length > 0 && (
            <>
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Operações Pendentes ({pendingOperations.length})
                  </p>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {pendingOperations.map((op) => (
                    <li key={op.id} className="flex items-start gap-2">
                      <span className="inline-block w-2 h-2 mt-1 rounded-full bg-orange-500" />
                      <span>
                        {op.type === "checkout" && "Retirada de ferramenta"}
                        {op.type === "checkin" && "Devolução de ferramenta"}
                        {op.type === "issue" && "Relato de problema"}
                        {op.type === "ponto_in" && "Registro de entrada (ponto)"}
                        {op.type === "ponto_out" && "Registro de saída (ponto)"}
                        {op.type === "vehicle_checkout" && "Saída de veículo"}
                        {op.type === "vehicle_checkin" && "Chegada de veículo"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {isOnline && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={syncPendingOperations}
                >
                  Sincronizar Agora
                </Button>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
