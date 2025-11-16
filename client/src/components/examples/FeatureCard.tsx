import { Zap } from 'lucide-react';
import FeatureCard from '../FeatureCard';

export default function FeatureCardExample() {
  return (
    <div className="p-8 bg-background max-w-sm">
      <FeatureCard
        icon={Zap}
        title="Lightning Fast"
        description="Convert your documents in seconds with our optimized conversion engine"
      />
    </div>
  );
}
