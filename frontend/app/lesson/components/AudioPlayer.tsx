import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type AudioPlayerProps = {
  audioUrl: string;
  onRerecord: () => void;
};

export const AudioPlayer = ({ audioUrl, onRerecord }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

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

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolume(vol);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-xl shadow-md p-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center justify-between gap-4">
        {/* Main controls */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => skip(-10)}
            className="p-2 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Image src="/icons/back-10s.svg" alt="Back 10s" width={20} height={20} />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <Image 
              src={isPlaying ? "/icons/pause.svg" : "/icons/play.svg"}
              alt={isPlaying ? "Pause" : "Play"}
              width={24}
              height={24}
              className="text-blue-500"
            />
          </button>

          <button 
            onClick={() => skip(10)}
            className="p-2 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Image src="/icons/next-10s.svg" alt="Forward 10s" width={20} height={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-gray-500 w-10">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-gray-500 w-10">{formatTime(duration)}</span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Volume control */}
          <div className="relative">
            <button
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              className="p-2 hover:bg-blue-50 rounded-full transition-colors"
            >
              <Image 
                src={volume === 0 ? "/icons/volume-mute.svg" : "/icons/volume.svg"}
                alt="Volume"
                width={20}
                height={20}
              />
            </button>
            {showVolumeSlider && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-white rounded-lg shadow-lg">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Playback speed */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="p-2 hover:bg-blue-50 rounded-full transition-colors"
            >
              <Image src="/icons/gear.svg" alt="Settings" width={20} height={20} />
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-2 p-2 bg-white rounded-lg shadow-lg">
                {[0.75, 1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      setPlaybackSpeed(speed);
                      setShowSpeedMenu(false);
                    }}
                    className={cn(
                      "block w-full px-4 py-1 text-sm text-left hover:bg-blue-50 rounded transition-colors",
                      playbackSpeed === speed && "text-blue-500"
                    )}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Re-record button */}
          <button
            onClick={onRerecord}
            className="p-2 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Image src="/icons/rotate-left.svg" alt="Re-record" width={20} height={20} />
          </button>
        </div>
      </div>
    </div>
  );
}; 