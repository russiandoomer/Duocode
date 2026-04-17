# Branding Guide

## Logo files to replace

When you have your final logo set, replace these files inside `assets/images/`:

- `icon.png`
- `favicon.png`
- `splash-icon.png`
- `android-icon-foreground.png`
- `android-icon-background.png`
- `android-icon-monochrome.png`

## Recommended export sizes

- App icon: `1024x1024`
- Favicon: `256x256`
- Splash logo: transparent PNG, at least `1024px` wide
- Android monochrome icon: transparent PNG in one color

## Where the logo is shown in code

- `components/brand/brand-mark.tsx`: temporary visual logo used in the UI
- `app.json`: native app icon and splash references

## Suggested logo system

- Main mark: `</>` or `DC` monogram
- Wordmark: `duocode`
- Accent color: cyan / electric blue
- Support color: dark navy
- Optional secondary mark: terminal cursor `_`

## Quick replacement workflow

1. Design logo set in Figma or Illustrator.
2. Export PNG assets with the names listed above.
3. Replace the files in `assets/images/`.
4. If you also want a custom in-app vector logo, update `components/brand/brand-mark.tsx`.
