# GitHub Guide for HealthGrid IQ
### Written for Danesh — No Prior GitHub Experience Needed

---

## What is GitHub and Why Use It?

Think of GitHub like a Google Drive for code.
- Every time you make changes, you "save a snapshot" (called a **commit**)
- You can go back to any snapshot anytime
- You can't accidentally break the project permanently

---

## The 3 Commands You'll Use 90% of the Time

```
git add .           → Stage all your changes (tell Git what to save)
git commit -m "..."  → Save a snapshot with a description
git push             → Upload to GitHub
```

That's it. Everything else in this guide is for specific situations.

---

## Part 1: Your First Time Setting Up a New Project

You only do this ONCE per project.

### Step 1: Open terminal in your project folder
- In VS Code: Terminal → New Terminal
- In Windows: Open PowerShell, type `cd "C:\path\to\your\project"`

### Step 2: Initialize Git
```bash
git init
```

### Step 3: Go to GitHub and create a new repo
1. Go to https://github.com/new
2. Give it a name (e.g., `my-new-project`)
3. Set to Private
4. Do NOT tick any checkboxes
5. Click Create repository
6. Copy the URL (e.g., `https://github.com/daneshlou07/my-new-project.git`)

### Step 4: Connect your folder to GitHub
```bash
git remote add origin https://github.com/daneshlou07/my-new-project.git
```

### Step 5: First commit and push
```bash
git add .
git commit -m "First commit"
git push -u origin master
```

Done. Your code is now on GitHub.

---

## Part 2: Your Daily Workflow (After Setup)

Every time you make changes and want to save them:

### Step 1: Check what changed
```bash
git status
```
This shows you what files were modified. Green = staged, Red = not staged yet.

### Step 2: Stage all changes
```bash
git add .
```
The `.` means "add everything". You can also add specific files:
```bash
git add src/pages/LoginPage.tsx
```

### Step 3: Commit (save a snapshot)
```bash
git commit -m "Fixed login page bug"
```
Write a SHORT description of what you changed. Examples:
- `"Added bulk scheduling feature"`
- `"Fixed map not showing routes"`
- `"Updated radiographer list"`
- `"Changed button color to navy"`

### Step 4: Push to GitHub
```bash
git push
```

That's your daily routine: **add → commit → push**

---

## Part 3: How to Not Mess Up Your Code

### Golden Rule: Commit Before You Experiment
Before trying something risky, commit your current working code:
```bash
git add .
git commit -m "Working version before trying new feature"
```
Now if you break everything, you can go back.

### How to Undo Your Last Change (Before Committing)
If you changed a file and want to go back to how it was:
```bash
git checkout -- src/pages/LoginPage.tsx
```
This restores that file to the last committed version.

### How to Undo Everything (Go Back to Last Commit)
If you made a mess and nothing works:
```bash
git checkout -- .
```
This restores ALL files to the last committed version.
WARNING: This loses all uncommitted changes permanently.

### How to Go Back to an Old Version
```bash
git log --oneline
```
This shows your commit history. Each line has a short code (like `953c652`).

To see what the project looked like at that point:
```bash
git checkout 953c652
```

To go back to the latest version:
```bash
git checkout master
```

### How to Undo a Committed Change (Safe Way)
If you already committed something and want to reverse it:
```bash
git revert HEAD
```
This creates a new commit that undoes the last one. Safe — doesn't delete history.

---

## Part 4: Checking Your Work

### See what files changed
```bash
git status
```

### See commit history
```bash
git log --oneline
```

### See what exactly changed in a file
```bash
git diff src/pages/LoginPage.tsx
```
Shows exactly what lines you added (green +) and removed (red -).

### See all branches
```bash
git branch
```

---

## Part 5: Updating Vercel Automatically

If you connected your GitHub repo to Vercel (via vercel.com dashboard):

Every time you `git push`, Vercel **automatically rebuilds and deploys** your site.

So your workflow becomes:
1. Make code changes
2. `git add .`
3. `git commit -m "describe change"`
4. `git push`
5. Wait 60 seconds → your live link is updated

No need to run `vercel --prod` again.

### How to Connect GitHub to Vercel
1. Go to https://vercel.com
2. Open your project
3. Settings → Git → Connect Repository
4. Select `healthgrid-iq-demo`
5. Done — now every push auto-deploys

---

## Part 6: Working on a New Feature Safely (Branches)

A branch is like a copy of your project where you can experiment safely.
Your main code stays untouched until you're sure the feature works.

### Create a new branch
```bash
git checkout -b new-feature-name
```

### Work, commit as normal
```bash
git add .
git commit -m "Working on new feature"
```

### When the feature is done, merge it back
```bash
git checkout master
git merge new-feature-name
git push
```

### Delete the branch after merging
```bash
git branch -d new-feature-name
```

---

## Part 7: Common Situations

### "I accidentally deleted a file"
```bash
git checkout -- filename.tsx
```
The file comes back from the last commit.

### "I want to see what the file looked like 3 commits ago"
```bash
git log --oneline    # Find the commit code
git show abc1234:src/pages/LoginPage.tsx
```

### "My push was rejected"
Usually means GitHub has newer code than your local copy.
```bash
git pull
git push
```

### "I committed to the wrong branch"
```bash
git checkout correct-branch
git cherry-pick abc1234   # the commit code you want to move
```

### "I want to completely start fresh from GitHub"
```bash
git fetch origin
git reset --hard origin/master
```
WARNING: This deletes ALL local uncommitted changes.

---

## Part 8: Quick Reference Card

| What you want to do | Command |
|---|---|
| Save all changes | `git add .` → `git commit -m "message"` → `git push` |
| Check what changed | `git status` |
| See commit history | `git log --oneline` |
| Undo uncommitted changes | `git checkout -- .` |
| Undo last commit (safe) | `git revert HEAD` |
| Create a branch | `git checkout -b branch-name` |
| Switch branch | `git checkout master` |
| Download latest from GitHub | `git pull` |
| Upload to GitHub | `git push` |

---

## Your Specific Project

Your repo: **https://github.com/daneshlou07/healthgrid-iq-demo**

Your project folder: `C:\Users\Danesh Lou\Downloads\Rebuild`

Your live link: **https://rebuild-t27yrt7j6-human7905s-projects.vercel.app**

Everyday command for this project:
```bash
cd "C:\Users\Danesh Lou\Downloads\Rebuild"
git add .
git commit -m "describe what you changed"
git push
```

---

## Things to Never Do

- Never delete the `.git` folder — it's your entire version history
- Never force push (`git push --force`) unless you really know what you're doing
- Never commit your `.env` file — it contains secret keys (`.gitignore` already blocks it)
- Never commit the `node_modules` folder (`.gitignore` already blocks it)

---

*This guide was written for HealthGrid IQ — Danesh Lou, July 2026*
