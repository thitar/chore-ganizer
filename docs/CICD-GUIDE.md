# CI/CD Guide for Chore-Ganizer 🏠✨

*Explain Like I'm 5 (ELI5) Edition*

---

## Table of Contents

1. [What is CI/CD?](#what-is-cicd)
2. [What is GitHub Actions?](#what-is-github-actions)
3. [How It Works for Chore-Ganizer](#how-it-works-for-chore-ganizer)
4. [Prerequisites](#prerequisites)
5. [Step-by-Step Setup](#step-by-step-setup)
6. [Understanding the Workflow Files](#understanding-the-workflow-files)
7. [Testing Locally](#testing-locally)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## What is CI/CD? 🤔

### ELI5 Explanation

Imagine you're building a LEGO castle with your friends. Here's how CI/CD helps:

- **CI (Continuous Integration)** = Every time someone adds a new LEGO piece, you quickly check if it fits and doesn't break anything. It's like having a helper who tests your castle after every small change!

- **CD (Continuous Deployment)** = Once the new piece is tested and works, another helper automatically puts that piece on the main castle for everyone to see. No manual work needed!

### In Real Words

| Term | What it means | What it does for Chore-Ganizer |
|------|---------------|-------------------------------|
| **CI** | Run tests automatically when code changes | Checks that our backend and frontend work correctly |
| **CD** | Deploy automatically when testsuts the pass | P new version live on the server |

### Why Should You Care?

✅ **No more manual testing** - The computer does it for you  
✅ **Catch bugs early** - Problems are found before they reach users  
✅ **Save time** - Developers can focus on writing new features  
✅ **Peace of mind** - Every change is tested before going live  

---

## What is GitHub Actions? 🤖

### ELI5 Explanation

GitHub Actions is like having a robot assistant that lives in your GitHub repository. When you ask it to do something (like "test my code"), it automatically:

1. Creates a virtual computer (in the cloud)
2. Does the task you asked
3. Tells you if it worked or not
4. Cleans up when done

You don't need to set up any servers or install anything - GitHub provides the computers for free!

### In Real Words

GitHub Actions is a **workflow automation tool** built into GitHub. It lets you:

- Run scripts automatically when events happen (like pushing code)
- Use pre-made "actions" (like building with Node.js)
- Create custom workflows with YAML files
- Get notifications about results

### Key Concepts

| Concept | What it means |
|---------|---------------|
| **Workflow** | A set of automated tasks, defined in a YAML file |
| **Job** | A group of steps that run on the same machine |
| **Step** | A single task (like running a command) |
| **Action** | A reusable piece of code (like "setup Node.js") |
| **Runner** | The virtual machine that executes your workflow |

---

## How It Works for Chore-Ganizer 📊

### Visual Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline Overview                          │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐     ┌─────────────────┐     ┌────────────────────────┐
    │  Developer│     │  GitHub Actions │     │    Production Server   │
    │   Pushes  │────▶│    (The Robot)   │     │    (Live App)          │
    │    Code   │     │                 │     │                        │
    └──────────┘     └─────────────────┘     └────────────────────────┘
                            │                            ▲
                            ▼                            │
                    ┌─────────────────┐                  │
                    │  CI Workflow    │                  │
                    │  (ci.yml)       │                  │
                    │                 │                  │
                    │  1. Checkout    │                  │
                    │  2. Setup Node  │                  │
                    │  3. Install deps│                  │
                    │  4. Run tests   │                  │
                    │  5. Build       │                  │
                    └─────────────────┘                  │
                            │                            │
                            ▼                            │
                    ┌─────────────────┐                  │
                    │  CD Workflow    │                  │
                    │  (deploy.yml)   │──────────────────┘
                    │                 │     (Optional)
                    │  1. Build Docker│
                    │  2. Push to    │
                    │     Container  │
                    │     Registry   │
                    │  3. Deploy     │
                    └─────────────────┘
```

### What Happens Step by Step

#### When You Push Code (Any Branch)

1. **GitHub detects the push** 🚀
2. **CI workflow starts automatically**
3. **Backend job runs:**
   - Checkout code
   - Install Node.js
   - Install backend dependencies
   - Generate Prisma client
   - Run backend tests (Jest)
   - Build backend
4. **Frontend job runs:**
   - Checkout code
   - Install Node.js
   - Install frontend dependencies
   - Run frontend tests (Vitest)
   - Build frontend
5. **If all tests pass:** ✅ Success!
6. **If tests fail:** ❌ GitHub notifies you

#### When You Push to Main Branch

1. **CI workflow runs first** (same as above)
2. **If CI passes, CD workflow starts:**
   - Build backend Docker image
   - Push to GitHub Container Registry
   - Build frontend Docker image
   - Push to GitHub Container Registry
3. **Optionally deploy to server**

---

## Prerequisites 📋

Before setting up CI/CD, make sure you have:

### For Developers

- [ ] A GitHub account
- [ ] Push access to the Chore-Ganizer repository
- [ ] Node.js 20+ installed locally (for testing)
- [ ] Basic understanding of terminal/command line

### Optional (for deployment)

- [ ] GitHub Container Registry access (comes with GitHub)
- [ ] SSH access to production server (for auto-deploy)
- [ ] Deployment webhook URL (for manual deploy)

---

## Step-by-Step Setup 🛠️

### Step 1: Understand the Current Setup

The workflow files are already created in your repository:

```
chore-ganizer/
├── .github/
│   └── workflows/
│       ├── ci.yml         # Runs on every push
│       └── deploy.yml     # Runs on push to main
├── backend/
│   ├── package.json       # Has "test" script
│   ├── jest.config.js    # Jest testing config
│   └── Dockerfile         # For containerization
└── frontend/
    ├── package.json       # Has "test" script
    ├── vitest.config.ts  # Vitest testing config
    └── Dockerfile         # For containerization
```

### Step 2: Enable GitHub Actions

1. Go to your repository on GitHub
2. Click on the **Actions** tab
3. GitHub should automatically detect the workflow files
4. If prompted, click "I understand my workflows, go ahead and enable them"

### Step 3: Run Your First CI Build

1. Make a small change to any file (like adding a comment)
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Testing CI/CD"
   git push origin your-branch-name
   ```
3. Go to the **Actions** tab
4. You should see a new workflow run in progress
5. Click on it to see the progress
6. Wait for it to complete! ⏳

### Step 4: Verify the Build

When the workflow completes:

✅ **Green checkmark** = All tests passed!  
❌ **Red X** = Something failed - click to see what went wrong

### Step 5: Set Up Container Registry (Optional)

The CD workflow pushes Docker images to GitHub Container Registry (ghcr.io).

1. By default, GitHub provides access to ghcr.io with your GITHUB_TOKEN
2. No additional setup needed!
3. Images will be named:
   - `ghcr.io/YOUR_USERNAME/chore-ganizer-backend:latest`
   - `ghcr.io/YOUR_USERNAME/chore-ganizer-frontend:latest`

### Step 6: Configure Deployment (Optional)

#### Option A: Manual Deployment

After CD runs successfully:
1. Go to the Actions tab
2. Find your successful run
3. Check the summary for image tags
4. Update your server's docker-compose.yml with new tags
5. Run on your server:
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

#### Option B: SSH Deployment (Advanced)

1. Go to your repository settings
2. Go to **Secrets and variables** → **Actions**
3. Add these secrets:
   - `SSH_HOST`: Your server IP/hostname
   - `SSH_USERNAME`: Your SSH username
   - `SSH_PRIVATE_KEY`: Your SSH private key
4. Uncomment the SSH deployment section in `deploy.yml`

#### Option C: Webhook Deployment

1. Set up a deployment webhook on your server
2. Add the URL as a secret called `DEPLOY_WEBHOOK_URL`
3. Uncomment the webhook section in `deploy.yml`

---

## Understanding the Workflow Files 📝

### CI Workflow (ci.yml)

Let's break down each part:

```yaml
name: CI (Continuous Integration)
```

This is the name that appears in GitHub Actions.

```yaml
on:
  push:
    branches: ['**']
  pull_request:
    branches: ['main']
```

**What it means:** Run this workflow on every push to ANY branch, and on pull requests to main.

```yaml
jobs:
  backend:
    name: Backend Tests & Build
    runs-on: ubuntu-latest
```

**What it means:** Create a job called "backend" that runs on Ubuntu (GitHub's free virtual machine).

```yaml
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
```

**What it means:** Download the code from GitHub so we can work with it.

```yaml
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
```

**What it means:** Install Node.js version 20 on the virtual machine.

```yaml
      - name: Install dependencies
        working-directory: dev/chore-ganizer/backend
        run: npm ci
```

**What it means:** Go to the backend folder and install all the packages from package.json (faster than npm install).

```yaml
      - name: Run tests
        working-directory: dev/chore-ganizer/backend
        run: npm test
```

**What it means:** Run the test suite using Jest.

```yaml
      - name: Build backend
        working-directory: dev/chore-ganizer/backend
        run: npm run build
```

**What it means:** Compile the TypeScript code to JavaScript.

### CD Workflow (deploy.yml)

Key differences from CI:

```yaml
on:
  push:
    branches: ['main']
```

**What it means:** Only run when pushing to the main branch.

```yaml
  workflow_dispatch:
    inputs:
      deploy_to_server:
        description: 'Deploy to production server?'
        required: true
```

**What it means:** Allow manual triggering with a dropdown option.

```yaml
    permissions:
      packages: write
```

**What it means:** Allow pushing Docker images to the container registry.

```yaml
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
```

**What it means:** Log in to GitHub's container registry automatically.

```yaml
      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: dev/chore-ganizer/backend
          push: true
```

**What it means:** Build the Docker image and push it to the registry.

---

## Testing Locally 🧪

Before pushing to GitHub, you can test locally!

### Test Backend

```bash
cd dev/chore-ganizer/backend
npm install
npm run prisma:generate
npm test
```

### Test Frontend

```bash
cd dev/chore-ganizer/frontend
npm install
npm test
```

### Test Build

```bash
# Backend
cd dev/chore-ganizer/backend
npm run build

# Frontend
cd dev/chore-ganizer/frontend
npm run build
```

### Using act (Run GitHub Actions Locally)

You can run GitHub Actions on your local machine using [act](https://github.com/nektos/act):

1. Install act:
   ```bash
   # On macOS
   brew install act

   # On Linux
   curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
   ```

2. Run CI workflow locally:
   ```bash
   act push
   ```

---

## Troubleshooting 🔧

### Common Issues and Solutions

#### ❌ "npm ci failed"

**Problem:** Dependencies can't be installed.

**Solution:**
- Make sure package-lock.json is committed
- Check for syntax errors in package.json
- Try deleting node_modules and pushing again

#### ❌ "Test failed"

**Problem:** One or more tests are failing.

**Solution:**
- Run tests locally to see the error
- Fix the failing test or code
- Commit and push the fix

#### ❌ "Build failed"

**Problem:** Code can't be compiled.

**Solution:**
- Check for TypeScript errors locally: `npm run build`
- Look at the error message for line numbers
- Fix the errors and push again

#### ❌ "Docker build failed"

**Problem:** Docker image can't be built.

**Solution:**
- Check the Dockerfile for errors
- Make sure all files referenced exist
- Check that base images are accessible

#### ❌ "Permission denied to push to container registry"

**Problem:** Can't push Docker images.

**Solution:**
- Make sure the workflow has `packages: write` permission
- Check that you're not using a fork (for public repos)

#### ❌ "Workflow not running"

**Problem:** Push doesn't trigger workflow.

**Solution:**
- Check that workflow file is in `.github/workflows/`
- Verify the YAML syntax
- Check that you're not on an ignored branch

### Getting Help

1. **Check the workflow logs** - Click on the workflow run, then on each job/step
2. **Search GitHub Actions docs** - https://docs.github.com/en/actions
3. **Ask in issues** - Create an issue with the error message
4. **Check existing issues** - Maybe someone had the same problem

---

## FAQ ❓

### General Questions

**Q: How much does GitHub Actions cost?**
> A: Free for public repositories! For private repos, you get 2,000 minutes/month free.

**Q: How long do workflows run?**
> A: Typically 2-5 minutes for CI. CD takes longer (5-15 minutes) due to Docker builds.

**Q: Can I run workflows manually?**
> A: Yes! The CD workflow has a "workflow_dispatch" trigger. Go to Actions → CD → Run workflow.

### Technical Questions

**Q: What versions of Node.js are supported?**
> A: We use Node.js 20 in the workflows. You can change this in the `NODE_VERSION` env variable.

**Q: Can I skip CI/CD for a commit?**
> A: Yes! Add `[skip ci]` or `[ci skip]` to your commit message.

**Q: How do I add more test steps?**
> A: Edit the `ci.yml` file and add more `run:` steps under the appropriate job.

**Q: Can I run only frontend or backend tests?**
> A: The workflows run both. You can modify the workflow to run jobs conditionally using `if` statements.

### Deployment Questions

**Q: Where are Docker images stored?**
> A: GitHub Container Registry (ghcr.io). You'll find them in your repository's Packages section.

**Q: How do I rollback a deployment?**
> A: Edit docker-compose.yml to use the previous image tag, then redeploy.

**Q: Can I deploy to multiple environments?**
> A: Yes! You can modify deploy.yml to add staging/production jobs with different triggers.

---

## Quick Reference Card 📇

### Common Commands

```bash
# Run tests locally
npm test

# Build locally
npm run build

# Install dependencies
npm ci

# Generate Prisma client
npm run prisma:generate
```

### GitHub Actions Tips

| Tip | Command/Action |
|-----|----------------|
| Skip CI | Add `[skip ci]` to commit |
| Re-run failed job | Click "Re-run all jobs" |
| View logs | Click on job → step |
| Cancel run | Click "Cancel workflow" |

### File Locations

| File | Path |
|------|------|
| CI Workflow | `.github/workflows/ci.yml` |
| CD Workflow | `.github/workflows/deploy.yml` |
| Backend Tests | `dev/chore-ganizer/backend/` |
| Frontend Tests | `dev/chore-ganizer/frontend/` |

---

## Next Steps 🚀

Now that you understand CI/CD:

1. ✅ Make your first push and watch the CI run
2. ✅ Try breaking something and see the test fail
3. ✅ Fix the issue and see it pass
4. ✅ Push to main and watch the CD run
5. ✅ Explore customizing the workflows

### Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Node.js Setup Action](https://github.com/actions/setup-node)

---

*Created with ❤️ for the Chore-Ganizer team!*
