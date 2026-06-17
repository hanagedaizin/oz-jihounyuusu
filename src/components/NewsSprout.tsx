import React, { useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { NewsItem } from '../utils/newsFeed';

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
    // Deterministic hash-based color to satisfy linter
    let hash = 0;
    for (let i = 0; i < news.id.length; i++) hash = news.id.charCodeAt(i) + ((hash << 5) - hash);
    const hue = hash % 360;
    return { bg: `hsl(${hue}, 75%, 85%)`, border: `hsl(${hue}, 65%, 55%)` };
  }, [news.id]);

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
    e.preventDefault();
    onSelect(news, currentEndPos.clone());
  }, [news, onSelect, currentEndPos]);

  return (
    <group>
      {progress > 0 && (
        <Line points={[startPos, currentEndPos]} color="#FE81DC" lineWidth={2} />
      )}
      {progress === 1 && (
        <Html position={currentEndPos} zIndexRange={[100, 0]} center>
          <a href={news.link} target="_blank" rel="noopener noreferrer" className="news-sphere-container" onClick={handleClick} style={{ background: colors.bg, borderColor: colors.border }}>
            {news.videoUrl ? (
              <>
                <div className="news-sphere-video">
                  <iframe src={news.videoUrl} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', background: 'rgba(0, 0, 0, 0.65)', color: '#fff', fontSize: '0.55rem', fontWeight: 'bold', textAlign: 'center', padding: '5px 8px', boxSizing: 'border-box', zIndex: 10, pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🔴 {news.source} LIVE</div>
              </>
            ) : (
              <>
                <div className="news-sphere-title">{news.title}</div>
                <div className="news-sphere-source" style={{ color: colors.border }}>{news.source}</div>
              </>
            )}
          </a>
        </Html>
      )}
    </group>
  );
};

export default NewsSprout;