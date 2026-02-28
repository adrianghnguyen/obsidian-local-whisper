---
name: Local Speech-to-Text Plugin
overview: Create a self-contained Obsidian plugin that records audio and transcribes it locally using Transformers.js with the Whisper tiny model (~40MB). No internet required after initial model download.
todos:
  - id: setup-dev-env
    content: Clone official obsidian-sample-plugin to C:\dev\obsidian-local-whisper, initialize git repo, and install dependencies
    status: pending
  - id: create-config-files
    content: Update manifest.json with plugin details, add @huggingface/transformers to package.json, verify tsconfig.json and esbuild.config.mjs settings
    status: pending
  - id: implement-audio-recording
    content: Create RecordingModal class with MediaRecorder API for capturing microphone input and converting to proper format
    status: pending
  - id: implement-transcription
    content: Initialize Transformers.js pipeline and implement transcription logic with Whisper tiny model
    status: pending
  - id: create-plugin-class
    content: Implement main Plugin class with onload/onunload, ribbon icon, commands, and settings tab
    status: pending
  - id: build-and-test
    content: Create symlink to vault, build the plugin, enable in Obsidian, and test recording + transcription workflow
    status: pending
  - id: add-error-handling
    content: Add proper error handling for microphone permissions, model loading, and transcription failures
    status: pending
  - id: polish-and-document
    content: Add styles.css for UI polish, create README with usage instructions, and prepare for distribution
    status: pending
isProject: false
---

# Build Local Speech-to-Text Obsidian Plugin

This plan walks through creating a new Obsidian plugin from scratch that can record audio and transcribe it locally using Transformers.js. We'll follow the official Obsidian development approach using the [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) template as our foundation.

## Development Environment Setup

Required tools:

- **Node.js** (v16 or higher) - JavaScript runtime
- **npm** - Package manager (comes with Node.js)
- **Git** - Version control

We'll develop in a separate repository for clean version control, then link it to your vault for testing.

**Development location:** `C:\dev\obsidian-local-whisper\`
**Testing location:** `c:\Obsidian\.obsidian\plugins\local-whisper\` (symlinked)

This approach means:

- Clean git history separate from your vault
- Professional project structure for GitHub publishing
- Easy collaboration and community contributions
- Test changes in Obsidian via symlink or build script

The official template includes:

```
local-whisper/
├── .github/workflows/     # CI/CD configuration
├── manifest.json          # Plugin metadata
├── main.ts                # Main plugin code
├── package.json           # Node dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── esbuild.config.mjs     # Build configuration
├── eslint.config.mts      # Linting rules
├── version-bump.mjs       # Version management script
├── versions.json          # Compatibility matrix
└── styles.css             # Plugin styles
```

## Core Dependencies

From the official template (automatically configured):

- `obsidian` - Obsidian API types and interfaces (dev dependency)
- `typescript` - TypeScript compiler
- `esbuild` - Fast bundler for building main.js
- `@typescript-eslint/eslint-plugin` - TypeScript linting
- `@typescript-eslint/parser` - TypeScript parser for ESLint
- `builtin-modules` - Node.js built-in modules list

Additional dependency to add:

- `@huggingface/transformers` - Transformers.js library for local Whisper model

The Whisper tiny model (~40MB) will be downloaded automatically on first use and cached by the browser in IndexedDB.

## Key Implementation Components

**1. Audio Recording Interface**

- Use browser's `MediaRecorder` API to capture microphone input
- Create a modal UI with Start/Stop recording buttons
- Convert recorded audio to proper format (Float32Array at 16kHz sample rate)
- Display recording timer and status

**2. Transcription Engine**

- Initialize Transformers.js pipeline for automatic speech recognition
- Use model: `Xenova/whisper-tiny.en` (English) or `Xenova/whisper-tiny` (multilingual)
- Process audio blob and return transcribed text
- Show progress indicator during transcription

**3. Plugin Integration**

- Add ribbon icon for quick access to recording
- Add command palette commands (Start Recording, Insert Transcription)
- Insert transcribed text at cursor position in active note
- Settings tab for model selection and audio preferences

**4. TypeScript Configuration**
Critical settings in `tsconfig.json`:

- `module: "CommonJS"` - Required for Obsidian
- `target: "ES2018"` - Modern JS features
- `lib: ["DOM", "ES2018"]` - Include DOM APIs

**5. Build System**
Use esbuild for fast bundling:

- Bundle main.ts → main.js
- External: "obsidian" (provided by app)
- Format: CommonJS
- Platform: browser

## File Structure Details

**manifest.json** - Plugin metadata:

```json
{
  "id": "local-whisper",
  "name": "Local Whisper Transcription",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "Local speech-to-text using Transformers.js",
  "author": "Your Name",
  "isDesktopOnly": false
}
```

**main.ts** - Plugin class structure:

- Extend `Plugin` from obsidian module
- Implement `onload()` - Initialize pipeline, add commands/ribbon
- Implement `onunload()` - Cleanup resources
- Create `RecordingModal` class for UI
- Create settings interface and tab

**package.json** - Scripts (from official template):

- `dev` - Watch mode for development (automatically rebuilds on changes)
- `build` - Production build
- `version` - Bump version with `npm version patch/minor/major` (auto-updates manifest and versions.json)
- `lint` - Run ESLint to check code quality
- `lint:fix` - Auto-fix ESLint issues

## Development Workflow (Separate Repo Method)

1. **Clone template** - Clone obsidian-sample-plugin to `C:\dev\obsidian-local-whisper\`
2. **Initialize git** - Set up git repo with proper .gitignore
3. **Install dependencies** - Run `npm i` to install all packages
4. **Create symlink** - Link dev folder to vault plugins: 
   ```powershell
   New-Item -ItemType SymbolicLink -Path "c:\Obsidian\.obsidian\plugins\local-whisper" -Target "C:\dev\obsidian-local-whisper"
   ```
5. **Start dev mode** - Run `npm run dev` (watches for changes and auto-rebuilds)
6. **Enable in Obsidian** - Settings → Community Plugins → Enable "Local Whisper Transcription"
7. **Development cycle**:
   - Make changes to `main.ts` in dev folder
   - Changes automatically compile to `main.js`
   - Reload Obsidian (Ctrl/Cmd + R) to see changes
   - Test: Click ribbon icon → record audio → verify transcription
8. **Version control** - Commit changes to git as you develop
9. **Code quality** - Run `npm run lint` before committing

## Technical Considerations

**Audio Processing:**

- MediaRecorder typically outputs WebM/Ogg format
- Need to convert to WAV and resample to 16kHz for Whisper
- Use Web Audio API for resampling: `AudioContext.createBuffer()`

**Model Loading:**

- First run downloads model from HuggingFace CDN (~40MB)
- Browser caches model automatically (IndexedDB)
- Show loading indicator on first transcription
- Consider lazy loading pipeline only when needed

**Error Handling:**

- Check microphone permissions
- Handle model download failures
- Validate audio format before transcription
- User-friendly error messages in notices

**Performance:**

- Whisper tiny processes ~30s audio in 3-5 seconds on modern hardware
- Consider max recording length (default: 2 minutes)
- Show progress during transcription
- Run transcription in Web Worker to avoid UI blocking (optional enhancement)

## Distribution Preparation

When ready to release (official Obsidian process):

1. **Update versions** - Run `npm version patch` (or `minor`/`major`)
  - Automatically updates `manifest.json`, `package.json`, and `versions.json`
  - Or manually edit `minAppVersion` in `manifest.json` first
2. **Build production** - Run `npm run build` to create optimized `main.js`
3. **Create GitHub release** - Tag with version number (e.g., `1.0.0`, no `v` prefix)
4. **Upload files** - Attach `manifest.json`, `main.js`, `styles.css` as binary assets
5. **Test thoroughly** - Test in clean vault before publishing
6. **Submit to community** - PR to [obsidian-releases](https://github.com/obsidianmd/obsidian-releases) repo

See [Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) for full submission requirements.

## Common Pitfalls to Avoid

- Don't use ES modules - Obsidian requires CommonJS
- Don't forget `importHelpers: false` in tsconfig - prevents runtime errors  
- Don't bundle obsidian module - mark as external in esbuild
- Don't assume microphone access - always check permissions
- Don't transcribe very long audio - implement chunking or limits

The plugin will be fully self-contained after the initial model download, with no external API calls or internet dependency during normal use.