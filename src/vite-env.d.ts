/// <reference types="vite/client" />

/**
 * Extend Window interface for WebGPU support check
 */
interface Navigator {
  gpu?: GPU;
}

/**
 * WebGPU type definitions (minimal for our use case)
 */
interface GPU {
  requestAdapter(): Promise<GPUAdapter | null>;
}

interface GPUAdapter {
  requestDevice(): Promise<GPUDevice>;
}

interface GPUDevice {
  destroy(): void;
}
