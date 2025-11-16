import FileUploadZone from '../FileUploadZone';

export default function FileUploadZoneExample() {
  const handleFileSelect = (file: File) => {
    console.log('File selected:', file.name);
  };

  return (
    <div className="p-8 bg-background">
      <FileUploadZone onFileSelect={handleFileSelect} />
    </div>
  );
}
