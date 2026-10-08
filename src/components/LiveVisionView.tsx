import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Upload,
  Play,
  Pause,
  Sliders,
  ShieldCheck,
  Crosshair,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Maximize2,
  Layers,
  Eye,
  CheckCircle2,
  Video,
  Info,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { RawDetection, detectObjects, loadDetectionModel } from '../services/detector';
import { ObjectTracker, VEHICLE_CLASSES } from '../services/tracker';
import { renderVisionOverlay } from '../services/canvasRenderer';
import { generateSceneSummary } from '../services/sceneSummary';
import {
  TrackedObject,
  SmartZone,
  ZoneStats,
  ZoneAlert,
  SceneStats,
  DetectionSnapshot,
} from '../types/vision';

interface LiveVisionViewProps {
  onCaptureSnapshot: (snapshot: DetectionSnapshot) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

// Curated reliable public video clips for instant demonstration
const SAMPLE_VIDEOS = [
  {
    name: 'City Traffic & Vehicles',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    description: 'Highway traffic and vehicles with real motion',
  },
  {
    name: 'MDN Web Media Clip',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    description: 'Natural scene sample clip',
  },
];

export const LiveVisionView: React.FC<LiveVisionViewProps> = ({
  onCaptureSnapshot,
  showToast,
}) => {
  // Video and Canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Animation frame and tracker refs
  const animFrameIdRef = useRef<number | null>(null);
  const trackerRef = useRef<ObjectTracker>(new ObjectTracker());
  const isDetectingRef = useRef<boolean>(false);

  // Stream state
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [streamType, setStreamType] = useState<'camera' | 'video' | 'sample'>('camera');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Model loading state
  const [modelState, setModelState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [modelError, setModelError] = useState<string | null>(null);

  // Settings
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.45);
  const [showTrajectories, setShowTrajectories] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Tracking & Detection State
  const [trackedObjects, setTrackedObjects] = useState<TrackedObject[]>([]);
  const [allDetectedClasses, setAllDetectedClasses] = useState<string[]>([]);
  const [focusClass, setFocusClass] = useState<string | null>(null);

  // Smart Zone State
  const [smartZone, setSmartZone] = useState<SmartZone>({
    x: 25,
    y: 20,
    width: 50,
    height: 60,
    active: true,
    name: 'Primary Perimeter',
  });
  const [zoneStats, setZoneStats] = useState<ZoneStats>({
    objectsInside: 0,
    objectsEntered: 0,
    objectsExited: 0,
  });
  const [zoneAlerts, setZoneAlerts] = useState<ZoneAlert[]>([]);

  // FPS calculation based on real requestAnimationFrame times
  const [fps, setFps] = useState<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  // Pre-load model on mount
  useEffect(() => {
    let isMounted = true;
    setModelState('loading');

    loadDetectionModel((progress) => {
      if (!isMounted) return;
      if (progress.status === 'loaded') {
        setModelState('ready');
      } else if (progress.status === 'error') {
        setModelState('error');
        setModelError(progress.error || 'Failed to load detection model');
      }
    })
      .then(() => {
        if (isMounted) setModelState('ready');
      })
      .catch((err) => {
        if (isMounted) {
          setModelState('error');
          setModelError(err.message || 'Failed to load model');
        }
      });

    // Wire up tracker alerts callback
    trackerRef.current.setAlertCallback((alert) => {
      setZoneAlerts((prev) => [alert, ...prev].slice(0, 8));
      if (alert.type === 'enter') {
        showToast(alert.message, 'warning');
      }
    });

    return () => {
      isMounted = false;
      stopStream();
    };
  }, []);

  // Sync confidence threshold ref for the loop
  const thresholdRef = useRef(confidenceThreshold);
  useEffect(() => {
    thresholdRef.current = confidenceThreshold;
  }, [confidenceThreshold]);

  // Sync focus class ref
  const focusClassRef = useRef(focusClass);
  useEffect(() => {
    focusClassRef.current = focusClass;
  }, [focusClass]);

  // Sync options
  const showTrajectoriesRef = useRef(showTrajectories);
  useEffect(() => {
    showTrajectoriesRef.current = showTrajectories;
  }, [showTrajectories]);

  const showLabelsRef = useRef(showLabels);
  useEffect(() => {
    showLabelsRef.current = showLabels;
  }, [showLabels]);

  const smartZoneRef = useRef(smartZone);
  useEffect(() => {
    smartZoneRef.current = smartZone;
  }, [smartZone]);

  // Start Webcam
  const startCamera = async () => {
    setCameraError(null);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStreamActive(true);
          setStreamType('camera');
          setIsPlaying(true);
          startDetectionLoop();
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      let message = 'Failed to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. Please allow camera access in your browser settings to enable live object detection.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera device found on your system. You can test detection using Upload Video or Sample Clips.';
      } else {
        message = err.message || 'Camera unavailable. Please check your camera connection.';
      }
      setCameraError(message);
      showToast(message, 'error');
    }
  };

  // Stop Webcam / Stream
  const stopStream = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
    }

    trackerRef.current.reset();
    setTrackedObjects([]);
    setStreamActive(false);
    setIsPlaying(false);
  };

  // Switch to Sample Video
  const handleSelectSample = (sampleUrl: string) => {
    stopStream();
    setCameraError(null);
    setVideoSrc(sampleUrl);
    setStreamType('sample');

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.crossOrigin = 'anonymous';
      videoRef.current.src = sampleUrl;
      videoRef.current.loop = true;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        setStreamActive(true);
        setIsPlaying(true);
        startDetectionLoop();
      };
    }
  };

  // Upload Video File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast('Please select a valid video file (MP4, WebM, etc.)', 'warning');
      return;
    }

    stopStream();
    setCameraError(null);
    const objectUrl = URL.createObjectURL(file);
    setVideoSrc(objectUrl);
    setStreamType('video');

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = objectUrl;
      videoRef.current.loop = true;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        setStreamActive(true);
        setIsPlaying(true);
        startDetectionLoop();
      };
    }

    showToast(`Loaded video file: ${file.name}`, 'info');
  };

  // Pause / Resume
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      startDetectionLoop();
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    }
  };

  // Main Detection & Tracking Loop
  const startDetectionLoop = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }

    const processFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.paused || video.ended || video.readyState < 2) {
        animFrameIdRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // Calculate real FPS
      const now = performance.now();
      frameCountRef.current++;
      if (now - lastTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      // Ensure canvas matches video resolution
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 480;

      if (canvas.width !== vWidth || canvas.height !== vHeight) {
        canvas.width = vWidth;
        canvas.height = vHeight;
      }

      // Run real detection inference (avoid concurrency queue buildup)
      if (!isDetectingRef.current) {
        isDetectingRef.current = true;
        try {
          // 1. Detect objects using real COCO-SSD
          const rawDetections: RawDetection[] = await detectObjects(
            video,
            thresholdRef.current
          );

          // 2. Track objects across frames with ByteTrack/IoU tracker
          const updatedTracks = trackerRef.current.update(
            rawDetections,
            smartZoneRef.current,
            vWidth,
            vHeight
          );

          // 3. Update React state for UI panels
          setTrackedObjects(updatedTracks);
          setZoneStats(trackerRef.current.getZoneStats());

          // Track unique seen classes for Focus Mode
          const classesInFrame = Array.from(new Set(updatedTracks.map((t) => t.class)));
          if (classesInFrame.length > 0) {
            setAllDetectedClasses((prev) => {
              const combined = Array.from(new Set([...prev, ...classesInFrame]));
              return combined.sort();
            });
          }

          // 4. Draw bounding boxes, trajectories, labels, and smart zone onto overlay canvas
          const ctx = canvas.getContext('2d');
          if (ctx) {
            renderVisionOverlay(
              ctx,
              vWidth,
              vHeight,
              updatedTracks,
              smartZoneRef.current,
              trackerRef.current.getZoneStats(),
              {
                focusClass: focusClassRef.current,
                showTrajectories: showTrajectoriesRef.current,
                showLabels: showLabelsRef.current,
                confidenceThreshold: thresholdRef.current,
              }
            );
          }
        } catch (err) {
          console.error('Frame processing error:', err);
        } finally {
          isDetectingRef.current = false;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);
  }, []);

  // CAPTURE DETECTION FEATURE
  const handleCaptureDetection = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !streamActive) {
      showToast('Start camera or video before capturing detection.', 'warning');
      return;
    }

    try {
      // Determine optimal snapshot dimensions (max 960px to keep size under 60KB while crisp)
      const maxDim = 960;
      const srcW = canvas.width || 640;
      const srcH = canvas.height || 480;
      const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
      const targetW = Math.max(320, Math.round(srcW * scale));
      const targetH = Math.max(240, Math.round(srcH * scale));

      // Create offscreen canvas combining video frame + overlay annotations
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = targetW;
      captureCanvas.height = targetH;
      const ctx = captureCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context unavailable');
      }

      // Draw current video frame and detection overlays onto scaled canvas
      ctx.drawImage(video, 0, 0, targetW, targetH);
      ctx.drawImage(canvas, 0, 0, targetW, targetH);

      // Watermark with VisionTrack branding & timestamp
      ctx.save();
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(7, 17, 31, 0.85)';
      const brandText = 'VISIONTRACK AI • Captured Frame';
      const m = ctx.measureText(brandText);
      ctx.fillRect(12, 12, m.width + 20, 26);
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(brandText, 22, 29);
      ctx.restore();

      // Export as high-quality compressed JPEG (~40-60KB instead of 3-5MB PNG)
      let imageSrc = captureCanvas.toDataURL('image/jpeg', 0.82);
      if (!imageSrc || imageSrc.length < 50) {
        imageSrc = captureCanvas.toDataURL('image/png');
      }

      // Compute stats
      const totalObjects = trackedObjects.length;
      const peopleCount = trackedObjects.filter((t) => t.isPerson).length;
      const vehicleCount = trackedObjects.filter((t) => t.isVehicle).length;

      const classCounts: Record<string, number> = {};
      trackedObjects.forEach((t) => {
        classCounts[t.class] = (classCounts[t.class] || 0) + 1;
      });

      const now = new Date();
      const dateFormatted = now.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeFormatted = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const snapshot: DetectionSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: Date.now(),
        dateFormatted,
        timeFormatted,
        imageSrc,
        totalObjects,
        peopleCount,
        vehicleCount,
        classesDetected: Object.keys(classCounts),
        classCounts,
        trackedObjects: trackedObjects.map((t) => ({
          displayId: t.displayId,
          class: t.class,
          score: t.score,
          bbox: t.bbox,
        })),
        sceneSummary: generateSceneSummary(trackedObjects),
      };

      onCaptureSnapshot(snapshot);
      showToast('Detection captured successfully.', 'success');
    } catch (err: any) {
      console.error('Capture error:', err);
      showToast('Failed to capture frame.', 'error');
    }
  };

  // Smart Zone handlers
  const handleToggleZone = () => {
    setSmartZone((prev) => ({ ...prev, active: !prev.active }));
  };

  const handleClearZone = () => {
    setSmartZone((prev) => ({ ...prev, active: false }));
    trackerRef.current.resetZoneStats();
    setZoneStats({ objectsInside: 0, objectsEntered: 0, objectsExited: 0 });
    setZoneAlerts([]);
    showToast('Smart Zone cleared.', 'info');
  };

  const handleCreateZone = () => {
    setSmartZone((prev) => ({
      ...prev,
      active: true,
      x: 25,
      y: 20,
      width: 50,
      height: 60,
    }));
    trackerRef.current.resetZoneStats();
    setZoneStats({ objectsInside: 0, objectsEntered: 0, objectsExited: 0 });
    showToast('Smart monitoring zone armed.', 'success');
  };

  // Focus Mode handlers
  const handleToggleFocus = (cls: string) => {
    if (focusClass === cls) {
      setFocusClass(null);
    } else {
      setFocusClass(cls);
    }
  };

  const handleClearFocus = () => {
    setFocusClass(null);
  };

  // Compute live scene stats
  const totalDetected = trackedObjects.length;
  const peopleCount = trackedObjects.filter((t) => t.isPerson).length;
  const vehicleCount = trackedObjects.filter((t) => t.isVehicle).length;
  const trackingCount = trackedObjects.filter((t) => t.age > 1).length;

  const currentClassCounts: Record<string, number> = {};
  trackedObjects.forEach((t) => {
    currentClassCounts[t.class] = (currentClassCounts[t.class] || 0) + 1;
  });

  const sceneSummary = generateSceneSummary(trackedObjects);

  return (
    <div className="space-y-6 py-4">
      {/* Hidden File Input for Video Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Large Live Camera / Video Area (7 or 8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Main Video Viewport Card */}
          <div
            ref={containerRef}
            className="relative rounded-2xl bg-[#07111F] border border-cyan-500/30 overflow-hidden shadow-2xl flex flex-col justify-center items-center min-h-[380px] sm:min-h-[460px] aspect-video group"
          >
            {/* Background Scanner Grid pattern */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #00f0ff 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-contain ${
                streamActive ? 'block' : 'hidden'
              }`}
            />

            {/* Canvas Overlay for Bounding Boxes & Tracking IDs */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${
                streamActive ? 'block' : 'hidden'
              }`}
            />

            {/* HUD Header Telemetry Overlay */}
            {streamActive && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono pointer-events-none select-none z-10">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#07111F]/80 backdrop-blur-sm border border-cyan-500/40 text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="font-bold tracking-wider">
                    {streamType === 'camera'
                      ? 'LIVE CAM'
                      : streamType === 'sample'
                      ? 'SAMPLE FEED'
                      : 'VIDEO FILE'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded bg-[#07111F]/80 backdrop-blur-sm border border-cyan-500/40 text-emerald-400 font-bold">
                    FPS: {fps}
                  </div>
                  <div className="hidden sm:block px-2.5 py-1 rounded bg-[#07111F]/80 backdrop-blur-sm border border-white/10 text-slate-300">
                    MODEL: COCO-SSD
                  </div>
                </div>
              </div>
            )}

            {/* Initial Idle or Error State */}
            {!streamActive && (
              <div className="text-center p-6 max-w-md z-10 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/20">
                  {cameraError ? (
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                  ) : (
                    <Camera className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {cameraError ? 'Camera Connection Issue' : 'Live Vision Inactive'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {cameraError
                      ? cameraError
                      : 'Initialize live computer vision by activating your webcam or loading sample footage to detect and track objects in real time.'}
                  </p>
                </div>

                {/* Quick Start Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={startCamera}
                    disabled={modelState === 'loading'}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Camera</span>
                  </button>

                  <button
                    onClick={() => handleSelectSample(SAMPLE_VIDEOS[0].url)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 transition-all cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    <span>Run Sample Footage</span>
                  </button>
                </div>

                {/* Model loading status indicator */}
                {modelState === 'loading' && (
                  <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyan-300 pt-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Initializing Neural Vision Engine...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Camera & Feed Controls Bar */}
          <div className="rounded-2xl bg-[#0D1B2A] border border-white/10 p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {streamActive ? (
                <button
                  onClick={stopStream}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>Stop Stream</span>
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  disabled={modelState === 'loading'}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera</span>
                </button>
              )}

              {/* Upload video file */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer"
                title="Upload local MP4 or WebM video file"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Upload Video</span>
              </button>

              {/* Pause / Play */}
              {streamActive && (
                <button
                  onClick={togglePlayPause}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                  title={isPlaying ? 'Pause Feed' : 'Resume Feed'}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 text-amber-400" />
                      <span className="hidden sm:inline">Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-emerald-400" />
                      <span className="hidden sm:inline">Resume</span>
                    </>
                  )}
                </button>
              )}

              {/* CAPTURE DETECTION BUTTON */}
              <button
                onClick={handleCaptureDetection}
                disabled={!streamActive}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-purple-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Camera className="w-4 h-4 text-cyan-300" />
                <span>Capture Detection</span>
              </button>
            </div>

            {/* Secondary Toggles (Trajectories & Labels) */}
            <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={showTrajectories}
                  onChange={(e) => setShowTrajectories(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Motion Trails</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>ID Labels</span>
              </label>
            </div>
          </div>

          {/* Sample Footage Selector Bar */}
          <div className="rounded-xl bg-[#0D1B2A]/70 border border-white/5 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-mono flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>Presets:</span>
            </span>

            <div className="flex flex-wrap gap-2">
              {SAMPLE_VIDEOS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSample(s.url)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    videoSrc === s.url && streamType === 'sample'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* SMART ZONE CONFIGURATION & CONTROLS */}
          <div className="rounded-2xl bg-[#0D1B2A] border border-white/10 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">SMART MONITORING ZONE</h4>
                  <p className="text-[11px] text-slate-400">
                    Defines a spatial perimeter to monitor target entries and exits in real time.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {smartZone.active ? (
                  <button
                    onClick={handleClearZone}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                  >
                    Clear Zone
                  </button>
                ) : (
                  <button
                    onClick={handleCreateZone}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors"
                  >
                    Create Zone
                  </button>
                )}
              </div>
            </div>

            {/* Smart Zone Sliders (Position & Size) */}
            {smartZone.active && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>X Offset</span>
                    <span className="text-cyan-300">{smartZone.x}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={smartZone.x}
                    onChange={(e) =>
                      setSmartZone((prev) => ({ ...prev, x: Number(e.target.value) }))
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Y Offset</span>
                    <span className="text-cyan-300">{smartZone.y}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={smartZone.y}
                    onChange={(e) =>
                      setSmartZone((prev) => ({ ...prev, y: Number(e.target.value) }))
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Width</span>
                    <span className="text-cyan-300">{smartZone.width}%</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="90"
                    value={smartZone.width}
                    onChange={(e) =>
                      setSmartZone((prev) => ({ ...prev, width: Number(e.target.value) }))
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Height</span>
                    <span className="text-cyan-300">{smartZone.height}%</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="90"
                    value={smartZone.height}
                    onChange={(e) =>
                      setSmartZone((prev) => ({ ...prev, height: Number(e.target.value) }))
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            )}

            {/* Smart Zone Live Stats */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  Objects Inside
                </span>
                <span
                  className={`text-xl font-bold font-mono mt-0.5 block ${
                    zoneStats.objectsInside > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-300'
                  }`}
                >
                  {zoneStats.objectsInside}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  Objects Entered
                </span>
                <span className="text-xl font-bold font-mono text-cyan-300 mt-0.5 block">
                  {zoneStats.objectsEntered}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">
                  Objects Exited
                </span>
                <span className="text-xl font-bold font-mono text-purple-300 mt-0.5 block">
                  {zoneStats.objectsExited}
                </span>
              </div>
            </div>

            {/* Smart Zone Live Alerts Log */}
            {zoneAlerts.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                  <span>ZONE EVENT LOG</span>
                  <span>{zoneAlerts.length} events</span>
                </div>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {zoneAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between ${
                        alert.type === 'enter'
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                          : 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            alert.type === 'enter' ? 'bg-amber-400' : 'bg-blue-400'
                          }`}
                        />
                        {alert.message}
                      </span>
                      <span className="text-[10px] opacity-75">{alert.formattedTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AI Intelligence Panel (4 or 5 cols on desktop) */}
        <div className="lg:col-span-4 space-y-4">
          {/* 4 Real-Time Metrics Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* OBJECTS DETECTED */}
            <div className="p-4 rounded-2xl bg-[#0D1B2A] border border-cyan-500/20 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Objects Detected
                </span>
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-3xl font-extrabold font-mono text-cyan-300">
                {totalDetected.toString().padStart(2, '0')}
              </p>
              <span className="text-[10px] text-slate-400">Current visible frame</span>
            </div>

            {/* PEOPLE */}
            <div className="p-4 rounded-2xl bg-[#0D1B2A] border border-purple-500/20 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  People
                </span>
                <span className="w-2 h-2 rounded-full bg-purple-400" />
              </div>
              <p className="text-3xl font-extrabold font-mono text-purple-300">
                {peopleCount.toString().padStart(2, '0')}
              </p>
              <span className="text-[10px] text-slate-400">Class: person</span>
            </div>

            {/* VEHICLES */}
            <div className="p-4 rounded-2xl bg-[#0D1B2A] border border-blue-500/20 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Vehicles
                </span>
                <span className="w-2 h-2 rounded-full bg-blue-400" />
              </div>
              <p className="text-3xl font-extrabold font-mono text-blue-300">
                {vehicleCount.toString().padStart(2, '0')}
              </p>
              <span className="text-[10px] text-slate-400">Cars, trucks, buses</span>
            </div>

            {/* TRACKING */}
            <div className="p-4 rounded-2xl bg-[#0D1B2A] border border-emerald-500/20 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Tracking
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-3xl font-extrabold font-mono text-emerald-300">
                {trackingCount.toString().padStart(2, '0')}
              </p>
              <span className="text-[10px] text-slate-400">Active tracked IDs</span>
            </div>
          </div>

          {/* SCENE SUMMARY CARD */}
          <div className="p-4 rounded-2xl bg-[#0D1B2A] border border-cyan-500/30 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                SCENE SUMMARY
              </span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-sm font-medium text-slate-200 leading-snug">
              {sceneSummary}
            </p>
          </div>

          {/* UNIQUE FEATURE: FOCUS MODE */}
          <div className="p-5 rounded-2xl bg-[#0D1B2A] border border-white/10 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  FOCUS MODE
                </h4>
                <p className="text-[11px] text-slate-400">
                  Select a category to highlight exclusively and dim all other targets.
                </p>
              </div>
              {focusClass && (
                <button
                  onClick={handleClearFocus}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline"
                >
                  Clear Focus
                </button>
              )}
            </div>

            {allDetectedClasses.length === 0 ? (
              <div className="py-4 text-center rounded-xl bg-white/5 border border-dashed border-white/10 text-xs text-slate-400">
                Classes will populate as targets are detected.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {allDetectedClasses.map((cls) => {
                  const isSelected = focusClass === cls;
                  const countInFrame = currentClassCounts[cls] || 0;

                  return (
                    <button
                      key={cls}
                      onClick={() => handleToggleFocus(cls)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-cyan-500/30 font-bold border border-cyan-300'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <span className="capitalize">{cls}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                          isSelected
                            ? 'bg-black/30 text-white'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}
                      >
                        {countInFrame.toString().padStart(2, '0')}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {focusClass && (
              <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center justify-between">
                <span>Focusing on: <strong className="capitalize">{focusClass}</strong></span>
                <span>Tracked: {currentClassCounts[focusClass] || 0}</span>
              </div>
            )}
          </div>

          {/* LIVE OBJECT COUNTER (Breakdown by Class) */}
          <div className="p-5 rounded-2xl bg-[#0D1B2A] border border-white/10 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                LIVE OBJECT COUNTER
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                Real-Time Tally
              </span>
            </div>

            {Object.keys(currentClassCounts).length === 0 ? (
              <div className="py-4 text-center rounded-xl bg-white/5 border border-dashed border-white/10 text-xs text-slate-400">
                No objects currently detected in view.
              </div>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(currentClassCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cls, count]) => (
                    <div
                      key={cls}
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span className="font-semibold text-white capitalize">{cls}</span>
                      </div>
                      <span className="font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                        {count.toString().padStart(2, '0')}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* CONFIDENCE THRESHOLD CONTROL */}
          <div className="p-5 rounded-2xl bg-[#0D1B2A] border border-white/10 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  CONFIDENCE THRESHOLD
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                {Math.round(confidenceThreshold * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0.10"
              max="0.95"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0.10 (Sensitive)</span>
              <span>0.50 (Balanced)</span>
              <span>0.95 (Strict)</span>
            </div>
          </div>

          {/* PRIVACY INDICATOR */}
          <div className="p-4 rounded-2xl bg-[#07111F] border border-emerald-500/20 text-xs flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-emerald-300">
                Camera processing stays on your device when supported.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Neural inference runs entirely locally in your browser with zero remote transmission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
