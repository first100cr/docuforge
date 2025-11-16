import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";

interface ConversionProgressProps {
  fileName: string;
  fileSize: string;
  progress: number;
  status: "uploading" | "converting" | "complete";
}

export default function ConversionProgress({ 
  fileName, 
  fileSize, 
  progress, 
  status 
}: ConversionProgressProps) {
  const statusText = {
    uploading: "Uploading file...",
    converting: "Converting document...",
    complete: "Conversion complete!"
  };

  return (
    <Card className="p-6 w-full max-w-2xl mx-auto" data-testid="card-conversion-progress">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-chart-2/20 text-chart-2 flex items-center justify-center flex-shrink-0">
          {status === "complete" ? (
            <FileText className="w-6 h-6" />
          ) : (
            <Loader2 className="w-6 h-6 animate-spin" data-testid="icon-loading" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate" data-testid="text-filename">
            {fileName}
          </h3>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-filesize">
            {fileSize}
          </p>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground" data-testid="text-status">
                {statusText[status]}
              </span>
              <span className="text-sm font-medium text-foreground" data-testid="text-progress">
                {progress}%
              </span>
            </div>
            
            <Progress 
              value={progress} 
              className="h-2"
              data-testid="progress-bar"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
