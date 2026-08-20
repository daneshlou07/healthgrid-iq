# Project Rules

## Deployment & Version Control Rule
Whenever code changes or fixes are completed:
1. Stage, commit, and push all changes to GitHub (updating staging and production branches):
   ```bash
   git add .
   git commit -m "<descriptive commit message>"
   git push origin healthgridiq-stg-01
   git push origin healthgridiq-stg-01:main
   git push origin healthgridiq-stg-01:master
   ```
2. Ensure live deployment on **https://app.healthgridiq.com** and **https://stg.healthgridiq.com** is active right away.

## Design & UI Rules
1. **NO EMOJIS EVER AGAIN**: Never use raw emojis anywhere in the application code, labels, titles, or badges. Use only Lucide icons or clean text.
2. **NO GRADIENTS**: Use solid colors, flat background tones, and clean borders. Do not use background gradients (`bg-gradient-to-...`).
3. **HUMAN CLINICAL DESIGNS ONLY**: Keep designs clean, practical, and hospital-grade. Avoid dark AI-style widgets or flashy neon components.
4. **CONSISTENT FONTS & FONT SIZES**: Use 1-2 clean typography families max with consistent hierarchy across all pages and views.
