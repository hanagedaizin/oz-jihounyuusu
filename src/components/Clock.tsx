import React, { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { format } from 'date-fns';

const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const lastSecondBeeped = useRef(-1);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const unlockRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };
    
    unlockRef.current = unlock;
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  const playBeep = (type: 'po' | 'pon') => {
    if (!audioCtxRef.current) return;
    
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'po') {
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.frequency.value = 1760;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);
      }
    } catch (e) {
      console.warn("Audio playback blocked", e);
    }
  };

  useFrame(() => {
    const now = new Date();
    setTime(now);

    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Time signal: 3 seconds before the hour
    if (minutes === 59) {
      if (seconds === 57 || seconds === 58 || seconds === 59) {
        if (lastSecondBeeped.current !== seconds) {
          playBeep('po');
          lastSecondBeeped.current = seconds;
        }
      }
    } else if (minutes === 0 && seconds === 0) {
      if (lastSecondBeeped.current !== 0) {
        playBeep('pon');
        lastSecondBeeped.current = 0;
      }
    } else {
      if (seconds !== 0 && seconds !== 57 && seconds !== 58 && seconds !== 59) {
        lastSecondBeeped.current = -1;
      }
    }
  });

  const timeString = format(time, 'HH:mm:ss');
  const msString = Math.floor(time.getMilliseconds() / 10).toString().padStart(2, '0');

  return (
    <group position={[0, 0, 4.2]}>
      <Html center zIndexRange={[50, 0]}>
        <div className="clock-text" style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 'var(--clock-font-size)',
          fontWeight: 'bold',
          color: '#FE81DC',
          textShadow: '0 0 10px rgba(254, 129, 220, 0.8), 0 0 20px rgba(254, 129, 220, 0.5)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none'
        }}>
          {`${timeString}.${msString}`}
        </div>
      </Html>
    </group>
  );
};

export default Clock;
