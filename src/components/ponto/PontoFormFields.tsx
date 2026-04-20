import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, User, CheckCircle } from "lucide-react";
import { ConstructionSiteAutocomplete } from "@/components/ConstructionSiteAutocomplete";
import { PhotoCapture } from "@/components/PhotoCapture";

interface ConstructionSiteWithCoords {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ClientOption {
  id: string;
  name: string;
}

const ENTRY_TYPES = [
  { value: "obra", label: "Por Obra", disabled: false },
  { value: "cliente", label: "Por Cliente", disabled: false },
  { value: "tecnico", label: "Por Técnico (Em breve)", disabled: true },
  { value: "relatorio", label: "Relatório (Em breve)", disabled: true },
  { value: "interno", label: "Uso Interno", disabled: false },
];

const GEOFENCE_RADIUS_METERS = 500;

interface PontoFormFieldsProps {
  entryType: string;
  onEntryTypeChange: (v: string) => void;
  constructionSite: string;
  onConstructionSiteChange: (v: string) => void;
  clientName: string;
  onClientNameChange: (v: string) => void;
  sites: ConstructionSiteWithCoords[];
  clients: ClientOption[];
  notes: string;
  onNotesChange: (v: string) => void;
  photoDataUrl: string | null;
  photoConfirmed: boolean;
  onPhotoCapture: (dataUrl: string) => void;
  onPhotoReset: () => void;
  photoTitle: string;
  showEntryType?: boolean;
  hideContextFields?: boolean;
}

export function PontoFormFields({
  entryType,
  onEntryTypeChange,
  constructionSite,
  onConstructionSiteChange,
  clientName,
  onClientNameChange,
  sites,
  clients,
  notes,
  onNotesChange,
  photoDataUrl,
  photoConfirmed,
  onPhotoCapture,
  onPhotoReset,
  photoTitle,
  showEntryType = true,
  hideContextFields = false,
}: PontoFormFieldsProps) {
  return (
    <>
      {showEntryType && !hideContextFields && (
        <div className="space-y-2">
          <Label>Tipo de Registro *</Label>
          <Select value={entryType} onValueChange={(v) => { onEntryTypeChange(v); onConstructionSiteChange(""); onClientNameChange(""); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTRY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} disabled={t.disabled}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {entryType === "obra" && !hideContextFields && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Obra de Destino *
          </Label>
          <ConstructionSiteAutocomplete
            sites={sites}
            value={constructionSite}
            onChange={onConstructionSiteChange}
            placeholder="Selecione a obra..."
          />
          {constructionSite && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Localização será comparada com a obra (raio de {GEOFENCE_RADIUS_METERS}m)
            </p>
          )}
        </div>
      )}

      {entryType === "cliente" && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Cliente *
          </Label>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado. Peça ao administrador para cadastrar.</p>
          ) : (
            <Select value={clientName} onValueChange={onClientNameChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Photo Capture - MANDATORY */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Foto de Registro *</Label>
          {photoConfirmed && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="w-3 h-3" />Capturada
            </Badge>
          )}
        </div>
        {!photoConfirmed ? (
          <PhotoCapture onCapture={onPhotoCapture} title={photoTitle} />
        ) : (
          <div className="relative">
            <img src={photoDataUrl!} alt="Foto capturada" className="w-full h-48 object-cover rounded-lg" />
            <Button type="button" variant="outline" size="sm" className="absolute top-2 right-2" onClick={onPhotoReset}>
              Refazer
            </Button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Observações (opcional)</label>
        <Textarea placeholder="Ex: Visita técnica na obra X..." value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={3} />
      </div>
    </>
  );
}
