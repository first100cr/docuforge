import { Card } from "@/components/ui/card";
import { FileText, Image, FileSpreadsheet, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversionOption {
  id: string;
  from: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface ConversionOptionsProps {
  selectedOption: string | null;
  onSelectOption: (optionId: string) => void;
}

const conversionOptions: ConversionOption[] = [
  { id: "pdf-to-word", from: "PDF", to: "Word", icon: FileText, label: "PDF to Word" },
  { id: "word-to-pdf", from: "Word", to: "PDF", icon: FileText, label: "Word to PDF" },
  { id: "jpg-to-pdf", from: "JPG", to: "PDF", icon: Image, label: "Image to PDF" },
  { id: "pdf-to-jpg", from: "PDF", to: "JPG", icon: Image, label: "PDF to Image" },
  { id: "excel-to-pdf", from: "Excel", to: "PDF", icon: FileSpreadsheet, label: "Excel to PDF" },
  { id: "ppt-to-pdf", from: "PowerPoint", to: "PDF", icon: Presentation, label: "PPT to PDF" },
];

export default function ConversionOptions({ selectedOption, onSelectOption }: ConversionOptionsProps) {
  return (
    <div className="w-full">
      <h2 className="text-2xl font-semibold text-foreground mb-6 font-['Poppins']">
        Choose Conversion Type
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {conversionOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedOption === option.id;
          
          return (
            <Card
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              className={cn(
                "p-6 cursor-pointer transition-all duration-300 hover-elevate active-elevate-2",
                isSelected && "border-primary bg-primary/5"
              )}
              data-testid={`card-conversion-${option.id}`}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-chart-2/20 text-chart-2"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground">
                    {option.label}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.from} → {option.to}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
