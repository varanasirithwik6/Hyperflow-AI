import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Play, Volume2, VolumeX, Zap } from 'lucide-react';

interface IntroVideoSplashProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntroVideoSplash: React.FC<IntroVideoSplashProps> = ({ isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Immediate Fullscreen Autoplay on Open
  useEffect(() => {
    if (isOpen) {
      setIsExiting(false);
      if (videoRef.current) {
        const vid = videoRef.current;
        vid.defaultMuted = true;
        vid.muted = true;
        vid.currentTime = 0;

        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              console.warn('[Fullscreen Autoplay] Muted fallback retry:', err);
              vid.muted = true;
              vid.play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
            });
        }
      }
    }
  }, [isOpen]);

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => setIsPlaying(true));
      }
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  // Cinematic Exit Transition into Dashboard
  const triggerExitTransition = () => {
    if (isExiting) return;
    setIsExiting(true);
    if (videoRef.current) {
      // Fade volume down smoothly if not muted
      try {
        videoRef.current.pause();
      } catch (_) {}
    }
    setTimeout(() => {
      onClose();
      setIsExiting(false);
    }, 750);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 w-screen h-screen z-[99999] bg-black flex flex-col items-center justify-center overflow-hidden select-none font-sans transition-all duration-700 ease-out ${
        isExiting 
          ? 'opacity-0 scale-105 pointer-events-none' 
          : 'opacity-100 scale-100'
      }`}
    >
      
      {/* Sci-Fi Warp/Portal Glow Transition Effect during exit */}
      {isExiting && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center animate-fade-in">
          {/* Expanding Radial Light Burst */}
          <div className="absolute w-[180vw] h-[180vh] bg-radial-gradient from-cyan-400/40 via-blue-600/20 to-transparent rounded-full animate-ping duration-700" />
          
          {/* Horizontal Energy Laser Sweep */}
          <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_50px_15px_rgba(34,211,238,0.8)] transform scale-x-150 transition-all duration-700" />
          
          {/* Digital Twin Initializing Tag */}
          <div className="relative z-10 flex items-center gap-3 bg-slate-950/90 border border-cyan-400/60 px-6 py-3 rounded-2xl shadow-glow shadow-cyan-400/80">
            <Zap className="w-5 h-5 text-cyan-400 animate-bounce" />
            <span className="text-sm font-mono font-black text-cyan-300 tracking-widest uppercase">
              INITIALIZING DIGITAL TWIN...
            </span>
          </div>
        </div>
      )}

      {/* FULLSCREEN CINEMATIC VIDEO CANVAS */}
      <div 
        onClick={handleTogglePlay}
        className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer"
      >
        <video
          ref={videoRef}
          src="/intro-animation.mp4"
          className={`w-full h-full object-contain pointer-events-none transition-all duration-700 ${
            isExiting ? 'scale-110 brightness-150 filter blur-xs' : 'scale-100'
          }`}
          style={{
            filter: 'contrast(1.05) saturate(1.08) brightness(1.02)',
            imageRendering: '-webkit-optimize-contrast',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
          autoPlay
          playsInline
          muted={isMuted}
          preload="auto"
          onEnded={triggerExitTransition}
        />

        {/* Big Centered Play Button when paused */}
        {!isPlaying && !isExiting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs transition-all pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-glow shadow-cyan-400/60 transform scale-110">
              <Play className="w-10 h-10 fill-slate-950 translate-x-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* FLOATING TOP MINIMAL BAR */}
      <div 
        className={`absolute top-0 left-0 right-0 p-6 flex items-center justify-between pointer-events-none bg-gradient-to-b from-black/80 via-black/30 to-transparent transition-opacity duration-300 ${
          isExiting ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Brand identity pill */}
        <div className="pointer-events-auto flex items-center gap-3.5 bg-slate-950/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-cyan-500/40 shadow-2xl">
          <div className="h-9 flex items-center justify-center rounded-lg bg-slate-950/90 border border-cyan-500/40 p-0.5 shadow-glow shadow-cyan-400/30">
            <img src="/hyperflow-logo.png" alt="HyperFlow AI Official Logo" className="h-8 w-auto object-contain rounded-md" />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              HYPERFLOW AI
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold uppercase tracking-wider">
                OFFICIAL
              </span>
            </div>
            <p className="text-[10px] text-cyan-400 font-mono font-bold tracking-wider">
              CHARGE SMARTER • WAIT LESS
            </p>
          </div>
        </div>

        {/* Sound Toggle + Skip to Dashboard Buttons */}
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Sound / Volume Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleMute();
            }}
            title={isMuted ? "Unmute sound" : "Mute sound"}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 hover:border-cyan-400/80 shadow-xl backdrop-blur-md transition-all transform hover:scale-105 active:scale-95 group"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
                <span className="text-[11px] font-mono font-bold text-slate-300">UNMUTE</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-[11px] font-mono font-bold text-cyan-300">SOUND ON</span>
              </>
            )}
          </button>

          {/* Skip to Dashboard Button */}
          <button
            onClick={triggerExitTransition}
            className="flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black tracking-wider uppercase bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-glow transition-all transform hover:scale-105 active:scale-95 group"
          >
            <span>Skip to Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

    </div>
  );
};
