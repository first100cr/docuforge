import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <Card className="p-6 hover-elevate" data-testid={`card-feature-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </Card>
  );
}
