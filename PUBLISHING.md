# Publishing JS/TS Notebook to VS Code Marketplace

## Step 1 — Create a Publisher Account (one-time, manual)

These steps require a browser. Do them before running any commands.

1. **Sign in to Azure DevOps** at https://dev.azure.com with a Microsoft account (create one free if needed).
2. **Create a Personal Access Token (PAT)**:
   - Go to **User Settings → Personal Access Tokens → New Token**
   - Name: `vsce-publish`
   - Organization: **All accessible organizations**
   - Expiration: 1 year (or max allowed)
   - Scopes: **Marketplace → Manage** (tick only this)
   - Copy the token — you only see it once
3. **Create a publisher** at https://marketplace.visualstudio.com/manage
   - Click **Create Publisher**
   - Choose a Publisher ID (e.g. `your-name` or `your-handle`) — this is permanent and public
   - Fill in display name, description, and optionally a website

> The publisher ID you choose must match the `"publisher"` field in `package.json`.

---

## Step 2 — Update `package.json`

Replace the placeholder `publisher` and add the required/recommended marketplace fields.

**Fields to add/change:**

```json
{
  "publisher": "<your-publisher-id>",
  "repository": {
    "type": "git",
    "url": "https://github.com/<you>/jstsnotebook"
  },
  "bugs": {
    "url": "https://github.com/<you>/jstsnotebook/issues"
  },
  "homepage": "https://github.com/<you>/jstsnotebook#readme",
  "license": "MIT",
  "icon": "media/icon.png",
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  },
  "keywords": ["notebook", "javascript", "typescript", "repl", "interactive", "jupyter"],
  "categories": ["Notebooks", "Programming Languages"]
}
```

---

## Step 3 — Create Required Files

### 3a. `LICENSE`

Create a `LICENSE` file at the project root:

```
MIT License

Copyright (c) 2026 <Your Name>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 3b. `CHANGELOG.md`

Create `CHANGELOG.md` at the project root:

```markdown
# Changelog

## [0.1.0] — 2026-04-07

### Added
- `.jsnb` notebook format with per-cell JavaScript and TypeScript support
- Shared vm.Context across cells — variables persist between cells
- Top-level `await` in all cells
- `return value` display with inline ↩ output
- Full `require()` support for npm packages
- Markdown cells
- Custom error renderer with collapsible stack trace
- Restart Kernel and Clear All Outputs commands
```

### 3c. `media/icon.png`

The icon must be a **128×128 PNG** (256×256 recommended for retina). Options:
- Design your own in Figma, Canva, or any image editor — save as `media/icon.png`
- Without an icon the extension still publishes, but listings with icons get more installs

### 3d. Fix `.vscodeignore`

The current `.vscodeignore` has a bug — `!src/**` at the bottom re-includes the `src/` directory.
Replace the whole file with:

```
.vscode/
src/
node_modules/
tsconfig*.json
esbuild.mjs
.gitignore
.vscodeignore
testNotebooks/
**/*.map
```

---

## Step 4 — Package and Inspect the `.vsix`

```bash
npm run build
npx @vscode/vsce package
```

This produces `jstsnotebook-0.1.0.vsix`. Inspect it before publishing:

```bash
# List all files that will ship
npx @vscode/vsce ls
```

**Should contain:**
- `out/extension.js`
- `out/renderer.js`
- `package.json`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `media/icon.png`

**Should NOT contain:** `src/`, `node_modules/`, `.ts` source files

### Smoke-test locally

```bash
code --install-extension jstsnotebook-0.1.0.vsix
```

Open `testNotebooks/sample.jsnb` and verify all cells run correctly.

---

## Step 5 — Publish

```bash
# Login once with your PAT
npx @vscode/vsce login <your-publisher-id>

# Build and publish
npm run build && npx @vscode/vsce publish
```

The extension goes live within ~5 minutes at:
`https://marketplace.visualstudio.com/items?itemName=<publisher-id>.jstsnotebook`

---

## Step 6 — Future Releases

For every new version:

1. Make code changes
2. Update version in `package.json` (semver: `0.1.1` for fixes, `0.2.0` for features)
3. Add entry to `CHANGELOG.md`
4. Run:

```bash
npm run build && npx @vscode/vsce publish
```

Or let vsce bump the version automatically:

```bash
npx @vscode/vsce publish patch   # 0.1.0 → 0.1.1
npx @vscode/vsce publish minor   # 0.1.0 → 0.2.0
npx @vscode/vsce publish major   # 0.1.0 → 1.0.0
```

---

## Files to Create / Modify

| File | Action | Required? |
|---|---|---|
| `package.json` | Update `publisher`, add `repository`, `icon`, `keywords`, `galleryBanner`, `license` | Required |
| `LICENSE` | Create MIT license text | Required |
| `CHANGELOG.md` | Create with v0.1.0 entry | Required |
| `media/icon.png` | Create 128×128 PNG icon | Strongly recommended |
| `.vscodeignore` | Fix `!src/**` bug, add `.vscode/` exclusion | Required (fix bug) |

---

## Pre-publish Checklist

- [ ] Publisher account created at marketplace.visualstudio.com
- [ ] PAT generated (Marketplace → Manage scope, all orgs)
- [ ] `publisher` in `package.json` matches your publisher ID
- [ ] `repository` URL added and repo exists
- [ ] `LICENSE` file present at root
- [ ] `CHANGELOG.md` present at root
- [ ] `media/icon.png` is 128×128 (or larger) PNG
- [ ] `npx @vscode/vsce ls` shows only the right files
- [ ] `.vsix` installed locally and smoke-tested
- [ ] `npx @vscode/vsce login` succeeds
