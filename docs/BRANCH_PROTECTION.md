# Branch Protection & Auto-Merge Guide

**Quick Reference:** Copy-paste configurations for GitHub branch protection and auto-merge setup.

---

## Required Status Checks

The following GitHub Actions jobs **MUST pass** before any PR can be merged to `main`:

### Current (Phase 1)
```
✅ Test & Lint
✅ Build Check
```

### Phase 2 (With Integration Tests)
```
✅ Test & Lint
✅ Integration Tests
✅ Build Check
```

### Phase 3 (With E2E Tests)
```
✅ Test & Lint
✅ Integration Tests
✅ Build Check
✅ E2E Tests (optional on feature branches)
```

---

## Coverage Requirements

**Minimum Thresholds Enforced in CI:**
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

**How it's enforced:**
- Jest fails if coverage drops below threshold
- CI job fails if Jest fails
- PR cannot be merged if CI fails

---

## Auto-Merge Rules

### When Auto-Merge Triggers

A PR will **automatically merge** when ALL of these conditions are met:

1. ✅ All required status checks pass
2. ✅ One of the following:
   - PR has the `auto-merge` label
   - PR is from `dependabot[bot]`
3. ✅ All required approvals received (if configured)
4. ✅ All conversations resolved

### How to Enable Auto-Merge for Your PR

**Via GitHub CLI:**
```bash
gh pr edit <PR_NUMBER> --add-label "auto-merge"
```

**Via GitHub Web UI:**
1. Open your PR
2. Click "Labels" in right sidebar
3. Select or create `auto-merge` label
4. Wait for CI to complete

**Via API:**
```bash
curl -X POST \
  -H "Authorization: token YOUR_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/OWNER/REPO/issues/PR_NUMBER/labels \
  -d '{"labels":["auto-merge"]}'
```

### Merge Strategy

**Default:** Squash merge

```yaml
Commit Title: {PR Title} (#{PR Number})
Commit Body: {PR Description}
```

**Why squash?**
- ✅ Clean, linear history
- ✅ Easy to revert entire features
- ✅ One commit per PR in `main`
- ✅ Better for `git bisect`

---

## Dependabot Auto-Merge

### Automatic Handling

**Auto-approved & auto-merged:**
```
✅ Patch updates (1.0.x)
✅ Minor updates (1.x.0)
```

**Requires manual review:**
```
⚠️ Major updates (x.0.0)
```

### How It Works

1. Dependabot creates PR for dependency update
2. CI runs all tests automatically
3. If tests pass:
   - PR is auto-approved
   - PR is auto-merged (for patch/minor)
4. If tests fail:
   - PR remains open
   - Notification sent

### Customizing Dependabot Behavior

Edit `.github/workflows/dependabot-auto-merge.yml`:

```yaml
# To disable auto-merge for specific packages:
- name: Enable auto-merge for Dependabot PRs
  if: |
    steps.metadata.outputs.update-type == 'version-update:semver-patch' ||
    (steps.metadata.outputs.update-type == 'version-update:semver-minor' && 
     !contains(steps.metadata.outputs.dependency-names, 'react'))
```

---

## Setting Up Branch Protection

### Step-by-Step Configuration

#### 1. Navigate to Branch Protection Settings

```
Repository → Settings → Branches → Add rule
```

#### 2. Configure Branch Name Pattern

```
Branch name pattern: main
```

(Repeat for `develop` if using)

#### 3. Enable Required Settings

**Protection Rules:**
```
✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale pull request approvals when new commits are pushed
  ✅ Require review from Code Owners (optional, requires CODEOWNERS file)

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  
  Select required status checks:
    ✅ Test & Lint
    ✅ Build Check
    ✅ Integration Tests (add in Phase 2)

✅ Require conversation resolution before merging

✅ Require signed commits (optional but recommended)

✅ Require linear history (recommended for clean history)

❌ Allow force pushes: Nobody (recommended)
❌ Allow deletions: Disabled (recommended)
```

#### 4. Additional Restrictions (Optional)

```
Restrict who can push to matching branches:
  - Add team or specific users
  - Useful for production branches

Rules applied to administrators:
  ✅ Do not allow bypassing the above settings (recommended)
```

#### 5. Save Changes

Click **"Create"** or **"Save changes"**

---

## GitHub Actions Permissions

### Required Permissions for Auto-Merge

#### 1. Navigate to Actions Settings

```
Repository → Settings → Actions → General
```

#### 2. Configure Workflow Permissions

**Workflow permissions:**
```
⦿ Read and write permissions (REQUIRED for auto-merge)
```

**Additional settings:**
```
✅ Allow GitHub Actions to create and approve pull requests
```

#### 3. Save Changes

Click **"Save"**

---

## Disabling Auto-Merge

### For a Specific PR

**Method 1: Remove the label**
```bash
gh pr edit <PR_NUMBER> --remove-label "auto-merge"
```

**Method 2: Request changes**
```bash
gh pr review <PR_NUMBER> --request-changes --body "Needs more discussion"
```

**Method 3: Start a blocking conversation**
1. Add a comment on the PR
2. Select "Request changes" when reviewing
3. PR cannot merge until approved

### For All PRs (Temporarily)

**Disable auto-merge workflow:**
```bash
# Rename the workflow file to disable it
mv .github/workflows/ci.yml .github/workflows/ci.yml.disabled
```

Or add to workflow:
```yaml
on:
  pull_request:
    branches: [main]
  # Uncomment to disable:
  # workflow_dispatch: {}
```

---

## Manual Merge Options

Even with auto-merge enabled, you can manually merge PRs:

### Squash and Merge (Recommended)

```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

**Use when:**
- ✅ Multiple small commits in PR
- ✅ Want clean history
- ✅ Standard workflow

### Rebase and Merge

```bash
gh pr merge <PR_NUMBER> --rebase --delete-branch
```

**Use when:**
- ✅ Want to preserve individual commits
- ✅ Commits are already well-organized
- ✅ Linear history desired

### Create a Merge Commit

```bash
gh pr merge <PR_NUMBER> --merge --delete-branch
```

**Use when:**
- ✅ Need to preserve exact branch history
- ✅ Multiple authors on PR
- ✅ Tracking feature branch development

---

## Troubleshooting

### Auto-Merge Not Working

**Checklist:**

1. **Is the label applied?**
   ```bash
   gh pr view <PR_NUMBER> --json labels
   ```

2. **Are all checks passing?**
   ```bash
   gh pr checks <PR_NUMBER>
   ```

3. **Are approvals met?**
   ```bash
   gh pr view <PR_NUMBER> --json reviewDecision
   ```

4. **Are conversations resolved?**
   - Check PR page for unresolved threads

5. **Are Actions permissions correct?**
   - Settings → Actions → General
   - Verify "Read and write permissions"

6. **Is branch protection configured?**
   - Settings → Branches
   - Verify rules for `main`

**Debug command:**
```bash
# View detailed PR status
gh pr view <PR_NUMBER> --json statusCheckRollup,reviewDecision,labels
```

### CI Checks Failing

**Run locally to debug:**
```bash
# Run all CI checks locally
npm run lint          # Linting
npm test             # Unit tests
npm run test:integration  # Integration tests (Phase 2+)
npm run build        # Build check

# Check coverage
npm run test:coverage
open coverage/lcov-report/index.html
```

**Common issues:**

| Issue | Solution |
|-------|----------|
| Lint errors | Run `npm run lint` locally and fix |
| Test failures | Run `npm test` to see which tests fail |
| Coverage too low | Add tests or adjust threshold |
| Build errors | Run `npm run build` locally |
| Missing env vars | Check `.env.example` for required vars |

### Need to Bypass Branch Protection

**When to bypass (admin only):**
- 🔥 Production emergency
- 🔧 CI infrastructure broken
- 📦 Critical dependency security update

**How to bypass:**
1. You must be a repository admin
2. Branch protection must not apply to admins
3. Click "Merge without waiting for requirements"
4. **Document why in PR comments**

**Better alternatives:**
```bash
# Option 1: Override specific check
gh pr merge <PR_NUMBER> --admin --squash

# Option 2: Temporarily disable protection
# (Settings → Branches → Edit rule → Disable temporarily)

# Option 3: Create temporary branch protection exception
# (Settings → Branches → Manage access)
```

---

## Security Considerations

### Protected Branches

**Minimum protection:**
```
main (production):
  ✅ Require PR
  ✅ Require status checks
  ✅ Require 1 approval
  ✅ Block force push
  ✅ Block deletion
```

**Enhanced protection:**
```
main (production):
  ✅ All minimum protections
  ✅ Require Code Owner review
  ✅ Require signed commits
  ✅ Apply rules to administrators
  ✅ Require linear history
```

### Code Owners

Create `.github/CODEOWNERS`:

```
# Global owners
* @your-team

# Specific paths
/lib/auth.ts @security-team
/prisma/schema.prisma @backend-team
/.github/workflows/ @devops-team
```

### Audit Trail

All merges are logged and auditable:

```bash
# View merge history
git log --merges --oneline

# View who merged what
git log --pretty=format:"%h %an %ad %s" --merges

# Audit specific PR
gh pr view <PR_NUMBER> --json mergedBy,mergedAt,commits
```

---

## Best Practices

### DO ✅

- Add `auto-merge` label for trivial changes (typos, docs)
- Let Dependabot handle patch/minor updates
- Review test coverage before merging
- Keep PRs small and focused
- Resolve all conversations
- Write descriptive PR descriptions
- Link related issues
- Test locally before pushing

### DON'T ❌

- Auto-merge breaking changes without team review
- Bypass checks without documenting why
- Force push to PRs with auto-merge
- Merge PRs with failing tests
- Ignore low coverage warnings
- Skip manual testing for critical features
- Merge without reading code changes

---

## Quick Command Reference

```bash
# Enable auto-merge
gh pr edit <PR> --add-label "auto-merge"

# Disable auto-merge
gh pr edit <PR> --remove-label "auto-merge"

# Check PR status
gh pr checks <PR>
gh pr view <PR>

# Manually merge
gh pr merge <PR> --squash --delete-branch

# View CI logs
gh run view <RUN_ID>
gh run list --workflow=ci.yml

# Test locally
npm run lint
npm test
npm run test:coverage
npm run build
```

---

## Support & Questions

**Found an issue with auto-merge?**
1. Check troubleshooting section above
2. Review GitHub Actions logs
3. Check branch protection settings
4. Ask in team Slack/Discord

**Want to modify auto-merge behavior?**
1. Edit `.github/workflows/ci.yml`
2. Test changes on a feature branch first
3. Document changes in PR description

**Need emergency merge?**
1. Use admin override (document why)
2. Create follow-up issue to fix CI
3. Notify team of manual merge

---

**Last Updated:** November 2025  
**Maintained by:** DevOps Team

