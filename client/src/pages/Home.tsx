import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FileUploadZone from "@/components/FileUploadZone";
import ConversionOptions from "@/components/ConversionOptions";
import ConversionProgress from "@/components/ConversionProgress";
import DownloadSection from "@/components/DownloadSection";
import FeatureCard from "@/components/FeatureCard";
import { Zap, Shield, Cloud, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ConversionStage = "upload" | "convert" | "processing" | "complete";

export default function Home() {
  const [stage, setStage] = useState<ConversionStage>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedConversion, setSelectedConversion] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [conversionStatus, setConversionStatus] = useState<"uploading" | "converting" | "complete">("uploading");
  const [jobId, setJobId] = useState<string | null>(null);
  const [convertedFileName, setConvertedFileName] = useState<string>("");
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    console.log('File selected:', file.name);
    setSelectedFile(file);
    setStage("convert");
  };

  const handleConversionSelect = (optionId: string) => {
    console.log('Conversion selected:', optionId);
    setSelectedConversion(optionId);
  };

  const startConversion = async () => {
    if (!selectedFile || !selectedConversion) return;
    
    console.log('Starting conversion...');
    setStage("processing");
    setProgress(0);
    setConversionStatus("uploading");

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', selectedFile);

      setProgress(10);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();
      setJobId(uploadData.jobId);
      setProgress(40);
      setConversionStatus("converting");

      // Start conversion
      const convertResponse = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: uploadData.jobId,
          conversionType: selectedConversion,
        }),
      });

      if (!convertResponse.ok) {
        throw new Error('Conversion failed');
      }

      const convertData = await convertResponse.json();
      setProgress(90);

      // Simulate final processing
      setTimeout(() => {
        setProgress(100);
        setConversionStatus("complete");
        setStage("complete");
        
        // Generate converted filename
        const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
        const targetExt = selectedConversion.split('-to-')[1];
        setConvertedFileName(`${baseName}.${targetExt}`);
        
        toast({
          title: "Conversion Complete!",
          description: "Your file has been successfully converted.",
        });
      }, 500);

    } catch (error) {
      console.error('Conversion error:', error);
      toast({
        title: "Conversion Failed",
        description: "There was an error converting your file. Please try again.",
        variant: "destructive",
      });
      setStage("convert");
      setProgress(0);
      setConversionStatus("uploading");
    }
  };

  const handleDownload = () => {
    if (!jobId) return;
    
    console.log('Download triggered for job:', jobId);
    
    // Create download link
    const downloadUrl = `/api/download/${jobId}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = convertedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: "Your converted file is being downloaded.",
    });
  };

  const handleConvertAnother = () => {
    console.log('Convert another file');
    setStage("upload");
    setSelectedFile(null);
    setSelectedConversion(null);
    setProgress(0);
    setConversionStatus("uploading");
    setJobId(null);
    setConvertedFileName("");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-['Poppins']">
                Convert Your Documents
                <span className="text-primary"> Instantly</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Fast, free, and secure document conversion. Transform PDFs, Word, Excel, PowerPoint, and images with ease.
              </p>
            </div>

            <div className="max-w-3xl mx-auto mb-16">
              {stage === "upload" && (
                <FileUploadZone onFileSelect={handleFileSelect} />
              )}

              {stage === "convert" && (
                <div className="space-y-8">
                  <div className="p-6 bg-muted/50 rounded-xl">
                    <p className="text-sm text-muted-foreground mb-2">Selected file:</p>
                    <p className="font-medium text-foreground" data-testid="text-selected-file">
                      {selectedFile?.name} ({formatFileSize(selectedFile?.size || 0)})
                    </p>
                  </div>
                  
                  <ConversionOptions 
                    selectedOption={selectedConversion}
                    onSelectOption={handleConversionSelect}
                  />
                  
                  {selectedConversion && (
                    <div className="flex justify-center">
                      <button
                        onClick={startConversion}
                        className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover-elevate active-elevate-2 transition-all"
                        data-testid="button-start-conversion"
                      >
                        Start Conversion
                      </button>
                    </div>
                  )}
                </div>
              )}

              {stage === "processing" && selectedFile && (
                <ConversionProgress
                  fileName={selectedFile.name}
                  fileSize={formatFileSize(selectedFile.size)}
                  progress={progress}
                  status={conversionStatus}
                />
              )}

              {stage === "complete" && selectedFile && (
                <DownloadSection
                  fileName={convertedFileName}
                  fileSize={formatFileSize(selectedFile.size * 0.8)}
                  onDownload={handleDownload}
                  onConvertAnother={handleConvertAnother}
                />
              )}
            </div>
          </div>
        </section>

        <section id="features" className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-['Poppins']">
                Why Choose DocConvert?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The most efficient way to convert your documents online
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <FeatureCard
                icon={Zap}
                title="Lightning Fast"
                description="Convert your documents in seconds with our optimized conversion engine"
              />
              <FeatureCard
                icon={Shield}
                title="Secure & Private"
                description="Your files are automatically deleted after conversion. We respect your privacy"
              />
              <FeatureCard
                icon={Cloud}
                title="Cloud Based"
                description="No software installation needed. Convert from any device, anywhere"
              />
              <FeatureCard
                icon={RefreshCw}
                title="Unlimited Conversions"
                description="Convert as many documents as you need, completely free of charge"
              />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-['Poppins']">
                How It Works
              </h2>
            </div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Upload File</h3>
                <p className="text-muted-foreground">
                  Drag and drop or click to upload your document
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Choose Format</h3>
                <p className="text-muted-foreground">
                  Select the output format you need
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Download</h3>
                <p className="text-muted-foreground">
                  Get your converted file instantly
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
