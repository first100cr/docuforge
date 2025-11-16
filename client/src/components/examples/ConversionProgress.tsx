import { useState, useEffect } from 'react';
import ConversionProgress from '../ConversionProgress';

export default function ConversionProgressExample() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"uploading" | "converting" | "complete">("uploading");

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setStatus("complete");
          clearInterval(interval);
          return 100;
        }
        if (prev >= 50) setStatus("converting");
        return prev + 10;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 bg-background">
      <ConversionProgress
        fileName="presentation.pptx"
        fileSize="2.4 MB"
        progress={progress}
        status={status}
      />
    </div>
  );
}
