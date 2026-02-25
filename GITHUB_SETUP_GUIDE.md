# GitHub Setup Guide
## Peacefull.ai VC Demo

---

## 🚀 Quick Start (3 Steps)

### Step 1: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Enter repository name: `peacefull-demo` (or any name you prefer)
3. Choose **Public** or **Private**
4. **DO NOT** initialize with README (we'll add our own)
5. Click **Create repository**

### Step 2: Upload the Code

**Option A: Using Git Command Line**

```bash
# Navigate to the demo folder
cd /path/to/peacefull-demo

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: VC Demo v2.1"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/peacefull-demo.git

# Push
git push -u origin main
```

**Option B: Using GitHub Web Interface**

1. Go to your new GitHub repo
2. Click **"uploading an existing file"** link
3. Drag and drop `index.html` and `README.md`
4. Click **Commit changes**

**Option C: Using GitHub Desktop**

1. Download [GitHub Desktop](https://desktop.github.com/)
2. Add local repository → Select the demo folder
3. Publish repository to GitHub

### Step 3: Enable GitHub Pages

1. Go to **Settings** tab in your repo
2. Click **Pages** in the left sidebar
3. Under "Build and deployment":
   - **Source**: Select "Deploy from a branch"
   - **Branch**: Select "main" and "/(root)" folder
4. Click **Save**
5. Wait 1-2 minutes for deployment
6. Your demo will be live at:
   ```
   https://YOUR_USERNAME.github.io/peacefull-demo
   ```

---

## 📁 Files to Include

| File | Required | Description |
|------|----------|-------------|
| `index.html` | ✅ Yes | Main demo file (all HTML/CSS/JS) |
| `README.md` | ✅ Yes | Project documentation |
| `docs/` | Optional | Additional documentation |

---

## 🔧 Custom Domain (Optional)

To use a custom domain (e.g., `demo.peacefull.ai`):

1. Go to **Settings** → **Pages**
2. Under "Custom domain", enter your domain
3. Add a `CNAME` file to your repo with your domain
4. Configure DNS with your domain provider

---

## 🔄 Updating the Demo

When you make changes:

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

GitHub Pages will automatically redeploy.

---

## 📊 Repository Structure

```
peacefull-demo/
├── index.html          # Main demo (~103KB)
├── README.md           # Documentation
├── docs/
│   ├── CHANGELOG.md
│   ├── RED_TEAM_REPORT.md
│   └── SPEC_TRACEABILITY.md
└── .gitignore          # Git ignore file
```

---

## 🆘 Troubleshooting

### "404 File not found" on GitHub Pages
- Make sure `index.html` is in the root folder
- Check that GitHub Pages source is set to main branch
- Wait 1-2 minutes after pushing

### Changes not showing
- Clear browser cache (Ctrl+Shift+R)
- Check GitHub Pages build status in Actions tab

### Demo controls not working
- Make sure JavaScript is enabled in browser
- Check browser console for errors

---

## 📞 Need Help?

- GitHub Pages docs: https://pages.github.com/
- GitHub Desktop: https://desktop.github.com/
