export interface RawDetection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  score: number;
}

export interface ModelLoadProgress {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error?: string;
}

// Lazy-loaded model instance
let cocoModel: any = null;
let isLoadingModel = false;
let loadPromise: Promise<any> | null = null;

export async function loadDetectionModel(onProgress?: (progress: ModelLoadProgress) => void): Promise<any> {
  if (cocoModel) {
    onProgress?.({ status: 'loaded' });
    return cocoModel;
  }

  if (loadPromise) {
    return loadPromise;
  }

  onProgress?.({ status: 'loading' });
  isLoadingModel = true;

  loadPromise = (async () => {
    try {
      // Import tfjs and coco-ssd dynamically or directly
      const tf = await import('@tensorflow/tfjs');
      // Ensure tf backend is ready (webgl or cpu)
      await tf.ready();
      
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      // Load mobilenet_v2 model for high accuracy and speed
      cocoModel = await cocoSsd.load({
        base: 'lite_mobilenet_v2', // Fast, robust, runs smoothly in browser at 30+ fps
      });

      isLoadingModel = false;
      onProgress?.({ status: 'loaded' });
      return cocoModel;
    } catch (err: any) {
      isLoadingModel = false;
      loadPromise = null;
      const errorMsg = err?.message || 'Failed to load computer vision model.';
      onProgress?.({ status: 'error', error: errorMsg });
      throw new Error(errorMsg);
    }
  })();

  return loadPromise;
}

export async function detectObjects(
  imageElement: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  confidenceThreshold: number = 0.4
): Promise<RawDetection[]> {
  if (!cocoModel) {
    await loadDetectionModel();
  }

  if (!cocoModel) {
    return [];
  }

  try {
    // Run real COCO-SSD inference
    const predictions = await cocoModel.detect(imageElement, 30, confidenceThreshold);
    
    // predictions have { bbox: [x, y, width, height], class: string, score: number }
    return predictions.map((p: any) => ({
      bbox: [
        Math.max(0, Math.round(p.bbox[0])),
        Math.max(0, Math.round(p.bbox[1])),
        Math.max(1, Math.round(p.bbox[2])),
        Math.max(1, Math.round(p.bbox[3])),
      ],
      class: p.class.toLowerCase(),
      score: p.score,
    }));
  } catch (error) {
    console.error('Detection error:', error);
    return [];
  }
}
