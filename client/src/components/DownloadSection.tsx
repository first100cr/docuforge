import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, RotateCcw } from "lucide-react";

interface DownloadSectionProps {
  fileName: string;
  fileSize: string;
  onDownload: () => void;
  onConvertAnother: () => void;
}

export default function DownloadSection({ 
  fileName, 
  fileSize, 
  onDownload, 
  onConvertAnother 
}: DownloadSectionProps) {
  return (
    <Card className="p-8 w-full max-w-2xl mx-auto text-center" data-testid="card-download">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-success" data-testid="icon-success" />
        </div>
      </div>
      
      <h2 className="text-2xl font-semibold text-foreground mb-2 font-['Poppins']">
        Conversion Successful!
      </h2>
      
      <p className="text-muted-foreground mb-6">
        Your file has been converted and is ready to download
      </p>
      
      <Card className="p-4 mb-6 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <p className="font-medium text-foreground" data-testid="text-converted-filename">
              {fileName}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-converted-filesize">
              {fileSize}
            </p>
          </div>
        </div>
      </Card>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button 
          size="lg" 
          onClick={onDownload}
          className="gap-2"
          data-testid="button-download"
        >
          <Download className="w-4 h-4" />
          Download File
        </Button>
        
        <Button 
          size="lg" 
          variant="outline" 
          onClick={onConvertAnother}
          className="gap-2"
          data-testid="button-convert-another"
        >
          <RotateCcw className="w-4 h-4" />
          Convert Another
        </Button>
      </div>
    </Card>
  );
}
