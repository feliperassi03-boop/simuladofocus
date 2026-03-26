import { useRef, useState, useEffect } from "react";
import { Play } from "lucide-react";

interface QuestionVideoProps {
  src: string;
  className?: string;
}

export default function QuestionVideo({ src, className = "" }: QuestionVideoProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset state when src changes
  useEffect(() => {
    setError(false);
    setLoading(true);
  }, [src]);

  // Determine MIME type from URL extension
  const getType = (url: string) => {
    const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
    switch (ext) {
      case "mp4": return "video/mp4";
      case "webm": return "video/webm";
      case "ogg": return "video/ogg";
      case "mov": return "video/mp4"; // Try as mp4 first since many .mov are h264 compatible
      default: return undefined;
    }
  };

  const isMovFile = src.split(".").pop()?.split("?")[0]?.toLowerCase() === "mov";

  if (error) {
    return (
      <div className={`mt-3 rounded-lg bg-muted p-6 text-center ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Play className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Este vídeo não pode ser reproduzido diretamente no navegador.
          </p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Play className="w-4 h-4" />
            Abrir vídeo em nova aba
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-3 relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 rounded-lg bg-muted flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Carregando vídeo...</span>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        controls
        playsInline
        crossOrigin="anonymous"
        preload="metadata"
        className={`rounded-lg w-full max-h-96 bg-muted ${loading ? "invisible" : ""}`}
        onLoadedData={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onError={() => {
          // If it's a .mov file, try without type hint first
          if (isMovFile && videoRef.current) {
            // Try direct src without source element
            const video = videoRef.current;
            video.onerror = () => setError(true);
            video.src = src;
            video.load();
          } else {
            setError(true);
          }
        }}
      >
        <source src={src} type={getType(src)} />
        {isMovFile && <source src={src} type="video/quicktime" />}
        Seu navegador não suporta a reprodução deste vídeo.
      </video>
    </div>
  );
}
