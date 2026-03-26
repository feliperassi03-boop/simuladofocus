import { useRef, useState } from "react";

interface QuestionVideoProps {
  src: string;
  className?: string;
}

export default function QuestionVideo({ src, className = "" }: QuestionVideoProps) {
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Determine MIME type from URL extension
  const getType = (url: string) => {
    const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
    switch (ext) {
      case "mp4": return "video/mp4";
      case "webm": return "video/webm";
      case "ogg": return "video/ogg";
      case "mov": return "video/quicktime";
      default: return undefined;
    }
  };

  if (error) {
    return (
      <div className={`mt-3 rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground ${className}`}>
        <p>Não foi possível reproduzir este vídeo no seu navegador.</p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline mt-1 inline-block"
        >
          Clique aqui para abrir o vídeo
        </a>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      preload="metadata"
      className={`mt-3 rounded-lg w-full max-h-96 bg-muted ${className}`}
      onError={() => setError(true)}
    >
      <source src={src} type={getType(src)} />
      Seu navegador não suporta a reprodução deste vídeo.
    </video>
  );
}
