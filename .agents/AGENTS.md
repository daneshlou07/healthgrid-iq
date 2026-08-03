# Project Rules

## Deployment & Version Control Rule
Whenever code changes or fixes are completed:
1. Stage, commit, and push all changes to GitHub:
   ```bash
   git add .
   git commit -m "<descriptive commit message>"
   git push origin master
   ```
2. Deploy the project to Vercel:
   ```bash
   npx vercel --prod --yes
   ```

## Design & UI Rules
1. **NO EMOJIS EVER AGAIN**: Never use raw emojis anywhere in the application code, labels, titles, or badges. Use only Lucide icons or clean text.
2. **NO GRADIENTS**: Use solid colors, flat background tones, and clean borders. Do not use background gradients (`bg-gradient-to-...`).
3. **HUMAN CLINICAL DESIGNS ONLY**: Keep designs clean, practical, and hospital-grade. Avoid dark AI-style widgets or flashy neon components.
4. **CONSISTENT FONTS & FONT SIZES**: Use 1-2 clean typography families max with consistent hierarchy across all pages and views.
