import { useState, useCallback, useRef, useEffect, useMemo, type CSSProperties } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import OzScene from './components/OzScene';
import UI from './components/UI';
import { getPlayableVideoUrl } from './utils/newsFeed';
import type { NewsItem } from './utils/newsFeed';

interface CameraControllerProps {
  targetPos: THREE.Vector3 | null;
  active: boolean;
  zoomProgress: number;
  defaultCamPos: THREE.Vector3;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

const DEFAULT_LOOK_AT = new THREE.Vector3(0, 0, 0);

function CameraController({ targetPos, active, zoomProgress, defaultCamPos, controlsRef }: CameraControllerProps) {
  const { camera } = useThree();
  const lerpFactor = 0.04;

  useFrame(() => {
    if (active && targetPos) {
      const dir = targetPos.clone().normalize();
      const zoomDistance = 0.8;
      const camTarget = targetPos.clone().add(dir.multiplyScalar(zoomDistance));
      const smoothedTarget = new THREE.Vector3().lerpVectors(defaultCamPos, camTarget, zoomProgress);
      camera.position.lerp(smoothedTarget, lerpFactor);
      if (controlsRef.current) {
        const currentTarget = controlsRef.current.target as unknown as THREE.Vector3;
        const lookAtTarget = new THREE.Vector3().lerpVectors(DEFAULT_LOOK_AT, targetPos, zoomProgress);
        currentTarget.lerp(lookAtTarget, lerpFactor);
        controlsRef.current.update();
      }
    } else if (!active) {
      camera.position.lerp(defaultCamPos, lerpFactor);
      if (controlsRef.current) {
        const currentTarget = controlsRef.current.target as unknown as THREE.Vector3;
        currentTarget.lerp(DEFAULT_LOOK_AT, lerpFactor);
        controlsRef.current.update();
      }
    }
  });
  return null;
}

interface ContentDisplayProps {
  news: NewsItem;
  position: THREE.Vector3;
  isMobileViewport: boolean;
  onClose: () => void;
}

function ContentDisplay({ news, position, isMobileViewport, onClose }: ContentDisplayProps) {
  const playableVideoUrl = useMemo(() => news.videoUrl ? getPlayableVideoUrl(news.videoUrl) : '', [news.videoUrl]);
  const isHls = playableVideoUrl.toLowerCase().includes('.m3u8');
  const modalStyle = useMemo<CSSProperties>(() => ({
    width: isMobileViewport ? 'min(88vw, 360px)' : '500px',
    maxHeight: isMobileViewport ? 'min(72vh, 360px)' : '400px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    padding: isMobileViewport ? '1rem' : '1.5rem',
    borderRadius: isMobileViewport ? '14px' : '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    pointerEvents: 'auto',
  }), [isMobileViewport]);

  return (
    <Html position={position} center style={modalStyle}>
      <div style={{ position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#333', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#666' }}><span style={{ fontWeight: 'bold', color: '#FE81DC' }}>{news.source}</span><span style={{ marginLeft: '0.5rem' }}>{new Date(news.pubDate).toLocaleString('ja-JP')}</span></div>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#111' }}>{news.title}</h3>
        {news.videoUrl ? (
           <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
             {isHls ? (
               <video src={playableVideoUrl} autoPlay muted controls playsInline style={{ width: '100%', height: '100%', display: 'block', background: '#000' }} />
             ) : (
               <iframe src={playableVideoUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen title={news.title} referrerPolicy="strict-origin-when-cross-origin" />
             )}
           </div>
         ) : (
          <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.05)', borderRadius: '12px' }}>
            <p style={{ margin: '0 0 1rem 0', color: '#555', fontSize: '0.9rem' }}>このニュース記事は外部サイトで全文をお読みいただけます。</p>
            <a href={news.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: '#FE81DC', color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '20px' }}>記事元サイトを開く →</a>
          </div>
        )}
      </div>
    </Html>
  );
}

function App() {
  const [newsLifespan, setNewsLifespan] = useState(15);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedPos, setSelectedPos] = useState<THREE.Vector3 | null>(null);
  const [zoomProgress, setZoomProgress] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateMobileViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateMobileViewport();
    mediaQuery.addEventListener('change', updateMobileViewport);
    return () => mediaQuery.removeEventListener('change', updateMobileViewport);
  }, []);

  const defaultCamPos = useMemo(() => new THREE.Vector3(0, 0, isMobileViewport ? 22 : 15), [isMobileViewport]);
  const cameraConfig = useMemo(() => ({
    position: isMobileViewport ? [0, 0, 22] as const : [0, 0, 15] as const,
    fov: isMobileViewport ? 60 : 45,
    minDistance: isMobileViewport ? 14 : 8,
    maxDistance: isMobileViewport ? 46 : 30,
  }), [isMobileViewport]);

  useEffect(() => {
    if (selectedNews) {
      const startTime = Date.now();
      const duration = 800;
      const animate = () => {
        const elapsed = Date.now() - startTime;
        setZoomProgress(Math.min(1, elapsed / duration));
        if (elapsed < duration) requestAnimationFrame(animate);
      };
      animate();
    } else {
      const startTime = Date.now();
      const duration = 600;
      const animate = () => {
        const elapsed = Date.now() - startTime;
        setZoomProgress(Math.max(0, 1 - elapsed / duration));
        if (elapsed < duration) requestAnimationFrame(animate);
      };
      animate();
    }
  }, [selectedNews]);

  const handleSelectNews = useCallback((news: NewsItem, pos: THREE.Vector3) => {
    setSelectedNews(news);
    setSelectedPos(pos);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedNews(null);
    setSelectedPos(null);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas key={isMobileViewport ? 'mobile' : 'desktop'} camera={{ position: cameraConfig.position, fov: cameraConfig.fov }}>
        <color attach="background" args={['#ffffff']} />
        <ambientLight intensity={2.5} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} color="#ffffff" />
        <directionalLight position={[-5, -5, 5]} intensity={0.8} color="#ffffff" />
        <directionalLight position={[0, -10, 10]} intensity={0.5} color="#ffffff" />
        <OzScene newsLifespan={newsLifespan} onSelectNews={handleSelectNews} />
        <CameraController targetPos={selectedPos} active={!!selectedNews} zoomProgress={zoomProgress} defaultCamPos={defaultCamPos} controlsRef={controlsRef} />
        {selectedNews && selectedPos && <ContentDisplay news={selectedNews} position={selectedPos} isMobileViewport={isMobileViewport} onClose={handleCloseModal} />}
        <OrbitControls ref={controlsRef} enablePan={false} minDistance={cameraConfig.minDistance} maxDistance={cameraConfig.maxDistance} enabled={!selectedNews} />
      </Canvas>
      <UI newsLifespan={newsLifespan} setNewsLifespan={setNewsLifespan} />
    </div>
  );
}

export default App;