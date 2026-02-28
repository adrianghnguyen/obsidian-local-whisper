# Local Whisper Transcription

A fully local, privacy-focused speech-to-text plugin for Obsidian using OpenAI's Whisper AI model via Transformers.js. No internet required after initial model download, and all processing happens entirely in your browser.

## Features

- 🎤 **Local Audio Recording** - Record audio directly in Obsidian
- 🤖 **Offline Transcription** - Uses Whisper AI model locally in your browser
- 🔒 **Privacy First** - No data sent to external servers
- ⚡ **Fast & Efficient** - Tiny model (~40MB) with decent accuracy
- 🌍 **Multilingual Support** - English, Spanish, French, German, Chinese, Japanese, and more
- 📝 **Direct Insertion** - Transcribed text inserted at cursor position

## Installation

### For Development

1. Clone this repository to `C:\dev\obsidian-local-whisper`
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode
4. Create a symlink to your vault:
   ```powershell
   New-Item -ItemType SymbolicLink -Path "path\to\your\vault\.obsidian\plugins\local-whisper" -Target "C:\dev\obsidian-local-whisper"
   ```
5. Enable the plugin in Obsidian: Settings → Community Plugins → Enable "Local Whisper Transcription"
6. Reload Obsidian (Ctrl/Cmd + R) to see changes

### For End Users

1. Download the latest release files: `manifest.json`, `main.js`, `styles.css`
2. Create a folder `local-whisper` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Enable the plugin in Obsidian settings

## Usage

### Quick Start

1. Click the microphone icon in the left ribbon, OR
2. Open Command Palette (Ctrl/Cmd + P) and search for "Record audio"
3. Click "Start Recording" and speak
4. Click "Stop & Transcribe" when done
5. The transcribed text will be inserted at your cursor position

### Commands

- **Start audio recording** - Opens the recording modal
- **Record and insert transcription at cursor** - Records and inserts text at current cursor position

## Settings

Access settings via Settings → Local Whisper Transcription

- **Model** - Choose between different Whisper models:
  - Tiny English (39MB, fastest) - recommended for English-only
  - Tiny Multilingual (39MB)
  - Base English (74MB, better accuracy)
  - Base Multilingual (74MB)
  
- **Language** - Select transcription language (for multilingual models)
- **Max recording duration** - Set maximum recording length in seconds (default: 120)

## How It Works

1. **Audio Capture** - Uses browser's MediaRecorder API to capture microphone input
2. **Audio Processing** - Converts recorded audio to 16kHz Float32Array format required by Whisper
3. **Local Transcription** - Runs Whisper AI model entirely in-browser using Transformers.js
4. **Model Caching** - First use downloads the model (~40MB), then it's cached in browser IndexedDB

## Model Performance

- **Tiny models**: ~3-5 seconds for 30 seconds of audio on modern hardware
- **Base models**: ~8-15 seconds for 30 seconds of audio
- Model is downloaded once and cached permanently
- No internet required after initial model download

## Requirements

- Obsidian v0.15.0 or higher
- Modern browser with:
  - MediaRecorder API support
  - IndexedDB for model caching
  - Microphone permissions

## Privacy & Security

- ✅ All processing happens locally in your browser
- ✅ No data sent to external servers
- ✅ No API keys required
- ✅ No telemetry or analytics
- ✅ Works completely offline after initial model download

## Development

### Building

```bash
npm run build     # Production build
npm run dev       # Development mode with watch
npm run lint      # Check code quality
npm run lint:fix  # Auto-fix linting issues
```

### File Structure

```
local-whisper/
├── src/
│   ├── main.ts                  # Main plugin class
│   ├── settings.ts              # Settings interface and tab
│   ├── recording-modal.ts       # Recording UI modal
│   ├── transcription-service.ts # Whisper integration
│   └── audio-utils.ts           # Audio processing utilities
├── manifest.json                # Plugin metadata
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── esbuild.config.mjs          # Build configuration
└── styles.css                   # Plugin styles
```

## Troubleshooting

### Plugin doesn't load
- Make sure you've enabled Community Plugins in Obsidian settings
- Check that all three files (manifest.json, main.js, styles.css) are present
- Reload Obsidian (Ctrl/Cmd + R)

### Microphone not working
- Grant microphone permissions in your browser/OS
- Check that your microphone is working in other applications
- Try refreshing Obsidian

### Transcription fails
- First use may take time to download the model (~40MB)
- Check browser console (Ctrl/Cmd + Shift + I) for errors
- Ensure you have stable internet for initial model download
- Try a smaller model (Tiny instead of Base)

### Poor transcription quality
- Speak clearly and close to the microphone
- Reduce background noise
- Try the Base model for better accuracy (slower but more accurate)
- Ensure correct language is selected in settings

## Roadmap

- [ ] Support for audio file import and transcription
- [ ] Real-time streaming transcription
- [ ] Timestamp insertion
- [ ] Speaker diarization
- [ ] Custom model support

## Credits

- Built with [Transformers.js](https://huggingface.co/docs/transformers.js) by Hugging Face
- Uses [OpenAI's Whisper](https://github.com/openai/whisper) model
- Inspired by the existing Whisper plugin for Obsidian

## License

MIT

## Support

If you encounter issues or have suggestions, please open an issue on GitHub.
