import { useState } from 'react';
import { Upload, FileAudio, X, AlertCircle } from 'lucide-react';

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  disabled?: boolean;
}

export function AudioUploader({ onFileSelect, onFileClear, disabled }: AudioUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Checa tamanho máximo (25MB suportado pela Groq Whisper)
    if (file.size > 25 * 1024 * 1024) {
      setError('O arquivo de áudio excede o limite máximo de 25MB.');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setError(null);
    onFileClear();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-canvas border border-border-neutral rounded-2xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Upload de Arquivo de Áudio
        </span>
        <span className="text-[10px] text-text-muted">Formatos: MP3, M4A, WAV, WEBM, OGG (até 25MB)</span>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 text-xs bg-status-danger-bg text-status-danger border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!selectedFile ? (
        <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-border-neutral hover:border-brand-500 rounded-xl bg-card hover:bg-brand-50/20 transition-all cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload className="w-6 h-6 text-brand-600 mb-2" />
          <span className="text-xs font-bold text-text-primary">Clique para selecionar áudio</span>
          <span className="text-[11px] text-text-muted mt-0.5">ou arraste o arquivo aqui</span>
          <input
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.flac"
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
        </label>
      ) : (
        <div className="flex items-center justify-between p-3.5 bg-card border border-border-neutral rounded-xl">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
              <FileAudio className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-text-primary truncate">{selectedFile.name}</span>
              <span className="text-[11px] text-text-muted">{formatFileSize(selectedFile.size)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="p-1.5 text-text-muted hover:text-status-danger hover:bg-status-danger-bg rounded-lg transition-colors cursor-pointer"
            title="Remover arquivo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
