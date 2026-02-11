# Graison P. - Personal Website

This is the source code for my personal website hosted on GitHub Pages.

## Features

- Static HTML pages with responsive design
- Multiple project pages (WRD, WebWii, ObDevAuth, NightMail)
- Automated screenshot system for visual regression testing

## Automated Screenshot System

This repository includes an automated system that captures screenshots of all website pages after each commit.

### How It Works

1. **Trigger**: The workflow runs automatically when HTML, CSS, or JavaScript files are pushed to the main/master branch
2. **Screenshot Process**:
   - Sets up a Node.js environment with Playwright browser automation
   - Starts a local HTTP server to serve the static website
   - Discovers all HTML pages in the repository
   - Takes full-page screenshots of each page using Chromium
   - Uploads screenshots as workflow artifacts (retained for 90 days)
3. **Issue Creation**:
   - Creates a GitHub issue with:
     - Commit information (SHA, message, author, date)
     - List of all pages that were screenshotted
     - Link to download screenshots from workflow artifacts
     - Automated labels: `screenshots`, `automated`
     - Unique title with commit SHA and date

### Workflow Configuration

The workflow is defined in `.github/workflows/screenshot-pages.yml` and:
- Only triggers on changes to relevant files (HTML, CSS, JS, assets)
- Requires `issues: write` permission to create issues
- Uploads screenshots as artifacts for 90 days (default)
- Automatically cleans up the HTTP server after completion

### Pages Captured

The system automatically discovers and screenshots all HTML pages, including:
- `/index.html` - Main homepage
- `/nightmail.html` - NightMail project page
- `/webwii/index.html` - WebWii project page
- `/webwii/test-dolphin.html` - WebWii Dolphin test page
- `/obdevauth/index.html` - ObDevAuth project page
- `/wrd/index.html` - WRD project page
- `/wrd/privacy.html` - WRD privacy policy
- `/wrd/terms.html` - WRD terms of service

### Viewing Screenshots

After each commit that modifies the website:
1. Check the "Issues" tab for a new issue titled "📸 Website Screenshots - [commit-sha] - YYYY-MM-DD"
2. The issue lists all pages that were captured
3. Click the link in the issue to view the workflow run
4. Download the "page-screenshots" artifact from the workflow run to see all screenshots

## Development

To run the website locally:

```bash
# Using Python 3
python3 -m http.server 8080

# Using Node.js
npx http-server . -p 8080

# Using PHP
php -S localhost:8080
```

Then open `http://localhost:8080` in your browser.

## License

Personal website - All rights reserved.
