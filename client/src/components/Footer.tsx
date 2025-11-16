import { FileText } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-foreground font-['Poppins']">
                DocConvert
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Fast, free, and secure online document conversion. Convert between PDF, Word, Excel, PowerPoint, and images with ease.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-6">
          <p className="text-sm text-muted-foreground text-center">
            © 2024 DocConvert. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
