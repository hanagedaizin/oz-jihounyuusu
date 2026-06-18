import React, { useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { NewsItem } from '../utils/newsFeed';
import { getPlayableVideoUrl } from '../utils/newsFeed';

interface NewsSproutProps {
  news: NewsItem;
  lat: number;
  lng: number;
  lifespan: number;
  createdAt: number;
  onRemove: (id: string) => void;
  onSelect: (news: NewsItem, pos: THREE.Vector3) => void;
}

const GLOBE_RADIUS = 4.05;

const NewsSprout: React.FC<NewsSproutProps> = ({
  news, lat, lng, lifespan, createdAt, onRemove, onSelect
}) => {
  const [progress, setProgress] = useState(0);
  const [currentEndPos, setCurrentEndPos] = useState(() => new THREE.Vector3());

  const colors = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < news.id.length; i++) hash = news.id.charCodeAt(i) + ((hash << 5) - hash);
    const hue = hash % 360;
    return { bg: `hsl(${hue}, 75%, 85%)`, border: `hsl(${hue}, 65%, 55%)` };
  }, [news.id]);

  const videoSrc = useMemo(() => news.videoUrl ? getPlayableVideoUrl(news.videoUrl) : '', [news.videoUrl]);
  const isHls = videoSrc.toLowerCase().includes('.m3u8');

  const startPos = useMemo(() => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(Math.sin(phi) * Math.cos(theta));
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);
    const dir = new THREE.Vector3(x, y, z).normalize();
    return dir.multiplyScalar(GLOBE_RADIUS);
  }, [lat, lng]);

  const endPos = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < news.id.length; i++) hash = news.id.charCodeAt(i) + ((hash << 5) - hash);
    const r = GLOBE_RADIUS + 2 + (Math.abs(hash) % 250) / 100;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(Math.sin(phi) * Math.cos(theta));
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);
    const dir = new THREE.Vector3(x, y, z).normalize();
    return dir.multiplyScalar(r);
  }, [lat, lng, news.id]);

  useFrame(() => {
    const now = Date.now();
    const age = (now - createdAt) / 1000;
    if (age >= lifespan) onRemove(news.id);
    else setProgress(age < 0.5 ? age / 0.5 : 1);
    
    const t = age < 0.5 ? age / 0.5 : 1;
    const newPos = new THREE.Vector3().lerpVectors(startPos, endPos, t);
    setCurrentEndPos(newPos);
  });

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(news, currentEndPos.clone());
  }, [news, onSelect, currentEndPos]);

  const handleIframeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(news, currentEndPos.clone());
  }, [news, onSelect, currentEndPos]);

  const handleIframeKeydown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(news, currentEndPos.clone());
    }
  }, [news, onSelect, currentEndPos]);

  return (
    <group>
      {progress > 0 && (
        <Line points={[startPos, currentEndPos]} color="#FE81DC" lineWidth={2} />
      )}
      {progress === 1 && (
        <Html position={currentEndPos} zIndexRange={[100, 0]} center>
          <div 
            className="news-sphere-container" 
            style={{ 
              background: colors.bg,
              borderColor: colors.border,
              cursor: 'pointer'
            }}
            onClick={handleClick}
          >
            {news.videoUrl ? (
              <div className="news-sphere-video" onClick={handleIframeClick}>
                {isHls ? (
                  <video 
                    src={videoSrc} 
                    autoPlay 
                    muted 
                    playsInline 
                    style={{ width: '100%', height: '100%', border: 'none', objectFit: 'cover' }}
                  />
                ) : (
                  <iframe 
                    src={videoSrc} 
                    frameBorder="0" 
                    style={{ width: '150%', height: '150%', border: 'none', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title={news.title}
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                )}
                <button className="news-sphere-video-hitbox" type="button" aria-label="動画を開く" onClick={handleIframeClick} onKeyDown={handleIframeKeydown} />
                <div className="news-sphere-live">LIVE</div>
              </div>
            ) : (
              <>
                <div className="news-sphere-title">{news.title}</div>
                <div className="news-sphere-source" style={{ color: colors.border }}>{news.source}</div>
              </>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

export default NewsSprout;