# Testing Setup Checklist

Use this checklist to verify your testing infrastructure is properly set up and to onboard new team members.

## ✅ Initial Setup (Do Once)

### Repository Configuration

- [ ] Install dependencies: `npm install`
- [ ] Verify tests run: `npm test`
- [ ] Check coverage: `npm run test:coverage`
- [ ] Update CI badge in README with your GitHub username/repo

### GitHub Configuration

- [ ] Enable GitHub Actions in repository settings
- [ ] Grant GitHub Actions write permissions:
  - Go to Settings → Actions → General
  - Scroll to "Workflow permissions"
  - Select "Read and write permissions"
  - Check "Allow GitHub Actions to create and approve pull requests"
  - Save changes

- [ ] (Optional) Set up Codecov:
  - Create account at [codecov.io](https://codecov.io)
  - Get upload token
  - Add `CODECOV_TOKEN` to repository secrets

- [ ] Enable auto-merge in repository:
  - Go to Settings → General
  - Scroll to "Pull Requests"
  - Check "Allow auto-merge"
  - Save changes

### Branch Protection (Recommended)

- [ ] Configure branch protection for `main`:
  - Go to Settings → Branches
  - Add rule for `main` branch
  - Check "Require status checks to pass before merging"
  - Select required checks:
    - Test & Lint
    - Build Check
  - Check "Require branches to be up to date before merging"
  - Save changes

## 🔄 For Each Pull Request

### Before Creating PR

- [ ] Write tests for new features
- [ ] Run tests locally: `npm test`
- [ ] Check coverage: `npm run test:coverage`
- [ ] Ensure coverage meets minimums (50%)
- [ ] Run linter: `npm run lint`
- [ ] Validate translations: `npm run translations:validate`

### After Creating PR

- [ ] Verify CI checks are running
- [ ] Wait for all checks to pass
- [ ] Review coverage report (if Codecov enabled)
- [ ] (Optional) Add `auto-merge` label for automatic merging

### If CI Fails

- [ ] Check GitHub Actions logs
- [ ] Fix failing tests locally
- [ ] Push fixes
- [ ] Wait for CI to re-run

## 📝 When Writing New Code

### For New Utilities/Functions

- [ ] Write unit tests in `__tests__/lib/`
- [ ] Test happy path
- [ ] Test edge cases
- [ ] Test error conditions
- [ ] Aim for 80%+ coverage

### For New Components

- [ ] Write component tests in `__tests__/components/`
- [ ] Test rendering
- [ ] Test user interactions
- [ ] Test different prop combinations
- [ ] Test accessibility (roles, labels)
- [ ] Aim for 70%+ coverage

### For New Server Actions

- [ ] Write integration tests in `__tests__/app/actions/`
- [ ] Test authentication requirements
- [ ] Test authorization rules
- [ ] Test success cases
- [ ] Test error handling
- [ ] Test database interactions (mocked)
- [ ] Aim for 80%+ coverage

### For New API Routes

- [ ] Write API tests in `__tests__/app/api/`
- [ ] Test all HTTP methods
- [ ] Test request validation
- [ ] Test response formats
- [ ] Test error responses
- [ ] Test rate limiting (if applicable)

## 🎯 Weekly Testing Tasks

### For Team Leads

- [ ] Review coverage trends
- [ ] Identify untested areas
- [ ] Plan testing sprints
- [ ] Share testing best practices
- [ ] Celebrate testing wins

### For All Developers

- [ ] Run tests before committing
- [ ] Fix flaky tests immediately
- [ ] Update test documentation as needed
- [ ] Share testing tips in team meetings

## 📊 Monthly Review

- [ ] Review overall coverage percentage
- [ ] Identify top 5 untested files
- [ ] Create issues for missing tests
- [ ] Update coverage thresholds (if appropriate)
- [ ] Review and update test plan documentation
- [ ] Analyze CI/CD metrics (build times, failure rates)

## 🚨 Troubleshooting

### "Tests fail locally but pass in CI"

- [ ] Check Node version matches CI (v20)
- [ ] Clear Jest cache: `npx jest --clearCache`
- [ ] Delete `node_modules` and `package-lock.json`
- [ ] Run `npm install` again
- [ ] Check for environment variable differences

### "Tests pass locally but fail in CI"

- [ ] Run `npm run test:ci` locally
- [ ] Check for file system case sensitivity issues
- [ ] Look for timezone-dependent tests
- [ ] Check for tests depending on local files
- [ ] Review CI logs for specific errors

### "Coverage is too low"

- [ ] Run `npm run test:coverage` to see report
- [ ] Open `coverage/lcov-report/index.html`
- [ ] Identify uncovered lines
- [ ] Write tests for critical paths first
- [ ] Gradually increase coverage

### "Auto-merge not working"

- [ ] Verify all CI checks passed
- [ ] Check PR has `auto-merge` label
- [ ] Verify GitHub Actions has write permissions
- [ ] Check branch protection rules
- [ ] Review GitHub Actions logs

### "CI is slow"

- [ ] Check if too many jobs running in parallel
- [ ] Review test performance
- [ ] Consider splitting tests into groups
- [ ] Use `--maxWorkers=2` in CI (already configured)
- [ ] Cache dependencies properly (already configured)

## 📚 Reference Documents

Quick links to documentation:

- [Test Plan](docs/TEST_PLAN.md) - Comprehensive guide
- [Quick Reference](docs/TESTING_QUICK_REFERENCE.md) - Cheat sheet
- [Setup Summary](TESTING_SETUP_SUMMARY.md) - What's been set up
- [This Checklist](TESTING_CHECKLIST.md) - You are here

## 🎓 Training Resources

For new team members:

1. **Day 1: Learn the Basics**
   - Read [TESTING_SETUP_SUMMARY.md](TESTING_SETUP_SUMMARY.md)
   - Run tests locally
   - Review example tests

2. **Day 2: Write Your First Test**
   - Pick a simple utility function
   - Write a test using [Quick Reference](docs/TESTING_QUICK_REFERENCE.md)
   - Get feedback from team

3. **Week 1: Regular Practice**
   - Write tests for all new code
   - Review test coverage reports
   - Ask questions in team discussions

4. **Month 1: Mastery**
   - Write tests for complex scenarios
   - Help others with testing questions
   - Contribute to testing documentation

## ✨ Success Criteria

You'll know testing is working when:

- ✅ All PRs have CI checks
- ✅ Coverage is maintained or improving
- ✅ Tests catch bugs before production
- ✅ Team writes tests proactively
- ✅ Auto-merge saves time on simple PRs
- ✅ CI runs complete in < 5 minutes
- ✅ Flaky tests are rare
- ✅ Documentation stays up to date

## 🎉 Celebrate Wins

Don't forget to celebrate:

- 🏆 First test written
- 🏆 Coverage milestones (60%, 70%, 80%)
- 🏆 Zero flaky tests for a month
- 🏆 Bug caught by tests
- 🏆 Fast CI builds
- 🏆 Successful auto-merge

---

**Remember:** Testing is an investment in code quality, developer confidence, and team velocity. Keep tests simple, focused, and maintainable! 🚀

