import { useState } from 'react';
import ConversionOptions from '../ConversionOptions';

export default function ConversionOptionsExample() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId);
    console.log('Selected conversion:', optionId);
  };

  return (
    <div className="p-8 bg-background">
      <ConversionOptions 
        selectedOption={selectedOption}
        onSelectOption={handleSelectOption}
      />
    </div>
  );
}
