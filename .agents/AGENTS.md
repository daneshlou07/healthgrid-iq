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
