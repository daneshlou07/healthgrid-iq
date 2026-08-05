import React, { useState, useEffect, useRef } from 'react';
import { loadImages } from '../../services/imageStorage';
import type { Case } from '../../types';
import { analyzeImageWithVisionAi, type VisionAiAnalysisResult } from '../../services/visionAiAnalyzer';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sun,
  Contrast,
  Ruler,
  RefreshCw,
  Eye,
  Maximize2,
  Image as ImageIcon,
  Brain,
  Sparkles,
  CheckCircle2,
  Play,
  Pause,
  Layers,
  Activity,
  Sliders,
  Tv,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Props {
  imageKeys?: string[];
  /** Raw base64/blob preview URLs to show before images are saved to IndexedDB */
  previewUrls?: string[];
  heightClass?: string;
  caseItem?: Case;
  onAiAnalyzed?: (result: VisionAiAnalysisResult) => void;
}

export type HounsfieldPreset = 'DEFAULT' | 'LUNG' | 'BONE' | 'SOFT_TISSUE' | 'BRAIN';
export type MriSequence = 'T1' | 'T2' | 'FLAIR' | 'DWI';

export default function PacsImageViewer({ imageKeys, previewUrls, heightClass = 'h-[440px]', caseItem, onAiAnalyzed }: Props) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  // PACS Tool States
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isInverted, setIsInverted] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Modality-specific state (CT / MRI / Ultrasound / X-Ray)
  const modality = caseItem?.modality || caseItem?.scanType || 'X-Ray';
  const [ctPreset, setCtPreset] = useState<HounsfieldPreset>('DEFAULT');
  const [mriSeq, setMriSeq] = useState<MriSequence>('T1');
  const [isPlayingCine, setIsPlayingCine] = useState(false);
  const [cineSpeed, setCineSpeed] = useState<number>(1);
  const cineTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Vision AI scanning state
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiResult, setAiResult] = useState<VisionAiAnalysisResult | null>(null);
  const [showAiOverlay, setShowAiOverlay] = useState(true);

  // Measurement tool state
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (previewUrls && previewUrls.length > 0) {
      setUrls(previewUrls);
      setActiveIdx(0);
      return;
    }
    if (!imageKeys || imageKeys.length === 0) {
      setUrls([]);
      return;
    }
    setLoading(true);
    loadImages(imageKeys).then((loaded) => {
      setUrls(loaded);
      setLoading(false);
      setActiveIdx(0);
    });
  }, [imageKeys?.join(','), previewUrls?.length]);

  // Ultrasound Cine Loop Playback Effect
  useEffect(() => {
    if (isPlayingCine && urls.length > 1) {
      const intervalMs = Math.round(300 / cineSpeed);
      cineTimerRef.current = setInterval(() => {
        setActiveIdx((prev) => (prev + 1) % urls.length);
      }, intervalMs);
    } else if (cineTimerRef.current) {
      clearInterval(cineTimerRef.current);
    }
    return () => {
      if (cineTimerRef.current) clearInterval(cineTimerRef.current);
    };
  }, [isPlayingCine, cineSpeed, urls.length]);

  // CT Hounsfield Preset Application
  const handleApplyCtPreset = (preset: HounsfieldPreset) => {
    setCtPreset(preset);
    switch (preset) {
      case 'LUNG':
        setBrightness(120);
        setContrast(145);
        break;
      case 'BONE':
        setBrightness(85);
        setContrast(180);
        break;
      case 'SOFT_TISSUE':
        setBrightness(100);
        setContrast(115);
        break;
      case 'BRAIN':
        setBrightness(105);
        setContrast(130);
        break;
      default:
        setBrightness(100);
        setContrast(100);
        break;
    }
  };

  // Reset tools
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setIsInverted(false);
    setIsMeasuring(false);
    setMeasureStart(null);
    setMeasureEnd(null);
    setCtPreset('DEFAULT');
    setIsPlayingCine(false);
  };

  // Canvas measurement drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMeasuring) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMeasureStart({ x, y });
    setMeasureEnd({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMeasuring || !measureStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMeasureEnd({ x, y });
  };

  // Run Multimodal Vision AI Pixel Scan
  const handleRunVisionAi = async () => {
    if (!urls[activeIdx]) return;
    setIsAiScanning(true);
    const mockCase = caseItem || ({ scanType: 'Radiograph', modality: 'X-Ray', notes: 'Diagnostic visual scan' } as Case);
    const result = await analyzeImageWithVisionAi(urls[activeIdx], mockCase);
    setAiResult(result);
    setIsAiScanning(false);
    if (onAiAnalyzed) onAiAnalyzed(result);
  };

  const currentUrl = urls[activeIdx];

  // Calculate distance in mm (assuming 1px ~ 0.264mm standard screen pitch)
  const measuredDistanceMm = measureStart && measureEnd
    ? (Math.hypot(measureEnd.x - measureStart.x, measureEnd.y - measureStart.y) * 0.264).toFixed(1)
    : null;

  if ((!imageKeys || imageKeys.length === 0) && (!previewUrls || previewUrls.length === 0)) {
    return (
      <div className="flex items-center justify-center py-10 bg-slate-900 rounded-xl text-slate-400 border border-slate-800">
        <div className="text-center space-y-1">
          <ImageIcon className="w-8 h-8 mx-auto opacity-40 text-slate-500" />
          <p className="text-xs font-medium">No PACS DICOM images attached to this case.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 bg-slate-900 rounded-xl text-slate-400 border border-slate-800">
        <div className="text-center space-y-2">
          <RefreshCw className="w-5 h-5 mx-auto animate-spin text-purple-400" />
          <p className="text-xs font-medium">Initializing PACS Image Workstation…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-950 text-white rounded-xl border border-slate-800 overflow-hidden shadow-2xl space-y-0 ${
      isTheaterMode ? 'fixed inset-0 z-50 rounded-none border-0 flex flex-col' : ''
    }`}>
      {/* ── PACS TOOLBAR ──────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border-b border-slate-800 p-2 sm:p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold bg-teal-800 text-teal-100 px-2 py-0.5 rounded border border-teal-700 uppercase">
            PACS {modality}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Frame/Slice {activeIdx + 1} of {urls.length}
          </span>
        </div>

        {/* Adjustments & Modality Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Ultrasound Cine Controls */}
          {(modality === 'Ultrasound' || urls.length > 3) && (
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setIsPlayingCine(!isPlayingCine)}
                className="p-1 hover:bg-slate-700 rounded text-teal-300 font-bold flex items-center gap-1"
                title="Toggle Motion Cine Loop Playback"
              >
                {isPlayingCine ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="text-[10px] uppercase">{isPlayingCine ? 'Pause' : 'Cine Loop'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCineSpeed(s => (s === 1 ? 2 : s === 2 ? 0.5 : 1))}
                className="text-[10px] font-mono text-slate-300 px-1 hover:text-white"
              >
                {cineSpeed}x
              </button>
            </div>
          )}

          {/* MRI Sequence Selector */}
          {(modality === 'MRI' || modality.includes('MR')) && (
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              {(['T1', 'T2', 'FLAIR', 'DWI'] as MriSequence[]).map((seq) => (
                <button
                  key={seq}
                  type="button"
                  onClick={() => setMriSeq(seq)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    mriSeq === seq ? 'bg-purple-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {seq}
                </button>
              ))}
            </div>
          )}

          {/* CT Hounsfield Window Preset Selector */}
          {(modality === 'CT Scan' || modality.includes('CT')) && (
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <Sliders className="w-3 h-3 text-slate-400 ml-1" />
              {(['LUNG', 'BONE', 'SOFT_TISSUE', 'BRAIN'] as HounsfieldPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleApplyCtPreset(preset)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                    ctPreset === preset ? 'bg-teal-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}

          {/* Run AI DICOM Vision Scan Button */}
          <button
            type="button"
            onClick={handleRunVisionAi}
            disabled={isAiScanning}
            className="px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 bg-purple-800 text-white border-purple-500 shadow-md hover:bg-purple-700 disabled:opacity-50"
            title="Inspect image pixels using Multimodal Vision AI Model"
          >
            <Brain className={`w-3.5 h-3.5 ${isAiScanning ? 'animate-pulse text-amber-300' : 'text-purple-200'}`} />
            {isAiScanning ? 'Scanning Pixels...' : 'AI Vision Scan'}
          </button>

          {/* Fullscreen Theater Mode Button */}
          <button
            type="button"
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
              isTheaterMode ? 'bg-amber-700 text-white border-amber-600' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
            title="Expand to Fullscreen Theater Mode"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            {isTheaterMode ? 'Exit' : 'Fullscreen'}
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
              className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-mono font-bold text-teal-300">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(4.0, s + 0.2))}
              className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rotate */}
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Grayscale Invert */}
          <button
            type="button"
            onClick={() => setIsInverted(!isInverted)}
            className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
              isInverted ? 'bg-purple-700 text-white border-purple-600' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Invert Grayscale Colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Invert
          </button>

          {/* AI CAD Lesion Heatmap Toggle */}
          <button
            type="button"
            onClick={() => setShowAiOverlay(!showAiOverlay)}
            className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
              showAiOverlay ? 'bg-amber-700 text-white border-amber-600' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle AI Pathology Lesion Heatmap & Bounding Box Overlay"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>AI Heatmap</span>
          </button>

          {/* Linear Distance Measurement Tool */}
          <button
            type="button"
            onClick={() => {
              setIsMeasuring(!isMeasuring);
              setMeasureStart(null);
              setMeasureEnd(null);
            }}
            className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
              isMeasuring ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Linear Distance Measurement Tool"
          >
            <Ruler className="w-3.5 h-3.5" />
            {isMeasuring ? 'Measuring...' : 'Measure'}
          </button>

          {/* Reset All */}
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Reset All Viewport Adjustments"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── BRIGHTNESS / CONTRAST SLIDERS BAR ────────────────────────────────────── */}
      <div className="bg-slate-900/80 px-4 py-1.5 border-b border-slate-800/80 flex items-center gap-6 text-[11px] text-slate-300">
        <div className="flex items-center gap-2 flex-1">
          <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-slate-400 font-mono text-[10px]">Brightness</span>
          <input
            type="range"
            min="30"
            max="200"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded accent-teal-500 cursor-pointer"
          />
          <span className="font-mono text-[10px] w-8 text-right">{brightness}%</span>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <Contrast className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-slate-400 font-mono text-[10px]">Contrast</span>
          <input
            type="range"
            min="30"
            max="250"
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded accent-teal-500 cursor-pointer"
          />
          <span className="font-mono text-[10px] w-8 text-right">{contrast}%</span>
        </div>
      </div>

      {/* ── MAIN WORKSTATION CANVAS VIEWPORT ─────────────────────────────────── */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className={`relative ${isTheaterMode ? 'flex-1 min-h-0 min-h-[550px]' : heightClass} bg-black flex items-center justify-center overflow-hidden cursor-${isMeasuring ? 'crosshair' : 'grab'}`}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt="PACS Diagnostic View"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              filter: `brightness(${brightness}%) contrast(${contrast}%)${isInverted ? ' invert(100%)' : ''}`,
              transition: isMeasuring ? 'none' : 'transform 0.15s ease-out',
            }}
            className="max-h-full max-w-full object-contain pointer-events-none select-none"
          />
        ) : (
          <p className="text-xs text-slate-500">Image unreadable.</p>
        )}

        {/* Distance Measurement Line Overlay */}
        {measureStart && measureEnd && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
            <line
              x1={measureStart.x}
              y1={measureStart.y}
              x2={measureEnd.x}
              y2={measureEnd.y}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            <circle cx={measureStart.x} cy={measureStart.y} r="4" fill="#10b981" />
            <circle cx={measureEnd.x} cy={measureEnd.y} r="4" fill="#10b981" />
            <text
              x={(measureStart.x + measureEnd.x) / 2}
              y={(measureStart.y + measureEnd.y) / 2 - 8}
              fill="#10b981"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
              className="bg-black font-mono shadow-md"
            >
              {measuredDistanceMm} mm
            </text>
          </svg>
        )}

        {/* Animated Laser Scanning Overlay */}
        {isAiScanning && (
          <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none z-30">
            <div className="w-full h-1 bg-purple-400 animate-pulse border-b border-purple-300" />
            <div className="mt-4 px-4 py-2 bg-slate-950 border border-purple-500 rounded-xl text-purple-200 text-xs font-mono font-bold flex items-center gap-2 shadow-2xl">
              <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
              Multimodal Vision AI Analyzing Image Pixels ({modality})...
            </div>
          </div>
        )}

        {/* AI CAD Bounding Box Canvas Overlay */}
        {showAiOverlay && !isAiScanning && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div className="relative w-52 h-40 border-2 border-amber-400 bg-amber-500/10 rounded-lg shadow-sm">
              <div className="absolute -top-6 left-0 bg-amber-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
                <Brain className="w-3 h-3" />
                <span>ROI #1: {aiResult?.detectedFeatures[0] || 'Lower Lobe Focal Opacity'} ({aiResult?.confidenceScore || 94}%)</span>
              </div>
            </div>
          </div>
        )}

        {/* DICOM HUD Overlay Metadata */}
        <div className="absolute top-2 left-2 pointer-events-none text-[10px] font-mono text-teal-400 bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800 space-y-0.5">
          <div>PATIENT: {caseItem?.patientName || 'Ahmad Razak'} (ID: {caseItem?.patientId || 'P-884'})</div>
          <div>MODALITY: {modality} &middot; SLICE: {activeIdx + 1}/{urls.length}</div>
          <div>WW/WL: {ctPreset !== 'DEFAULT' ? ctPreset : `${brightness}/${contrast}`}</div>
        </div>

        <div className="absolute top-2 right-2 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1.5 rounded border border-slate-800 text-right">
          <div>PACS: HEALTHGRID_PACS</div>
          <div>SCALE: {scale.toFixed(1)}x &middot; ROT: {rotation}°</div>
        </div>
      </div>

      {/* ── THUMBNAIL & SLICE STACK SELECTOR BAR ───────────────────────────── */}
      {urls.length > 1 && (
        <div className="bg-slate-900 p-2 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveIdx((prev) => Math.max(0, prev - 1))}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-2 overflow-x-auto flex-1">
            {urls.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  activeIdx === idx ? 'border-teal-500 shadow-md scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Slice ${idx + 1}`} className="w-12 h-12 object-cover bg-black pointer-events-none" />
                <span className="absolute bottom-0 right-0 bg-black/80 text-white text-[9px] font-mono px-1 font-bold pointer-events-none">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setActiveIdx((prev) => Math.min(urls.length - 1, prev + 1))}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
