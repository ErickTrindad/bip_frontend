import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Trash2, Play, Pause, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  onAudioReady: (blob: Blob, base64: string, filename: string) => void;
  disabled?: boolean;
}

export function AudioRecorder({ onAudioReady, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordDuration(0);
    setIsPlaying(false);
    audioChunksRef.current = [];
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    const { promise, resolve, reject } = Promise.withResolvers<string>();
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
    return promise;
  };

  const startRecording = async () => {
    setPermissionError(null);
    clearRecording();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determina MIME type suportado
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const filename = `recording_${Date.now()}.${ext}`;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        try {
          const base64 = await blobToBase64(audioBlob);
          onAudioReady(audioBlob, base64, filename);
        } catch (err) {
          console.error('Falha ao converter áudio para base64', err);
        }
      };

      mediaRecorder.start(250); // Coleta dados a cada 250ms
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error('Erro ao acessar microfone:', err);
      setPermissionError(
        'Permissão de microfone negada ou dispositivo indisponível. Verifique as configurações do navegador.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (!audioPlayerRef.current) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audioPlayerRef.current = audio;
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-canvas border border-border-neutral rounded-2xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Gravação de Voz
        </span>
        {isRecording && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-status-danger animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-status-danger"></span>
            Gravando ({formatTime(recordDuration)})
          </span>
        )}
      </div>

      {permissionError && (
        <div className="flex items-start gap-2 p-3 text-xs bg-status-danger-bg text-status-danger border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{permissionError}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>Iniciar Gravação</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2.5 bg-status-danger hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
          >
            <Square className="w-4 h-4" />
            <span>Parar Gravação ({formatTime(recordDuration)})</span>
          </button>
        )}

        {audioUrl && !isRecording && (
          <>
            <button
              type="button"
              onClick={togglePlayback}
              className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-neutral-100 border border-border-neutral rounded-xl font-bold text-xs text-text-primary transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pausar' : 'Ouvir Áudio'}</span>
            </button>

            <button
              type="button"
              onClick={clearRecording}
              className="flex items-center gap-1.5 px-3 py-2 text-text-muted hover:text-status-danger hover:bg-status-danger-bg rounded-xl font-medium text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
