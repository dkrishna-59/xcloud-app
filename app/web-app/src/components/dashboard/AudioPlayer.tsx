"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw, Music, ShieldCheck, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { FileEntry } from '@/lib/upload-manager';
import { formatFileSize, cn } from '@/lib/utils';

interface AudioPlayerProps {
  file: FileEntry;
  onClose: () => void;
}

export const AudioPlayer = ({ file, onClose }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (amount: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += amount;
    }
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-surface-variant/20 backdrop-blur-3xl border border-outline/10 p-12 rounded-[3.5rem] text-center space-y-8 shadow-2xl max-w-xl w-full">
      <audio
        ref={audioRef}
        src={file.downloadUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        autoPlay
      />

      <div className="relative w-40 h-40 mx-auto">
        <div className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-2xl animate-pulse" />
        <div className="relative w-full h-full bg-primary-container text-primary rounded-[3rem] flex items-center justify-center shadow-inner border border-primary/20">
          <motion.div
            animate={{ scale: isPlaying ? [1, 1.08, 1] : 1 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Music size={64} />
          </motion.div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-black text-on-surface truncate px-4">{file.fileName}</h3>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary bg-primary-container/40 w-fit mx-auto px-3 py-1 rounded-full">
          Secure Audio Stream
        </p>
      </div>

      {/* Scrub Bar */}
      <div className="space-y-2">
        <div className="relative h-2 bg-surface-variant rounded-full overflow-hidden cursor-pointer">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentTime(val);
              if (audioRef.current) audioRef.current.currentTime = val;
            }}
            className="absolute inset-0 w-full opacity-0 z-10 cursor-pointer"
          />
          <div
            className="absolute h-full bg-primary rounded-full transition-all"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-bold text-on-surface-variant px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => skip(-10)}
          className="p-3 text-on-surface-variant hover:bg-surface-variant rounded-2xl transition-all"
          title="Rewind 10s"
        >
          <RotateCcw size={20} />
        </button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={togglePlay}
          className="w-20 h-20 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-xl shadow-primary/30"
        >
          {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
        </motion.button>

        <button
          onClick={() => skip(10)}
          className="p-3 text-on-surface-variant hover:bg-surface-variant rounded-2xl transition-all"
          title="Forward 10s"
        >
          <RotateCw size={20} />
        </button>
      </div>
    </div>
  );
};
