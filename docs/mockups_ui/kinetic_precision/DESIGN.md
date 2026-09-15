---
name: Kinetic Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.4'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.2'
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

The design system is engineered for high-performance operational workflows, balancing the utility of an enterprise tool with the sophisticated aesthetics of modern consumer tech. It targets field staff (SPG) and Team Leaders who require immediate data clarity and effortless interaction in fast-paced environments.

The visual style is **Corporate Modern with Glassmorphic accents**. It prioritizes a clean, Slate-based foundation to reduce cognitive load while utilizing translucent layers (Glassmorphism) to establish hierarchy and focus for high-priority status updates and modals. The interface feels light, airy, and precise.

## Colors

The palette is rooted in the **Slate** scale to provide a neutral, professional environment. **Indigo-600** serves as the functional driver, highlighting primary actions and active states. 

- **Primary (Indigo-600):** Used for CTA buttons, active navigation, and critical interaction points.
- **Surface & Background:** The application utilizes Slate-50 for backgrounds to create a subtle contrast with pure white Surface cards.
- **Status Semantic Colors:** 
    - **Pending:** Amber tones to signal "Caution/Wait".
    - **Approved:** Emerald tones to signal "Success".
    - **Rejected:** Rose tones to signal "Action Required/Error".
- **Dark Theme Exception:** The login experience deviates into a high-contrast, ultra-minimal dark mode using Slate-950 backgrounds to emphasize the entry point.

## Typography

The typography system uses a dual-font approach to maximize readability and technical precision.

- **Plus Jakarta Sans:** The primary typeface for all UI labels, headings, and body copy. It provides a warm, contemporary feel.
- **JetBrains Mono:** Reserved exclusively for tabular data, timestamps, attendance counts, and reporting figures. The monospaced nature ensures that columns of numbers align perfectly for quick scanning by Team Leaders.
- **Mobile Scaling:** For mobile devices, `display-lg` should be capped at `32px` and `headline-lg` at `24px` to maintain optimal line-wrapping on narrow screens.

## Layout & Spacing

This design system employs a **12-column fluid grid** for desktop and a **4-column grid** for mobile devices. 

- **Spacing Rhythm:** Based on a 4px baseline. All padding and margins should be increments of 4px, with 16px (md) being the standard container padding.
- **Dashboard Layout:** Utilizes a fixed left-hand sidebar (280px) on desktop, transitioning to a bottom navigation bar or a glassmorphic floating tab bar on mobile.
- **Safe Areas:** On mobile, ensure a minimum margin of 16px from the screen edge.

## Elevation & Depth

Hierarchy is established through a combination of subtle shadows and glassmorphism.

- **Level 1 (Standard Cards):** Uses a white surface with a #e2e8f0 border and a soft ambient shadow (`0 1px 3px rgba(0,0,0,0.04)`).
- **Level 2 (Active/Hover):** The shadow deepens slightly to `0 4px 6px rgba(0,0,0,0.05)` to indicate interactivity.
- **Level 3 (Modals/Overlays):** Utilizes **Glassmorphism**. Surfaces should have a white fill at 8-10% opacity with a background blur (backdrop-filter: blur(12px)). This is used for attendance confirmation sheets and filter menus to maintain context of the underlying dashboard.
- **Separators:** Use 1px borders in Slate-200 (#e2e8f0) instead of heavy shadows where possible to keep the UI flat and modern.

## Shapes

The shape language is generous and approachable. 

- **Standard Elements (Cards, Inputs, Buttons):** Use `rounded-xl` (12px).
- **Floating Elements (Modals, Bottom Sheets):** Use `rounded-2xl` (16px) to emphasize their distinct "overlay" nature.
- **Pills (Status Tags):** Use a fully rounded (pill) style to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Background Indigo-600, Text White, Bold, `rounded-xl`. Internal padding: `12px 24px`.
- **Secondary:** Background Indigo-50, Text Indigo-600, Bold, `rounded-xl`.
- **Glass Action:** For overlay actions, use a transparent button with a white 10% border and blur.

### Status Pills
- **Geometry:** Height of 24px, padding `2px 10px`, `rounded-full`.
- **Typography:** `label-sm` (Plus Jakarta Sans, 12px, Bold).
- **Styling:** Use the light background and darkened text tokens defined in the Color section for Pending, Approved, and Rejected states.

### Cards
- **Dashboard Card:** White background, 1px border (#e2e8f0), `rounded-xl`, 16px padding.
- **Glass Card:** 8% white opacity, 12px blur, 1px white opacity 20% border. Used for "In-Progress" attendance timers.

### Input Fields
- **Default:** Height 48px, `rounded-xl`, border Slate-200, background White.
- **Focus:** Border Indigo-600 with a 2px outer glow of Indigo-50.
- **Data Inputs:** Use JetBrains Mono for inputs involving numeric reporting or time logs.

### List Items
- Clean, 1px bottom border (#e2e8f0). Use a 40x40px avatar or icon container with `rounded-lg` for SPG profiles.