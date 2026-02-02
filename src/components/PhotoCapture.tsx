import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, RotateCcw, Check, Upload } from "lucide-react";

interface PhotoCaptureProps {
  onCapture: (photoDataUrl: string) => void;
  title?: string;
}

export function PhotoCapture({ onCapture, title = "Foto da Ferramenta" }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsCapturing(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Não foi possível acessar a câmera. Use o botão de upload.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedPhoto(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setCapturedPhoto(null);
    setError(null);
  };

  const confirmPhoto = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {isCapturing ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
          ) : capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Foto capturada"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Camera className="w-12 h-12 mb-2" />
              <p className="text-sm">Nenhuma foto capturada</p>
              {error && <p className="text-xs text-destructive mt-2">{error}</p>}
            </div>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="flex gap-2">
          {!isCapturing && !capturedPhoto && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Câmera
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </>
          )}
          
          {isCapturing && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={stopCamera}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={capturePhoto}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capturar
              </Button>
            </>
          )}
          
          {capturedPhoto && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={retake}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refazer
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={confirmPhoto}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                Confirmar
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
