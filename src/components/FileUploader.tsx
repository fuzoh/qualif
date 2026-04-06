import { useCallback, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
}

export function FileUploader({ onFilesSelected, isLoading }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.endsWith(".xlsx"),
      );
      if (files.length > 0) onFilesSelected(files);
    },
    [onFilesSelected],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) onFilesSelected(files);
      e.target.value = "";
    },
    [onFilesSelected],
  );

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <CardContent className="flex items-center justify-center gap-3 py-4">
        <Upload className="text-muted-foreground size-5" />
        <p className="text-muted-foreground text-sm">
          Glisser des fichiers .xlsx ici ou
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => inputRef.current?.click()}
        >
          {isLoading ? "Chargement..." : "Choisir des fichiers"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          multiple
          className="hidden"
          onChange={handleFileInput}
          disabled={isLoading}
        />
      </CardContent>
    </Card>
  );
}
