import { useRef, useState, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const CONVERTIBLE_EXTENSIONS = ["mov", "avi", "wmv", "mkv", "flv", "webm"];

export function useVideoConverter() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const loadedRef = useRef(false);

  const loadFFmpeg = useCallback(async () => {
    if (loadedRef.current && ffmpegRef.current) return ffmpegRef.current;

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    ffmpeg.on("progress", ({ progress: p }) => {
      setProgress(Math.round(p * 100));
    });

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpeg.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    });

    loadedRef.current = true;
    return ffmpeg;
  }, []);

  const needsConversion = useCallback((fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    return CONVERTIBLE_EXTENSIONS.includes(ext);
  }, []);

  const convertToMp4 = useCallback(async (file: File): Promise<File> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!CONVERTIBLE_EXTENSIONS.includes(ext)) return file;
    if (ext === "mp4") return file;

    setConverting(true);
    setProgress(0);

    try {
      const ffmpeg = await loadFFmpeg();
      const inputName = `input.${ext}`;
      const outputName = "output.mp4";

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.exec(["-i", inputName, "-c:v", "libx264", "-preset", "fast", "-crf", "28", "-c:a", "aac", "-movflags", "+faststart", outputName]);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: "video/mp4" });
      const baseName = file.name.replace(/\.[^.]+$/, "");
      return new File([blob], `${baseName}.mp4`, { type: "video/mp4" });
    } finally {
      setConverting(false);
      setProgress(0);
    }
  }, [loadFFmpeg]);

  return { convertToMp4, needsConversion, converting, progress };
}
