import DownloadSection from '../DownloadSection';

export default function DownloadSectionExample() {
  const handleDownload = () => {
    console.log('Download triggered');
  };

  const handleConvertAnother = () => {
    console.log('Convert another triggered');
  };

  return (
    <div className="p-8 bg-background">
      <DownloadSection
        fileName="converted-document.pdf"
        fileSize="1.8 MB"
        onDownload={handleDownload}
        onConvertAnother={handleConvertAnother}
      />
    </div>
  );
}
