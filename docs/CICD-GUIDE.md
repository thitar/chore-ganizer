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
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CI/CD Pipeline Overview                                 │
│                      (Merged Workflow: ci-cd.yml)                           │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐     ┌─────────────────────────────────────────────────────┐
    │ Developer │     │              GitHub Actions                          │
    │  Pushes  │────▶│              (ci-cd.yml)                              │
    │   Code   │     │                                                     │
    └──────────┘     └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────────┐
                    │      CI Jobs (Parallel)           │
                    │                                   │
                    │  ┌─────────────┐  ┌────────────┐  │
                    │  │   Backend   │  │  Frontend  │  │
                    │  │ Tests &     │  │ Tests &    │  │
                    │  │ Build       │  │ Build      │  │
                    │  │             │  │            │  │
                    │  │ • npm ci    │  │ • npm ci   │  │
                    │  │ • prisma    │  │ • vitest   │  │
                    │  │ • jest      │  │ • build    │  │
                    │  │ • tsc       │  │            │  │
                    │  └─────────────┘  └────────────┘  │
                    └───────────────────────────────────┘
                                    │
                           needs: [backend, frontend]
                                    │
                                    ▼ (only on main branch push)
                    ┌───────────────────────────────────┐
                    │      CD Jobs (Sequential)          │
                    │                                   │
                    │  ┌─────────────────────────────┐   │
                    │  │   Build & Push Docker      │   │
                    │  │   Images to ghcr.io        │   │
                    │  │                            │   │
                    │  │ • backend → ghcr.io/...   │   │
                    │  │ • frontend → ghcr.io/...   │   │
                    │  └─────────────────────────────┘   │
                    │              │                      │
                    │              ▼                      │
                    │  ┌─────────────────────────────┐   │
                    │  │   Deploy to Server (opt)   │   │
                    │  │   (disabled by default)    │   │
                    │  └─────────────────────────────┘   │
                    └───────────────────────────────────┘
```

### What Happens Step by Step

#### When You Push Code (Any Branch or PR)

1. **GitHub detects the push** 🚀
2. **CI jobs run in parallel:**
   
   **Backend job:**
   - Checkout code
   - Setup Node.js 20 with npm caching
   - Install dependencies (`npm ci`)
   - Generate Prisma client (`npm run prisma:generate`)
   - Run backend tests (Jest)
   - Build backend (TypeScript compilation)
   - Upload build artifacts
   
   **Frontend job (runs in parallel with backend):**
   - Checkout code
   - Setup Node.js 20 with npm caching
   - Install dependencies (`npm ci`)
   - Run frontend tests (Vitest)
   - Build frontend (Vite production build)
   - Upload build artifacts
   
3. **If CI passes:** ✅ Success!
4. **If CI fails:** ❌ GitHub notifies you, CD is skipped

#### When You Push to Main Branch

After CI passes:
1. **CD job starts** (depends on both backend and frontend jobs completing)
   - Build backend Docker image
   - Push to GitHub Container Registry (ghcr.io)
   - Build frontend Docker image
   - Push to GitHub Container Registry (ghcr.io)
2. **Deployment job** (optional, disabled by default)
   - Shows deployment instructions

#### Job Dependencies

The merged workflow uses GitHub Actions `needs` syntax to ensure proper execution order:

```yaml
build-and-push:
  needs: [backend, frontend]  # Waits for both CI jobs to complete
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

This ensures Docker images are only built and pushed after all tests pass.

---

## Path Structure 📁

The Chore-Ganizer project uses a flat directory structure at the root level:

```
chore-ganizer/                  # Project root
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # Merged CI/CD workflow
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── __tests__/         # Jest test files
│   │   └── ...
│   ├── package.json
│   ├── jest.config.js
│   ├── Dockerfile
│   └── prisma/
├── frontend/                   # React/Vite frontend
│   ├── src/
│   │   ├── __tests__/        # Vitest test files
│   │   ├── test/             # Test setup files
│   │   └── ...
│   ├── package.json
│   ├── vitest.config.ts
│   ├── Dockerfile
│   └── nginx.conf
└── docs/                       # Documentation
```

> **Note:** The workflow files reference `backend/` and `frontend/` directly (not `dev/chore-ganizer/backend/`).

---

## CI/CD Architecture 🏗️

### Workflow Structure

The CI/CD pipeline is implemented as a single merged workflow file (`.github/workflows/ci-cd.yml`) that contains both CI and CD jobs.

#### Job Overview

| Job | Type | Triggers | Description |
|-----|------|----------|-------------|
| `backend` | CI | Every push/PR | Runs backend tests and build |
| `frontend` | CI | Every push/PR | Runs frontend tests and build |
| `build-and-push` | CD | Push to main | Builds and pushes Docker images |
| `deploy-to-server` | CD | Push to main | Shows deployment instructions (disabled) |

#### Job Dependencies

```yaml
# CD job waits for both CI jobs to complete
build-and-push:
  needs: [backend, frontend]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

This ensures:
1. Both CI jobs run in parallel for faster execution
2. CD only starts after both CI jobs succeed
3. CD is skipped for non-main-branch pushes

#### Artifact Sharing

The CI jobs upload build artifacts that can be used by subsequent jobs:
- Backend: `backend-build` → Contains compiled TypeScript
- Frontend: `frontend-build` → Contains production build

#### Docker Build Cache

The workflow uses GitHub Actions cache (`type=gha`) for Docker builds:
```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

This significantly speeds up subsequent builds by caching Docker layers.

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
│       └── ci-cd.yml         # Merged CI/CD workflow (single file)
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

#### How It Works

1. **Automatic Authentication**: The workflow uses `GITHUB_TOKEN` for authentication - no additional secrets needed!
2. **Image Naming**:
   - Backend: `ghcr.io/YOUR_USERNAME/chore-ganizer/chore-ganizer-backend:latest`
   - Frontend: `ghcr.io/YOUR_USERNAME/chore-ganizer/chore-ganizer-frontend:latest`
3. **Tagging Strategy**:
   - `latest` - Always points to main branch
   - `sha-abc1234` - SHA-based tags for each commit
   - Branch tags - For feature branches

#### Accessing Your Images

1. Go to your repository on GitHub
2. Click on the **Packages** tab
3. You'll see chore-ganizer-backend and chore-ganizer-frontend packages
4. Click on a package to see available tags

#### Pulling Images

```bash
# Login to ghcr.io
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin

# Pull backend
docker pull ghcr.io/YOUR_USERNAME/chore-ganizer/chore-ganizer-backend:latest

# Pull frontend
docker pull ghcr.io/YOUR_USERNAME/chore-ganizer/chore-ganizer-frontend:latest
```

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
        working-directory: backend
        run: npm ci
```

**What it means:** Go to the backend folder and install all the packages from package.json (faster than npm install).

```yaml
      - name: Run tests
        working-directory: backend
        run: npm test
```

**What it means:** Run the test suite using Jest.

```yaml
      - name: Build backend
        working-directory: backend
        run: npm run build
```

**What it means:** Compile the TypeScript code to JavaScript.

### CI/CD Workflow (ci-cd.yml)

The CI and CD pipelines have been merged into a single workflow file for simplicity. This consolidated approach ensures CI passes before CD runs.

#### CI Jobs (Always Run)

The CI portion runs on every push and pull request:

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
          context: backend
          push: true
```

**What it means:** Build the Docker image and push it to the registry.

---

## Testing Locally 🧪

Before pushing to GitHub, you can test locally!

### Test Backend

```bash
cd backend
npm install
npm run prisma:generate
npm test
```

**Backend Test Configuration:**
- Framework: Jest with ts-jest preset
- Config: `backend/jest.config.js`
- Test location: `backend/src/__tests__/`

### Test Frontend

```bash
cd frontend
npm install
npm test
```

**Frontend Test Configuration:**
- Framework: Vitest with jsdom environment
- Config: `frontend/vitest.config.ts`
- Setup: `frontend/src/test/setup.ts`
- Test location: `frontend/src/` (components, hooks)

### Test Build

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
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
- Verify the Node.js version matches (currently 20)

#### ❌ "Test failed"

**Problem:** One or more tests are failing.

**Solution:**
- Run tests locally to see the error: `npm test`
- Fix the failing test or code
- Commit and push the fix
- For backend: Uses Jest with ts-jest preset
- For frontend: Uses Vitest with jsdom environment

#### ❌ "Prisma generate failed"

**Problem:** Prisma client can't be generated.

**Solution:**
- Check that prisma/schema.prisma is valid
- Ensure all referenced types exist
- Run `npm run prisma:generate` locally to debug

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
- Verify working-directory paths match the actual folder structure

#### ❌ "Permission denied to push to container registry"

**Problem:** Can't push Docker images.

**Solution:**
- Make sure the workflow has `packages: write` permission
- Check that you're not using a fork (for public repos)
- Ensure the repository has packages enabled in settings

#### ❌ "Workflow not running"

**Problem:** Push doesn't trigger workflow.

**Solution:**
- Check that workflow file is in `.github/workflows/`
- Verify the YAML syntax
- Check that you're not on an ignored branch
- Ensure the file is named `.yml` not `.yaml`

#### ❌ "Artifact upload/download failed"

**Problem:** Build artifacts can't be transferred between jobs.

**Solution:**
- Ensure artifact names are unique within a workflow run
- Check retention period (default: 1 day in our config)
- Verify the path globs match actual output directories

### CI/CD-Specific Issues

#### Job Dependencies Not Working

**Problem:** CD job runs before CI completes.

**Solution:**
- Verify the `needs` keyword is correctly set
- Ensure all required jobs are listed: `needs: [backend, frontend]`
- Check that the condition `if: github.ref == 'refs/heads/main'` is correct

#### Images Not Pushing to ghcr.io

**Problem:** Docker push fails.

**Solution:**
1. Check repository visibility (private repos need proper permissions)
2. Verify image naming: must use lowercase
3. Check that login-action completed successfully
4. Ensure GITHUB_TOKEN has correct scopes

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

**Q: What test frameworks are used?**
> A: Backend uses Jest with ts-jest preset. Frontend uses Vitest with jsdom environment.

**Q: Can I skip CI/CD for a commit?**
> A: Yes! Add `[skip ci]` or `[ci skip]` to your commit message.

**Q: How do I add more test steps?**
> A: Edit the `ci-cd.yml` file and add more `run:` steps under the appropriate job.

**Q: Can I run only frontend or backend tests?**
> A: Yes! The jobs run independently. You can trigger them separately or modify the workflow to run jobs conditionally.

**Q: Why is CI/CD in a single file?**
> A: The merged `ci-cd.yml` simplifies maintenance and ensures CD only runs after CI passes using the `needs` keyword.

### Deployment Questions

**Q: Where are Docker images stored?**
> A: GitHub Container Registry (ghcr.io). You'll find them in your repository's Packages section.

**Q: How do I rollback a deployment?**
> A: Edit docker-compose.yml to use the previous image tag, then redeploy.

**Q: Can I deploy to multiple environments?**
> A: Yes! You can modify ci-cd.yml to add staging/production jobs with different triggers.

**Q: How do I enable automatic server deployment?**
> A: Edit the `deploy-to-server` job in ci-cd.yml and remove `if: false`. You'll need to add SSH secrets or webhook configuration.

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
| CI/CD Workflow | `.github/workflows/ci-cd.yml` |
| Backend Tests | `backend/` |
| Frontend Tests | `frontend/` |

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
