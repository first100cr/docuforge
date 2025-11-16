# Document Converter Design Guidelines

## Design Approach
**Reference-Based:** Inspired by iLovePDF and SmallPDF's clean, conversion-focused interfaces with prominent upload zones and clear action paths.

## Core Design Principles
- **Conversion-First:** Large, inviting upload areas as primary focal points
- **Visual Clarity:** Clear format selection and conversion status visibility
- **Trust & Simplicity:** Clean, professional aesthetic that inspires confidence in file handling

## Color Palette
- **Primary:** #FF6B6B (Coral Red) - CTAs, active states, primary actions
- **Secondary:** #4ECDC4 (Teal) - Icons, accents, secondary elements
- **Background:** #FFFFFF (White) - Main background
- **Light Background:** #F8F9FA (Off-white) - Cards, sections
- **Text:** #2C3E50 (Dark blue-grey) - Primary text
- **Success:** #27AE60 (Green) - Success states, completion indicators

## Typography
- **Font Families:** Inter (primary) / Poppins (headings)
- **Hierarchy:** 
  - Hero/H1: text-4xl to text-5xl, font-bold
  - H2: text-3xl, font-semibold
  - H3: text-xl, font-medium
  - Body: text-base, font-normal
  - Small: text-sm

## Layout System
- **Spacing Units:** Tailwind units of 4, 6, 8, 12, 16 (e.g., p-8, gap-6, mb-12)
- **Container:** max-w-6xl for main content areas
- **Border Radius:** rounded-xl (12px) for cards, rounded-lg for buttons
- **Card Elevation:** Subtle shadows (shadow-md) for depth

## Component Specifications

### Upload Zone
- Large drag-and-drop area with dashed border (border-2 border-dashed)
- Centered icon (cloud upload in teal) with supporting text
- Hover state: Light coral background tint (#FF6B6B at 5% opacity)
- Active drag state: Coral border with teal background tint
- File type badges below: Small pills showing accepted formats

### Conversion Cards
- White cards (bg-white) with shadow-md on light background
- Format selector: Grid of format options with icons
- Each option: Rounded button with icon + label, hover lifts slightly
- Selected state: Coral border with light coral background

### Progress Indicators
- Linear progress bar with coral fill on teal track
- Percentage display alongside
- File name and size shown above progress
- Animated spinner for processing state

### Download Section
- Success message with green checkmark icon
- File preview card with format icon
- Primary download button (coral background, white text)
- Secondary action: "Convert Another" (teal text, transparent background)

### Navigation
- Clean header with logo left, "How it Works" / "Pricing" links right
- Minimal footer with quick links and social icons

## Interactions & Animations
- **Transitions:** Use transition-all duration-300 for smooth state changes
- **Hover Effects:** Subtle scale (scale-105) and shadow increases
- **File Upload:** Fade-in animation for uploaded file previews
- **Progress:** Smooth progress bar animation (transition-all duration-500)
- **Success State:** Gentle bounce animation on completion

## Responsive Behavior
- Mobile (base): Single column, full-width cards, stacked layouts
- Tablet (md:): Two-column format grids
- Desktop (lg:): Multi-column conversion options, side-by-side layouts

## Images
**No hero image required.** This is a tool-focused application where the upload zone IS the hero element. Focus on iconography (cloud upload, document formats, checkmarks) using Material Icons or Heroicons via CDN.

## Accessibility
- Clear focus states with coral outline rings
- High contrast text ratios maintained
- Screen reader labels for all interactive elements
- Keyboard navigation support throughout