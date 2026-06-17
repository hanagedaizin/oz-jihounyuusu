import React, { useState, useEffect, useCallback } from 'react';
import OzGlobe from './OzGlobe';
import Clock from './Clock';
import NewsSprout from './NewsSprout';
import { getNewsPool, getBalancedRandomItem } from '../utils/newsFeed';
import type { NewsItem } from '../utils/newsFeed';
import * as THREE from 'three';

interface SproutData {
  news: NewsItem;
  lat: number;
  lng: number;
  createdAt: number;
}

interface OzSceneProps {
  newsLifespan: number;
  onSelectNews: (news: NewsItem, pos: THREE.Vector3) => void;
}

const OzScene: React.FC<OzSceneProps> = ({ newsLifespan, onSelectNews }) => {
  const [sprouts, setSprouts] = useState<SproutData[]>([]);

  const triggerNews = useCallback(async () => {
    const pool = await getNewsPool();
    const item = getBalancedRandomItem(pool);
    if (!item) return;
    const lat = (Math.random() - 0.5) * 120;
    const lng = (Math.random() - 0.5) * 360;
    setSprouts(prev => prev.length > 10 ? prev : [...prev, { news: item, lat, lng, createdAt: Date.now() }]);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { triggerNews(); }, [triggerNews]);
  useEffect(() => {
    const interval = setInterval(triggerNews, 4000);
    return () => clearInterval(interval);
  }, [triggerNews]);

  const removeSprout = useCallback((id: string) => {
    setSprouts(prev => prev.filter(s => s.news.id !== id));
  }, []);

  return (
    <group>
      <OzGlobe />
      <Clock />
      {sprouts.map(sprout => (
        <NewsSprout key={sprout.news.id + sprout.createdAt} news={sprout.news} lat={sprout.lat} lng={sprout.lng} lifespan={newsLifespan} createdAt={sprout.createdAt} onRemove={removeSprout} onSelect={onSelectNews} />
      ))}
    </group>
  );
};

export default OzScene;