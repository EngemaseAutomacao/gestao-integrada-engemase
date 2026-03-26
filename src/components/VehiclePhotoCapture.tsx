import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PhotoAngle {
  key: string;
  label: string;
}

const BASE_ANGLES: PhotoAngle[] = [
  { key: "front", label: "Frente" },
  { key: "back", label: "Traseira" },
  { key: "left", label: "Lado Esquerdo" },
  { key: "right", label: "Lado Direito" },
];

const DASHBOARD_ANGLE: PhotoAngle = { key: "dashboard", label: "Painel do Veículo" };

interface VehiclePhotoCaptureProps {
  photos: Record<string, File | null>;
  previews: Record<string, string | null>;
  onPhotoChange: (key: string, file: File | null, preview: string | null) => void;
  includeDashboard?: boolean;
}

export default function VehiclePhotoCapture({ photos, previews, onPhotoChange, includeDashboard = false }: VehiclePhotoCaptureProps) {
  const ANGLES = includeDashboard ? [...BASE_ANGLES, DASHBOARD_ANGLE] : BASE_ANGLES;
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onPhotoChange(key, file, reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const allCaptured = ANGLES.every((a) => previews[a.key]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Fotos do Veículo ({includeDashboard ? "4 ângulos + painel" : "4 ângulos"}) *</Label>
        {allCaptured && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <Check className="w-4 h-4" /> Todas capturadas
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ANGLES.map((angle) => (
          <div key={angle.key} className="space-y-1">
            <Label className="text-sm">{angle.label}</Label>
            <input
              ref={(el) => { inputRefs.current[angle.key] = el; }}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileChange(angle.key, e)}
            />
            {previews[angle.key] ? (
              <div className="relative">
                <img
                  src={previews[angle.key]!}
                  alt={angle.label}
                  className="w-full h-28 object-cover rounded-lg border cursor-pointer"
                  onClick={() => setEnlargedImage(previews[angle.key]!)}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={() => {
                    onPhotoChange(angle.key, null, null);
                    if (inputRefs.current[angle.key]) inputRefs.current[angle.key]!.value = "";
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-28 flex flex-col gap-1 border-dashed"
                onClick={() => inputRefs.current[angle.key]?.click()}
              >
                <Camera className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Tirar foto</span>
              </Button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto do veículo</DialogTitle>
          </DialogHeader>
          {enlargedImage && (
            <img src={enlargedImage} alt="Foto ampliada" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { BASE_ANGLES as ANGLES };
