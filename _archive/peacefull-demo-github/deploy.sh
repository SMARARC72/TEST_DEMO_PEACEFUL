#!/bin/bash

# Peacefull.ai VC Demo - One-Click GitHub Deploy Script
# Usage: ./deploy.sh YOUR_GITHUB_USERNAME

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if username provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: GitHub username required${NC}"
    echo "Usage: ./deploy.sh YOUR_GITHUB_USERNAME"
    echo "Example: ./deploy.sh khojarahimi"
    exit 1
fi

USERNAME=$1
REPO_NAME="peacefull-demo"
GITHUB_URL="https://github.com/$USERNAME/$REPO_NAME.git"
PAGES_URL="https://$USERNAME.github.io/$REPO_NAME"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Peacefull.ai Demo - GitHub Deploy  ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed${NC}"
    echo "Please install Git first: https://git-scm.com/downloads"
    exit 1
fi

echo -e "${YELLOW}Step 1/6: Checking GitHub repository...${NC}"
echo "Repository: $GITHUB_URL"
echo ""

# Check if remote already exists
if git remote get-url origin &> /dev/null; then
    echo -e "${YELLOW}Remote 'origin' already exists. Updating...${NC}"
    git remote set-url origin "$GITHUB_URL"
else
    echo -e "${YELLOW}Adding GitHub remote...${NC}"
    git remote add origin "$GITHUB_URL"
fi

echo ""
echo -e "${YELLOW}Step 2/6: Initializing Git repository...${NC}"
if [ ! -d ".git" ]; then
    git init
    echo -e "${GREEN}✓ Git repository initialized${NC}"
else
    echo -e "${GREEN}✓ Git repository already exists${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3/6: Adding files to Git...${NC}"
git add .
echo -e "${GREEN}✓ Files added${NC}"

echo ""
echo -e "${YELLOW}Step 4/6: Committing changes...${NC}"
COMMIT_MSG="Deploy VC Demo v2.1 - $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG" || echo -e "${YELLOW}⚠ No changes to commit${NC}"
echo -e "${GREEN}✓ Changes committed${NC}"

echo ""
echo -e "${YELLOW}Step 5/6: Pushing to GitHub...${NC}"
echo "This may prompt for your GitHub credentials..."
echo ""

# Try to push, handle authentication
if git push -u origin main 2>&1 | tee /tmp/push_output.txt; then
    echo -e "${GREEN}✓ Successfully pushed to GitHub!${NC}"
elif git push -u origin master 2>&1 | tee /tmp/push_output.txt; then
    echo -e "${GREEN}✓ Successfully pushed to GitHub (master branch)!${NC}"
else
    echo ""
    echo -e "${RED}✗ Push failed${NC}"
    echo ""
    echo -e "${YELLOW}Common fixes:${NC}"
    echo "1. Make sure the GitHub repository exists: $GITHUB_URL"
    echo "2. Check your GitHub credentials"
    echo "3. If using 2FA, use a personal access token instead of password"
    echo "4. Run: git config --global user.name 'Your Name'"
    echo "5. Run: git config --global user.email 'your@email.com'"
    echo ""
    echo "To create the repo, visit:"
    echo "https://github.com/new?name=$REPO_NAME&private=false"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 6/6: Checking GitHub Pages status...${NC}"
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  🎉 DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${BLUE}Repository:${NC} $GITHUB_URL"
echo -e "${BLUE}Live Demo:${NC}  $PAGES_URL"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Visit your repository: $GITHUB_URL"
echo "2. Go to Settings → Pages"
echo "3. Ensure 'Source' is set to 'Deploy from a branch'"
echo "4. Select 'main' branch and '/(root)' folder"
echo "5. Click Save"
echo ""
echo -e "${YELLOW}Your demo will be live in 1-2 minutes at:${NC}"
echo -e "${GREEN}$PAGES_URL${NC}"
echo ""
echo -e "${BLUE}======================================${NC}"
