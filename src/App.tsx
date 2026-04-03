/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { Camera, Scan, RefreshCw, Copy, Check, AlertCircle, Loader2, User, CreditCard, MapPin, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface IDData {
  nik?: string;
  name?: string;
  address?: string;
  dob?: string;
  pob?: string;
  gender?: string;
  religion?: string;
  status?: string;
  occupation?: string;
  nationality?: string;
  fullText?: string;
}

export default function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<IDData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please ensure you have granted permissions.");
    }
  }, []);

  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    }
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [startCamera, capturedImage]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(base64);
    
    // Stop stream to save battery/resources while reviewing
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setResult(null);
    setError(null);
  };

  const scanID = async () => {
    if (!capturedImage) return;

    setIsScanning(true);
    setError(null);

    try {
      const base64Data = capturedImage.split(",")[1];

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: "image/jpeg",
                },
              },
              {
                text: "Perform OCR on this ID card and extract fields. Return ONLY a JSON object with these fields: nik, name, address, dob (date of birth), pob (place of birth), gender, religion, status, occupation, nationality, and fullText (all text found). If a field is not found, leave it null.",
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nik: { type: Type.STRING },
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              dob: { type: Type.STRING },
              pob: { type: Type.STRING },
              gender: { type: Type.STRING },
              religion: { type: Type.STRING },
              status: { type: Type.STRING },
              occupation: { type: Type.STRING },
              nationality: { type: Type.STRING },
              fullText: { type: Type.STRING },
            },
          },
        },
      });

      const data = JSON.parse(response.text || "{}");
      setResult(data);
    } catch (err) {
      console.error("OCR Error:", err);
      setError("Failed to process image. Please try again with a clearer view.");
    } finally {
      setIsScanning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="p-6 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
            <Scan className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">ID Scanner Pro</h1>
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">AI Powered OCR</p>
          </div>
        </div>
        {!capturedImage && (
          <button 
            onClick={startCamera}
            className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
            title="Refresh Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Camera Stage */}
        <section className="relative aspect-[4/3] sm:aspect-video bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl group">
          {capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Captured ID" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Scanning Overlay */}
          {!result && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-[40px] border-neutral-950/40" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[60%] border-2 border-blue-500/50 rounded-2xl">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                
                {isScanning && (
                  <motion.div 
                    initial={{ top: "0%" }}
                    animate={{ top: "100%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                  />
                )}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 w-full justify-center px-6">
            {!capturedImage ? (
              <button
                onClick={capturePhoto}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold bg-white text-black shadow-xl hover:bg-neutral-200 transition-all active:scale-95"
              >
                <Camera className="w-5 h-5" />
                Capture Photo
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={retakePhoto}
                  disabled={isScanning}
                  className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold bg-neutral-800 text-white hover:bg-neutral-700 transition-all disabled:opacity-50"
                >
                  <RefreshCw className="w-5 h-5" />
                  Retake
                </button>
                <button
                  onClick={scanID}
                  disabled={isScanning}
                  className={`
                    flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all
                    ${isScanning 
                      ? "bg-blue-600/50 text-white/50 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30 active:scale-95"
                    }
                  `}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Scan className="w-5 h-5" />
                      Scan ID
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-500" />
              Extraction Results
            </h2>
            {result && (
              <button
                onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                className="text-xs font-medium px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy JSON"}
              </button>
            )}
          </div>

          {!result && !isScanning && !error && (
            <div className="text-center py-12 border-2 border-dashed border-neutral-800 rounded-3xl">
              <div className="p-4 bg-neutral-900 w-fit mx-auto rounded-full mb-4">
                <Scan className="w-8 h-8 text-neutral-600" />
              </div>
              <p className="text-neutral-500 font-medium">Position your ID card within the frame and capture</p>
            </div>
          )}

          {isScanning && (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-neutral-900 rounded-2xl" />
              ))}
            </div>
          )}

          {result && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <ResultCard icon={<CreditCard className="w-4 h-4" />} label="NIK / ID Number" value={result.nik} />
              <ResultCard icon={<User className="w-4 h-4" />} label="Full Name" value={result.name} />
              <ResultCard icon={<MapPin className="w-4 h-4" />} label="Address" value={result.address} />
              <ResultCard icon={<Calendar className="w-4 h-4" />} label="DOB / POB" value={result.dob && result.pob ? `${result.pob}, ${result.dob}` : result.dob || result.pob} />
              <ResultCard label="Gender" value={result.gender} />
              <ResultCard label="Nationality" value={result.nationality} />
              <ResultCard label="Occupation" value={result.occupation} />
              <ResultCard label="Status" value={result.status} />
            </motion.div>
          )}

          {result?.fullText && (
            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Raw OCR Output</h3>
              <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl font-mono text-sm leading-relaxed text-neutral-400 whitespace-pre-wrap">
                {result.fullText}
              </div>
            </div>
          )}
        </section>
      </main>

      <canvas ref={canvasRef} className="hidden" />
      
      <footer className="p-12 text-center text-neutral-600 text-sm">
        <p>© 2026 ID Scanner Pro • Powered by Gemini 3 Flash</p>
      </footer>
    </div>
  );
}

function ResultCard({ icon, label, value }: { icon?: React.ReactNode, label: string, value?: string | null }) {
  if (!value) return null;
  
  return (
    <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-neutral-700 transition-colors group">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-blue-500/70 group-hover:text-blue-500 transition-colors">{icon}</span>}
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">{label}</span>
      </div>
      <p className="font-semibold text-neutral-100">{value}</p>
    </div>
  );
}
