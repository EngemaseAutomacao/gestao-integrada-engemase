import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle } from "lucide-react";
import { PhotoCapture } from "@/components/PhotoCapture";

const ENTRY_TYPES = [
  { value: "interno", label: "Uso Interno", disabled: false },
];

interface PontoFormFieldsProps {
  entryType: string;
  onEntryTypeChange: (v: string) => void;
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
          <Select value={entryType} onValueChange={onEntryTypeChange}>
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

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Observações (opcional)</label>
        <Textarea placeholder="Ex: Registro de atividade interna..." value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={3} />
      </div>

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
    </>
  );
}
