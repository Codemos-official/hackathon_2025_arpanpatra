# InsightCast

A browser-based podcast analysis tool powered by local AI. Transcribe audio files, index them semantically, and search for concepts, not just keywords to jump to specific timestamps.

![Image](./public/image.webp)

## Features

- 🎙️ **Local Transcription** - Whisper AI runs entirely in your browser
- 🔍 **Semantic Search** - Find concepts and ideas, not just exact words
- 🔒 **Privacy First** - Your audio never leaves your device
- ⚡ **WebGPU Accelerated** - GPU-powered inference when available
- 📱 **Responsive UI** - Works on desktop, tablet, and mobile devices

## Tech Stack

- **Framework**: React 18 + Vite 5.x
- **Language**: TypeScript 5.x (Strict Mode)
- **Styling**: Tailwind CSS
- **AI Runtime**: @huggingface/transformers v3 (WebGPU support)
- **Vector Database**: @orama/orama (In-memory vector store)
- **State Management**: React Context + Custom Hooks

## Getting Started

### Prerequisites

- Node.js 18+ 
- A modern browser with WebGPU support (Chrome 113+, Edge 113+) for GPU acceleration
- Browsers without WebGPU will fall back to WASM (slower but works everywhere)

### Installation

##### Clone the repository
```bash
git clone https://github.com/Codemos-official/hackathon_2025_arpanpatra.git
cd insightcast
```

##### Install dependencies

```bash
npm install

```

##### Start development server

```bash
npm run dev

```

The app will be available at `http://localhost:5173`

## Architecture & System Design

### Main Thread Zero-Block Policy

All heavy compute tasks run inside a dedicated Web Worker:

* Model Loading (Whisper ASR + Embedding Model)
* Audio Transcription
* Embedding Generation
* Vector Search

The main thread handles only UI rendering and audio playback.

### Execution Flow

#### 1. Audio Processing Pipeline

This sequence details the "Write" path. When a file is uploaded, the UI thread offloads processing to the Web Worker to prevent freezing. The worker coordinates the Whisper ASR model for transcription and the Embedding model for vectorization before indexing data into Orama.

[![](https://mermaid.ink/img/pako:eNp1VF1P2zAU_StXfqGIFDWlX_EDUoEx9aGbVOiQpr648SW1SGzPdhhQ9b_v5qOsU7s8RLZzzrnX5zjestRIZJx5_FWiTvFOicyJYqWBHitcUKmyQgdYzkB4WKBIA0ythc5cKA2PG4dCnh_Dn4x7QVdRnnDdzk6gNsrbFtYOpzPoTB8WJyS_FGuUFbQeSKUzmFPz-THy7qaCfad9CPiBaTCOlla6AX4zAcG8UqnlLGo74zAtpTKwtLkREu5z87sBL2fd6-s9xhof5ui9yLCzhfBukcNZcEL71Kk1nkXgRWFz9BHI0omgjIZdu5HmTeapV0H1Dw1pxlWdxgIOi1LDTD-jqxKBTqvaKrWo7kFjCwylozDwLcDtptQvHi7gURXoA1H9YQe5MRbuyRAKcgMPmBWoQ_Pp315a6VquVj4BqoPg8BU1umpXrdef-fyl1EsnWm4YJ6TvbjhZ4NFRmiYtqy6h0-pfwByDkCKI8yMmUZczDp_xWGcyR5lV4QQKjpaUlvhG3Z3BrqGjlocW_UdpH7Stcu2SZpmHSrWx0O_FJB6FzCKWOSUZD67EiBXoClFN2bairFjYYIErxmko8VmQ7oqt9I5odJp_GlPsmc6U2YbxZ5F7mpWWLNj_sJ-rdGYkultT6sB4Ese1CONb9sZ4P44v-_E4GY8G_WFvkCTDiL0zPk4ur5LxoJcMB8O4P5qMdhH7qMv2LsejySSOr8aTQb8_IGbEUCoKYd5cG_XtsfsDmGVhTw?type=png)](https://mermaid.live/edit#pako:eNp1VF1P2zAU_StXfqGIFDWlX_EDUoEx9aGbVOiQpr648SW1SGzPdhhQ9b_v5qOsU7s8RLZzzrnX5zjestRIZJx5_FWiTvFOicyJYqWBHitcUKmyQgdYzkB4WKBIA0ythc5cKA2PG4dCnh_Dn4x7QVdRnnDdzk6gNsrbFtYOpzPoTB8WJyS_FGuUFbQeSKUzmFPz-THy7qaCfad9CPiBaTCOlla6AX4zAcG8UqnlLGo74zAtpTKwtLkREu5z87sBL2fd6-s9xhof5ui9yLCzhfBukcNZcEL71Kk1nkXgRWFz9BHI0omgjIZdu5HmTeapV0H1Dw1pxlWdxgIOi1LDTD-jqxKBTqvaKrWo7kFjCwylozDwLcDtptQvHi7gURXoA1H9YQe5MRbuyRAKcgMPmBWoQ_Pp315a6VquVj4BqoPg8BU1umpXrdef-fyl1EsnWm4YJ6TvbjhZ4NFRmiYtqy6h0-pfwByDkCKI8yMmUZczDp_xWGcyR5lV4QQKjpaUlvhG3Z3BrqGjlocW_UdpH7Stcu2SZpmHSrWx0O_FJB6FzCKWOSUZD67EiBXoClFN2bairFjYYIErxmko8VmQ7oqt9I5odJp_GlPsmc6U2YbxZ5F7mpWWLNj_sJ-rdGYkultT6sB4Ese1CONb9sZ4P44v-_E4GY8G_WFvkCTDiL0zPk4ur5LxoJcMB8O4P5qMdhH7qMv2LsejySSOr8aTQb8_IGbEUCoKYd5cG_XtsfsDmGVhTw)

#### 2. Semantic Search Flow

This sequence details the "Read" path. When a user queries a concept (e.g., "happiness"), the system converts the query into a vector and performs a similarity search against the indexed audio segments.

[![](https://mermaid.ink/img/pako:eNptU01v2zAM_SuEDmuHOYHz4dTWoYckA5JDMKxZV6DwRbEZW1gsuZK8LQv830fFbpF-GLYhUo98fKR0YpnOkXFm8alBleFSisKIKlVATy2Mk5mshXJwb9F84F2DsHCHInOw0FWtFSr3HvagzS80HvqAu956j1rOPeIb0Qv4iZnThlyp6oCef3B7e7_m8ONYI3xv0Bw5pCSAyq4d6D2Uoq6lQmtT1getKaSj41Br6za0KQq8PoGjJByuLAqTlVcBPPl80H7uArs_qZK_hcNXFXfri7xfqx3mXT2wdUaq4g1wOefPerZnOrheHXdG5hzmm3EEX_rdnns5H1xkv0PXGAULoXKZ-1pW0tlXBH1X3kgaGLTNwVmS1q-g7cJy_FDXRcd8rzkRFeWBPkdVFxXN1cIn2Jb6D6xQuErULGAFqWDcmQYDVqGphDfZyedKmSuxwpT5IeW4F1SDn0tLYTTuR62r50ijm6JkfC8Olqym9jr7g_jiNahyNAvdKMd4MonOSRg_sb-Mj25mwzAZTcfxLJzGYTQJ2JFA0TAZR6Momd6EsySOkjZg_86s4TAex6NkHIb0hrPJNA4Y5pJGsOluw_lStP8B5rIBMA?type=png)](https://mermaid.live/edit#pako:eNptU01v2zAM_SuEDmuHOYHz4dTWoYckA5JDMKxZV6DwRbEZW1gsuZK8LQv830fFbpF-GLYhUo98fKR0YpnOkXFm8alBleFSisKIKlVATy2Mk5mshXJwb9F84F2DsHCHInOw0FWtFSr3HvagzS80HvqAu956j1rOPeIb0Qv4iZnThlyp6oCef3B7e7_m8ONYI3xv0Bw5pCSAyq4d6D2Uoq6lQmtT1getKaSj41Br6za0KQq8PoGjJByuLAqTlVcBPPl80H7uArs_qZK_hcNXFXfri7xfqx3mXT2wdUaq4g1wOefPerZnOrheHXdG5hzmm3EEX_rdnns5H1xkv0PXGAULoXKZ-1pW0tlXBH1X3kgaGLTNwVmS1q-g7cJy_FDXRcd8rzkRFeWBPkdVFxXN1cIn2Jb6D6xQuErULGAFqWDcmQYDVqGphDfZyedKmSuxwpT5IeW4F1SDn0tLYTTuR62r50ijm6JkfC8Olqym9jr7g_jiNahyNAvdKMd4MonOSRg_sb-Mj25mwzAZTcfxLJzGYTQJ2JFA0TAZR6Momd6EsySOkjZg_86s4TAex6NkHIb0hrPJNA4Y5pJGsOluw_lStP8B5rIBMA)

### AI Models

* **ASR**: `onnx-community/whisper-base` - Speech recognition
* **Embeddings**: `mixedbread-ai/mxbai-embed-xsmall-v1` - Semantic embeddings (384 dims)

### WebGPU Fallback

The app automatically detects WebGPU availability:

1. Attempts WebGPU initialization first (faster)
2. Falls back to WASM if WebGPU unavailable
3. Notifies user of current mode via status indicator

## Usage

1. **Wait for Model Loading** - First load downloads ~150MB of AI models
2. **Upload Audio** - Drag and drop or click to select (MP3, WAV, M4A, OGG, WebM, FLAC)
3. **Wait for Transcription** - Processing time depends on audio length and device
4. **Search** - Enter concepts, topics, or questions in the search bar
5. **Navigate** - Click segments or waveform regions to jump to timestamps

## Supported Audio Formats

* MP3
* WAV
* M4A
* OGG
* WebM
* FLAC

## Browser Compatibility

| Browser | WebGPU | WASM Fallback |
| --- | --- | --- |
| Chrome 113+ | ✅ | ✅ |
| Edge 113+ | ✅ | ✅ |
| Firefox | ❌ | ✅ |
| Safari 18+ | ✅ | ✅ |

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── AudioVisualizer.tsx
│   ├── AudioPlayer.tsx
│   ├── DropZone.tsx
│   ├── SearchBar.tsx
│   └── TranscriptView.tsx
├── hooks/               # Custom React hooks
│   ├── useInsight.ts
│   ├── useAudioPlayer.ts
│   └── InsightContext.tsx
├── types.ts             # TypeScript definitions
├── worker.ts            # AI Web Worker
├── App.tsx              # Main application
└── main.tsx             # Entry point

```

### Key Configuration

* `vite.config.ts` - WASM asset copying and worker configuration
* `tsconfig.json` - TypeScript strict mode with WebWorker lib
* `tailwind.config.js` - Custom color palette and animations

## Performance Tips

* First load is slower due to model download (~150MB)
* Models are cached in browser storage after first download
* WebGPU provides 2-5x faster inference than WASM
* Shorter audio files transcribe faster
* Close other GPU-intensive applications for best performance

## Acknowledgments

* [Hugging Face Transformers.js](https://github.com/xenova/transformers.js)
* [Orama Search](https://github.com/oramasearch/orama)
* [OpenAI Whisper](https://github.com/openai/whisper)
