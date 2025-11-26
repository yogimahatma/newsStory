import React, { useState, useEffect } from 'react';
import { StoryData } from '../types';
import { STORY_ASPECT_RATIO, PRIMARY_BLUE } from '../constants';

interface StoryCardProps {
  data: StoryData;
}

export const StoryCard: React.FC<StoryCardProps> = ({ data }) => {
  const [imgError, setImgError] = useState(false);

  // Reset error state when image_url changes
  useEffect(() => {
    setImgError(false);
  }, [data.image_url]);

  return (
    <div 
      id="story-card-node"
      className={`relative w-full max-w-[400px] mx-auto ${STORY_ASPECT_RATIO} flex flex-col overflow-hidden shadow-2xl rounded-xl pt-6`}
      style={{ backgroundColor: PRIMARY_BLUE }}
    >
      {/* Top Section: Image (approx 38%) */}
      <div className="h-[38%] w-full relative flex items-center justify-center overflow-hidden" style={{ backgroundColor: PRIMARY_BLUE }}>
        {data.image_url && !imgError ? (
          <img 
            src={data.image_url} 
            alt={data.title} 
            className="w-full h-full object-contain"
            style={{ backgroundColor: PRIMARY_BLUE }}
            onError={() => setImgError(true)}
            crossOrigin="anonymous" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/50 p-4 text-center">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">Gambar Tidak Tersedia</span>
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[color:var(--bg-blue)] to-transparent opacity-80" style={{ '--bg-blue': PRIMARY_BLUE } as React.CSSProperties}></div>
      </div>

      {/* Bottom Section: Content (approx 62%) */}
      <div 
        className="h-[62%] w-full flex flex-col p-6 text-white relative z-10"
        style={{ backgroundColor: PRIMARY_BLUE }}
      >
        {/* Source */}
        <div className="mb-2 opacity-70 text-[10px] font-mono truncate tracking-widest">
           Sumber : {new URL(data.source).hostname.replace('www.', '')}
        </div>

        {/* Title: Adjusted size for better fit */}
        <h1 className="text-lg font-bold leading-tight mb-3 font-serif">
          {data.title}
        </h1>

        {/* Paragraphs: Three paragraphs, smaller font to fit */}
        <div className="flex-1 overflow-hidden space-y-2">
          {data.paragraphs.map((p, i) => (
             p && (
               <p key={i} className="text-[11px] leading-tight opacity-90 font-light text-justify">
                 {p}
               </p>
             )
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-2 border-t border-white/20 flex justify-center items-center">
           <span className="text-xs font-bold tracking-widest uppercase">INSIDELOMBOK</span>
        </div>
      </div>
    </div>
  );
};