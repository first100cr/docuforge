import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-foreground font-['Poppins']">
              DocConvert
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <a 
              href="#features" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-features"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-how-it-works"
            >
              How it Works
            </a>
            <a 
              href="#pricing" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-pricing"
            >
              Pricing
            </a>
          </nav>

          <Button 
            variant="outline" 
            size="sm"
            data-testid="button-sign-in"
          >
            Sign In
          </Button>
        </div>
      </div>
    </header>
  );
}
