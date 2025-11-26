import React, { useState } from 'react';
import { UrlInput } from './components/UrlInput';
import { StoryCard } from './components/StoryCard';
import { generateStoryFromUrl } from './services/geminiService';
import { StoryData, ProcessingState } from './types';
import { NEWS_INTRO_AUDIO_URL } from './constants';
import html2canvas from 'html2canvas';

export default function App() {
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [status, setStatus] = useState<ProcessingState>({
    isLoading: false,
    step: 'idle',
  });
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);

  const handleUrlSubmit = async (url: string) => {
    setStatus({ isLoading: true, step: 'analyzing' });
    setStoryData(null);

    try {
      const data = await generateStoryFromUrl(url);
      setStoryData(data);
      setStatus({ isLoading: false, step: 'complete' });
    } catch (error: any) {
      console.error(error);
      setStatus({ 
        isLoading: false, 
        step: 'error', 
        error: error.message || "Something went wrong" 
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && storyData) {
      const objectUrl = URL.createObjectURL(file);
      setStoryData({ ...storyData, image_url: objectUrl });
    }
  };

  const handleImageUrlUpdate = (url: string) => {
    if (storyData) {
      setStoryData({ ...storyData, image_url: url });
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (storyData) {
      setStoryData({ ...storyData, title: e.target.value });
    }
  };

  const handleParagraphChange = (index: number, value: string) => {
    if (storyData) {
      const newParagraphs = [...storyData.paragraphs];
      newParagraphs[index] = value;
      setStoryData({ ...storyData, paragraphs: newParagraphs });
    }
  };

  const handleDownload = async () => {
    const element = document.getElementById('story-card-node');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2, // 2x scale for better resolution
        backgroundColor: null,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `story-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Gagal mendownload gambar otomatis karena proteksi browser (CORS). Silakan gunakan Screenshot.");
    }
  };

  const handleVideoDownload = async () => {
    const element = document.getElementById('story-card-node');
    if (!element) return;
    
    setIsProcessingVideo(true);
    let audioCtx: AudioContext | null = null;

    try {
        // 1. Always Setup Audio Context
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        
        // Resume explicitly for browsers that suspend audio contexts created without direct user gesture initially
        if (audioCtx.state === 'suspended') {
             await audioCtx.resume();
        }

        // 2. Convert DOM to Canvas first (high quality)
        const sourceCanvas = await html2canvas(element, {
            useCORS: true,
            scale: 2,
            backgroundColor: null,
        });

        // 3. Setup Recording Canvas
        const recordCanvas = document.createElement('canvas');
        recordCanvas.width = sourceCanvas.width;
        recordCanvas.height = sourceCanvas.height;
        const ctx = recordCanvas.getContext('2d');
        
        if (!ctx) throw new Error("Could not create canvas context");

        // 4. Setup Stream from Canvas
        const canvasStream = recordCanvas.captureStream(30); // 30 FPS
        let finalStream = canvasStream;

        // 5. Fetch and Mix Audio
        try {
            const dest = audioCtx.createMediaStreamDestination();
            
            // Fetch default audio file
            // Use 'cors' mode to ensure we can read the data
            const response = await fetch(NEWS_INTRO_AUDIO_URL, { mode: 'cors' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            
            // Create source
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true; // Loop if audio is shorter than video
            
            // Create Gain Node to control volume (optional, prevents clipping)
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 0.8; 

            source.connect(gainNode);
            gainNode.connect(dest);
            source.start(0);

            // Mix tracks: Canvas Video + Audio
            const audioTrack = dest.stream.getAudioTracks()[0];
            const videoTrack = canvasStream.getVideoTracks()[0];
            finalStream = new MediaStream([videoTrack, audioTrack]);

        } catch (audioErr) {
            console.warn("Gagal memuat audio, melanjutkan dengan video hening:", audioErr);
            // Fallback: Do not mix audio, just use video stream.
            // The process continues without throwing/alerting error.
        }

        // 6. Setup MediaRecorder with specific mimeType for better compatibility
        // Try common supported types
        const mimeTypes = [
            'video/webm; codecs=vp8,opus',
            'video/webm',
            'video/mp4'
        ];
        const selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

        const recorder = new MediaRecorder(finalStream, {
             mimeType: selectedMimeType
        });
        
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onerror = (e) => {
            console.error("Recorder Error:", e);
            alert("Terjadi kesalahan saat merekam video.");
            if (audioCtx) audioCtx.close();
            setIsProcessingVideo(false);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: selectedMimeType || 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `story-video-${Date.now()}.${selectedMimeType.includes('mp4') ? 'mp4' : 'webm'}`;
            a.click();
            
            URL.revokeObjectURL(url);
            if (audioCtx) audioCtx.close();
            setIsProcessingVideo(false);
        };

        // 7. Start Loop
        recorder.start();
        const startTime = Date.now();
        const duration = 10000; // 10 seconds

        const drawFrame = () => {
            if (recorder.state === 'inactive') return; // Stop if recorder stopped elsewhere
            
            if (Date.now() - startTime > duration) {
                recorder.stop();
                return;
            }
            // Draw the static image repeatedly to simulate video frames
            ctx.drawImage(sourceCanvas, 0, 0);
            requestAnimationFrame(drawFrame);
        };

        drawFrame();

    } catch (err) {
        console.error("Video creation failed:", err);
        alert("Gagal membuat video. Browser mungkin tidak mendukung fitur ini.");
        if (audioCtx) audioCtx.close();
        setIsProcessingVideo(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 py-10 px-4">
      {/* Header */}
      <div className="text-center mb-10 space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          News<span className="text-blue-600">Story</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Convert any news article into a shareable 9:16 story card instantly using Gemini AI.
        </p>
      </div>

      {/* Input Section */}
      <UrlInput onSubmit={handleUrlSubmit} isLoading={status.isLoading} />

      {/* Status Messages */}
      {status.isLoading && (
        <div className="text-center mb-8 animate-pulse">
          <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">
            {status.step === 'analyzing' && 'Reading article & extracting data...'}
            {status.step === 'generating_image' && 'Generating custom image...'}
          </div>
        </div>
      )}

      {/* Error Message */}
      {status.step === 'error' && (
        <div className="w-full max-w-md mx-auto mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <p className="font-bold">Error</p>
          <p>{status.error}</p>
        </div>
      )}

      {/* Result Display */}
      {storyData && (
        <div className="flex flex-col md:flex-row items-start justify-center gap-8 pb-20 max-w-6xl mx-auto">
          {/* Left Side: The Story Card */}
          <div className="flex-shrink-0 w-full md:w-[400px] flex justify-center sticky top-10">
            <StoryCard data={storyData} />
          </div>
          
          {/* Right Side: Manual Controls */}
          <div className="w-full max-w-[500px] space-y-6">
            
            {/* Image Editor */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Atur Gambar
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Upload dari Perangkat</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-200 rounded-md bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Atau Tempel URL Gambar</label>
                  <input 
                    type="text" 
                    placeholder="https://example.com/image.jpg"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={storyData.image_url || ''}
                    onChange={(e) => handleImageUrlUpdate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Teks Story
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Judul Story</label>
                  <textarea
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={storyData.title}
                    onChange={handleTitleChange}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Paragraf 1</label>
                  <textarea
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={storyData.paragraphs[0] || ''}
                    onChange={(e) => handleParagraphChange(0, e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Paragraf 2</label>
                  <textarea
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={storyData.paragraphs[1] || ''}
                    onChange={(e) => handleParagraphChange(1, e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Paragraf 3</label>
                  <textarea
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={storyData.paragraphs[2] || ''}
                    onChange={(e) => handleParagraphChange(2, e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
               <button 
                 onClick={() => {
                   setStoryData(null);
                   setStatus({ isLoading: false, step: 'idle' });
                 }}
                 className="w-full px-4 py-3 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors border border-gray-300"
               >
                 Buat Baru
               </button>
               
               <div className="flex gap-3 mt-2">
                  <button 
                      className="flex-1 px-4 py-3 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm font-medium transition-colors flex items-center justify-center gap-2"
                      onClick={handleDownload}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Simpan Gambar
                  </button>

                  <button 
                      disabled={isProcessingVideo}
                      className="flex-1 px-4 py-3 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:bg-indigo-400 disabled:cursor-wait"
                      onClick={handleVideoDownload}
                  >
                      {isProcessingVideo ? (
                      <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Merekam (10d)...
                      </>
                      ) : (
                      <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Video (10d)
                      </>
                      )}
                  </button>
               </div>
            </div>
          </div>

        </div>
      )}

      {/* Empty State / Placeholder */}
      {!storyData && !status.isLoading && status.step !== 'error' && (
        <div className="flex-1 flex items-center justify-center opacity-30 pointer-events-none">
          <div className="aspect-[9/16] w-[300px] border-4 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
            <span className="text-gray-400 font-medium">Story Preview</span>
          </div>
        </div>
      )}
    </div>
  );
}