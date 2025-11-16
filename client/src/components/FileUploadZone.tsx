import { Upload, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string[];
}

export default function FileUploadZone({ 
  onFileSelect, 
  acceptedFormats = ["PDF", "DOCX", "XLSX", "PPTX", "JPG", "PNG"] 
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div className="w-full">
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center w-full min-h-[300px] px-6 py-12",
          "border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-primary/5"
        )}
        data-testid="dropzone-upload"
      >
        <input
          type="file"
          className="hidden"
          onChange={handleFileInput}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
          data-testid="input-file"
        />
        
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors",
          isDragging ? "bg-primary text-primary-foreground" : "bg-chart-2/20 text-chart-2"
        )}>
          {isDragging ? <FileText className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
        </div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2 font-['Poppins']">
          {isDragging ? "Drop your file here" : "Drop file here or click to upload"}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-6">
          Maximum file size: 10MB
        </p>
        
        <div className="flex flex-wrap justify-center gap-2">
          {acceptedFormats.map((format) => (
            <Badge 
              key={format} 
              variant="secondary" 
              className="text-xs"
              data-testid={`badge-format-${format.toLowerCase()}`}
            >
              {format}
            </Badge>
          ))}
        </div>
      </label>
    </div>
  );
}
