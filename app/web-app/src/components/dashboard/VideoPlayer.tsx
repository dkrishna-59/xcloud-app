"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  MoreHorizontal,
  ChevronRight,
  Monitor,
  PictureInPicture,
  Type,
  FastForward,
  Rewind,
  Loader2,
  Lock,
  Plus,
  Minus,
  Zap,
  Subtitles,
  Keyboard,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileEntry } from '@/lib/upload-manager';
import { cn } from '@/lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';

interface VideoPlayerProps {
  file: FileEntry;
  onClose: () => void;
}

export const VideoPlayer = ({ file, onClose }: VideoPlayerProps) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'original' | '16/9' | '4/3'>('original');
  const [isNormalized, setIsNormalized] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [hasCaptions, setHasCaptions] = useState(false);
  const [skipAmount, setSkipAmount] = useState(10);
  const [quality, setQuality] = useState('Auto');
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);

  // Synchronize volume state with the video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Track real fullscreen changes (e.g. from ESC key)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Audio Normalization logic
  useEffect(() => {
    if (!videoRef.current || !isNormalized) return;

    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtxRef.current.createMediaElementSource(videoRef.current);
        compressorRef.current = audioCtxRef.current.createDynamicsCompressor();

        // Settings for normalization/compression
        compressorRef.current.threshold.setValueAtTime(-24, audioCtxRef.current.currentTime);
        compressorRef.current.knee.setValueAtTime(30, audioCtxRef.current.currentTime);
        compressorRef.current.ratio.setValueAtTime(12, audioCtxRef.current.currentTime);
        compressorRef.current.attack.setValueAtTime(0.003, audioCtxRef.current.currentTime);
        compressorRef.current.release.setValueAtTime(0.25, audioCtxRef.current.currentTime);

        source.connect(compressorRef.current);
        compressorRef.current.connect(audioCtxRef.current.destination);
    }

    return () => {
        // Only disconnect if we were using it
    };
  }, [isNormalized]);

  // Cross-device resume: Seek to last position on load
  useEffect(() => {
    if (videoRef.current && file.playbackPosition) {
      videoRef.current.currentTime = file.playbackPosition;
    }
  }, [file.playbackPosition]);

  // Periodically save playback position
  useEffect(() => {
    if (!user || !isPlaying) return;

    const interval = setInterval(async () => {
      if (videoRef.current) {
        const userRef = doc(db, 'users', user.uid, 'user_files', file.fileId);
        await updateDoc(userRef, {
          playbackPosition: videoRef.current.currentTime
        }).catch(err => console.error("Failed to save playback position:", err));
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [user, isPlaying, file.fileId]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const skip = (amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSeekStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
    }
  };

  const handleSeekEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (videoRef.current && isPlaying) {
      videoRef.current.play();
    }
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const togglePiP = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      if (videoRef.current !== document.pictureInPictureElement) {
        await videoRef.current?.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (err) {
      console.error("PiP failed:", err);
    }
  };

  const adjustVolume = (delta: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVolume(prev => {
      const next = Math.max(0, Math.min(1, prev + delta));
      if (videoRef.current) videoRef.current.volume = next;
      return next;
    });
    setIsMuted(false);
  };

  const toggleCaptions = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    const tracks = videoRef.current.textTracks;
    const newState = !showCaptions;

    if (tracks.length === 0) {
      setHasCaptions(false);
      return;
    }

    setShowCaptions(newState);
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = newState ? 'showing' : 'disabled';
    }
  };

  // Check for captions on load and periodically as they might load late
  const handleLoadedMetadata = () => {
    setDuration(videoRef.current?.duration || 0);
    setIsLoading(false);
    detectTracks();
  };

  const detectTracks = useCallback(() => {
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      setHasCaptions(tracks.length > 0);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(detectTracks, 2000);
    return () => clearInterval(interval);
  }, [detectTracks]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          skip(-skipAmount);
          break;
        case 'ArrowRight':
        case 'KeyL':
          skip(skipAmount);
          break;
        case 'KeyM':
          setIsMuted(!isMuted);
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, isMuted, skipAmount]);

  const formatTime = (time: number) => {
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(h > 0 ? 2 : 1, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "relative bg-black group flex items-center justify-center overflow-hidden transition-all w-full h-full rounded-[2.5rem] shadow-2xl",
        isFullscreen ? "fixed inset-0 z-[200] rounded-none" : "border-4 border-surface"
      )}
    >
      <video
        ref={videoRef}
        src={file.downloadUrl}
        className={cn(
          "w-full h-full object-contain",
          aspectRatio === '16/9' && "aspect-video object-cover",
          aspectRatio === '4/3' && "aspect-[4/3] object-cover"
        )}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
            setIsLoading(false);
            setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        muted={isMuted}
        autoPlay
        playsInline
      />

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20"
          >
            <Loader2 className="animate-spin text-primary" size={64} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      <AnimatePresence>
        {(showControls || !isPlaying) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-transparent to-black/20 z-30 p-6"
          >
            {/* Middle: Big Play Button */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <motion.button
                 whileHover={{ scale: 1.1 }}
                 whileTap={{ scale: 0.9 }}
                 onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                 className="w-24 h-24 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-2xl shadow-primary/30 pointer-events-auto"
               >
                  {isPlaying ? <Pause size={44} fill="currentColor" /> : <Play size={44} fill="currentColor" className="ml-2" />}
               </motion.button>
            </div>

            {/* Bottom: Main Controls */}
            <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
               {/* Progress Bar */}
               <div className="flex items-center gap-4 group/progress">
                  <span className="text-white text-xs font-bold w-12">{formatTime(currentTime)}</span>
                  <div className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden">
                     <input
                       type="range"
                       min="0"
                       max={duration || 0}
                       value={currentTime}
                       onChange={handleSeek}
                       onMouseDown={handleSeekStart}
                       onMouseUp={handleSeekEnd}
                       onTouchStart={handleSeekStart}
                       onTouchEnd={handleSeekEnd}
                       className="absolute inset-0 w-full opacity-0 z-10 cursor-pointer"
                     />
                     <motion.div
                       className="absolute h-full bg-primary"
                       style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                     />
                     {/* Buffered indicator could go here */}
                  </div>
                  <span className="text-white text-xs font-bold w-12 text-right">{formatTime(duration)}</span>
               </div>

               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <button onClick={(e) => { e.stopPropagation(); skip(-skipAmount); }} className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all" title={`Skip back ${skipAmount}s`}><RotateCcw size={20} /></button>
                     <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="p-3 text-white hover:bg-white/10 rounded-xl transition-all">
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); skip(skipAmount); }} className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all" title={`Skip forward ${skipAmount}s`}><RotateCw size={20} /></button>

                     <div className="flex items-center gap-1 group/volume ml-4 relative">
                        <button
                          onClick={(e) => adjustVolume(-0.1, e)}
                          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                          title="Volume Down"
                        >
                           <Minus size={18} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                          className="p-3 text-white hover:text-white hover:bg-white/10 rounded-xl transition-all"
                          title={isMuted ? "Unmute" : "Mute"}
                        >
                           {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
                        </button>
                        <button
                          onClick={(e) => adjustVolume(0.1, e)}
                          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                          title="Volume Up"
                        >
                           <Plus size={18} />
                        </button>
                        <div className="w-0 group-hover/volume:w-28 transition-all duration-300 overflow-hidden flex items-center h-full">
                           <input
                             type="range"
                             min="0"
                             max="1"
                             step="0.05"
                             value={isMuted ? 0 : volume}
                             onChange={(e) => {
                                e.stopPropagation();
                                const val = parseFloat(e.target.value);
                                setVolume(val);
                                if(videoRef.current) videoRef.current.volume = val;
                                setIsMuted(val === 0);
                             }}
                             className="w-24 ml-2 accent-primary cursor-pointer"
                           />
                        </div>
                     </div>
                  </div>

                     <div className="flex items-center gap-2">
                        {hasCaptions && (
                           <button
                             onClick={toggleCaptions}
                             className={cn("p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all", showCaptions && "text-primary")}
                             title={showCaptions ? "Disable Captions" : "Enable Captions"}
                           >
                              <Subtitles size={20} />
                           </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowShortcutsModal(true); }}
                          className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                          title="Keyboard Shortcuts (?)"
                        >
                           <Keyboard size={20} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                          className={cn("p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all", showSettings && "bg-primary/20 text-primary")}
                          title="Playback Settings"
                        >
                           <Settings size={20} />
                        </button>
                        <button onClick={(e) => togglePiP(e)} className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all" title="Miniplayer (PiP)"><PictureInPicture size={20} /></button>
                        <button onClick={(e) => toggleFullscreen(e)} className="p-3 text-white hover:bg-white/10 rounded-xl transition-all" title="Fullscreen (F)">
                           {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                     </div>
               </div>
            </div>

            {/* Settings Menu */}
            <AnimatePresence>
               {showSettings && (
                 <motion.div
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                   className="absolute bottom-24 right-6 w-72 bg-surface/90 backdrop-blur-xl border border-outline/10 rounded-3xl p-5 shadow-2xl z-50 overflow-y-auto max-h-[70vh] custom-scrollbar"
                   onClick={(e) => e.stopPropagation()}
                 >
                    <div className="space-y-5">
                       <div>
                          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-3 px-1">Playback Speed</p>
                          <div className="grid grid-cols-4 gap-2">
                             {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                               <button
                                 key={rate}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setPlaybackRate(rate);
                                   if(videoRef.current) videoRef.current.playbackRate = rate;
                                 }}
                                 className={cn(
                                   "py-2 rounded-xl text-xs font-bold transition-all",
                                   playbackRate === rate ? "bg-primary text-on-primary shadow-lg" : "bg-surface-variant/40 text-on-surface-variant hover:bg-surface-variant"
                                 )}
                               >
                                 {rate}x
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="h-px bg-outline/5" />

                       <div>
                          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-3 px-1">Skip Duration</p>
                          <div className="grid grid-cols-3 gap-2">
                             {[5, 10, 30].map(amount => (
                               <button
                                 key={amount}
                                 onClick={(e) => { e.stopPropagation(); setSkipAmount(amount); }}
                                 className={cn(
                                   "py-2 rounded-xl text-xs font-bold transition-all",
                                   skipAmount === amount ? "bg-primary text-on-primary shadow-lg" : "bg-surface-variant/40 text-on-surface-variant hover:bg-surface-variant"
                                 )}
                               >
                                 {amount}s
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="h-px bg-outline/5" />

                       <div>
                          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-3 px-1">Video Quality</p>
                          <div className="space-y-1">
                             {['1080p', '720p', '480p', 'Auto'].map(q => (
                               <button
                                 key={q}
                                 onClick={(e) => { e.stopPropagation(); setQuality(q); }}
                                 className={cn(
                                   "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                   quality === q ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-variant/40"
                                 )}
                               >
                                 <span>{q}</span>
                                 {quality === q && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="h-px bg-outline/5" />

                       <div>
                          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-3 px-1">Aspect Ratio</p>
                          <div className="flex flex-col gap-1">
                             {[
                               { id: 'original', label: 'Original Node', icon: Monitor },
                               { id: '16/9', label: 'Widescreen (16:9)', icon: Monitor },
                               { id: '4/3', label: 'Classic (4:3)', icon: Monitor }
                             ].map(ratio => (
                               <button
                                 key={ratio.id}
                                 onClick={(e) => { e.stopPropagation(); setAspectRatio(ratio.id as any); }}
                                 className={cn(
                                   "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                   aspectRatio === ratio.id ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-variant/40"
                                 )}
                               >
                                 <div className="flex items-center gap-3">
                                    <ratio.icon size={14} />
                                    <span>{ratio.label}</span>
                                 </div>
                                 {aspectRatio === ratio.id && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="h-px bg-outline/5" />

                       <div>
                          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-3 px-1">Audio & Subtitles</p>
                          <div className="space-y-2">
                             <button
                               className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-variant/40 transition-all opacity-50 cursor-not-allowed"
                               onClick={(e) => e.stopPropagation()}
                             >
                                <div className="flex items-center gap-3">
                                   <Volume2 size={14} />
                                   <span>English (Primary)</span>
                                </div>
                                <ChevronRight size={14} />
                             </button>
                             <button
                                onClick={toggleCaptions}
                                disabled={!hasCaptions}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                  !hasCaptions ? "opacity-50 cursor-not-allowed" : "text-on-surface-variant hover:bg-surface-variant/40"
                                )}
                             >
                                <div className="flex items-center gap-3">
                                   <Type size={14} />
                                   <span>Captions: {showCaptions ? 'On' : 'Off'}</span>
                                </div>
                                {showCaptions && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                             </button>

                             <div className="h-px bg-outline/5" />

                             <button
                               onClick={(e) => { e.stopPropagation(); setIsNormalized(!isNormalized); }}
                               className={cn(
                                 "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                 isNormalized ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-variant/40"
                               )}
                             >
                                <div className="flex items-center gap-3">
                                   <Zap size={14} />
                                   <span>Audio Normalization</span>
                                </div>
                                <div className={cn("w-2 h-2 rounded-full", isNormalized ? "bg-primary" : "bg-outline/20")} />
                             </button>
                          </div>
                       </div>
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcutsModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6"
            onClick={(e) => { e.stopPropagation(); setShowShortcutsModal(false); }}
          >
            <div
              className="bg-surface border border-outline/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Keyboard size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">Keyboard Shortcuts</h3>
                    <p className="text-xs text-on-surface-variant">Control video playback effortlessly</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShortcutsModal(false)}
                  className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                {[
                  { key: 'Space / K', desc: 'Play / Pause' },
                  { key: '← / J', desc: `Rewind ${skipAmount} seconds` },
                  { key: '→ / L', desc: `Fast forward ${skipAmount} seconds` },
                  { key: 'M', desc: 'Mute / Unmute' },
                  { key: 'F', desc: 'Toggle Fullscreen' },
                  { key: '?', desc: 'Show / Hide Shortcuts' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-outline/5 last:border-0">
                    <span className="text-on-surface-variant">{item.desc}</span>
                    <kbd className="px-2.5 py-1 bg-surface-variant text-on-surface-variant font-mono text-xs rounded-lg border border-outline/10 shadow-sm font-bold">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowShortcutsModal(false)}
                className="w-full py-3 bg-primary text-on-primary font-bold rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
