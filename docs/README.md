# GitHub Pages Setup Instructions

## Enable GitHub Pages

1. **Go to Repository Settings:**
   - Navigate to your repository on GitHub
   - Click on "Settings" tab
   - Scroll down to "Pages" in the left sidebar

2. **Configure GitHub Pages:**
   - Source: Select "GitHub Actions" (not "Deploy from a branch")
   - This allows the workflow to deploy the documentation

3. **First Deployment:**
   - Push changes to the `main` branch
   - Or manually trigger the workflow:
     - Go to "Actions" tab
     - Select "Deploy Documentation"
     - Click "Run workflow"

4. **Access Your Documentation:**
   - After successful deployment, your docs will be available at:
   - `https://[your-username].github.io/photobooth-ng/`

## Local Development

### Generate API Documentation
```bash
cd photobooth-ng
npm run docs:generate
```

### Serve Documentation Locally
```bash
# Install Jekyll dependencies (first time only)
cd docs
bundle install

# Serve locally
bundle exec jekyll serve
```

The documentation will be available at `http://localhost:4000/photobooth-ng/`

## Documentation Structure

```
docs/
├── _config.yml         # Jekyll configuration
├── Gemfile            # Ruby dependencies
├── index.md           # Main documentation page
├── api/               # Generated API documentation (Compodoc)
├── guides/            # User guides
├── hardware/          # Hardware setup guides
└── setup/             # Configuration guides
```

## Updating Documentation

1. **API Documentation** is automatically generated from TypeScript code comments
2. **Guides** are written in Markdown in the respective folders
3. **Jekyll** builds the static site from all Markdown files

## Troubleshooting

### GitHub Pages not building
- Check that GitHub Actions is selected as source
- Verify the workflow has run successfully in Actions tab
- Check for Jekyll build errors in the workflow logs

### API Documentation not generating
- Ensure all TypeScript files compile without errors
- Check that Compodoc is installed: `npm list @compodoc/compodoc`
- Run locally to debug: `npm run docs:generate`