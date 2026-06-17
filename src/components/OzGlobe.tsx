import React, { useEffect, useState, useRef } from 'react';
import ThreeGlobe from 'three-globe';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import * as topojson from 'topojson-client';

const OzGlobe: React.FC = () => {
  const [globeObj, setGlobeObj] = useState<ThreeGlobe | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    let globe: ThreeGlobe | null = null;
    let cancelled = false;
    
    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
      .then(res => res.json())
      .then(topoData => {
        if (cancelled) return;
        
        const countries = topojson.feature(topoData, topoData.objects.countries) as unknown as GeoJSON.FeatureCollection;

        globe = new ThreeGlobe()
          .showGlobe(false)
          .showAtmosphere(false)
          .polygonsData(countries.features)
          .polygonCapColor(() => '#FE81DC')
          .polygonSideColor(() => 'rgba(255, 255, 255, 0.5)')
          .polygonStrokeColor(() => '#ffffff')
          .polygonAltitude(0.006);

        requestAnimationFrame(() => {
          if (cancelled || !globe) return;
          setTimeout(() => {
            if (cancelled || !globe) return;
            globe!.traverse((child: THREE.Object3D) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.material) {
                  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                  materials.forEach((mat, i) => {
                    if (mat.type !== 'MeshBasicMaterial') {
                      const oldColor = ((mat as unknown as { color?: THREE.Color }).color)?.clone() || new THREE.Color('#FE81DC');
                      const newMat = new THREE.MeshBasicMaterial({
                        color: oldColor,
                        transparent: mat.transparent,
                        opacity: mat.opacity,
                        side: mat.side,
                      });
                      if (Array.isArray(mesh.material)) {
                        mesh.material[i] = newMat;
                      } else {
                        mesh.material = newMat;
                      }
                    }
                  });
                }
              }
            });
          }, 800);
        });

        setGlobeObj(globe);
      })
      .catch(err => {
        if (!cancelled) console.error("Failed to load topojson", err);
      });
      
    return () => {
      cancelled = true;
      if (globe) {
        globe.traverse((child: unknown) => {
          const obj = child as THREE.Object3D & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
      }
    };
  }, []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  if (!globeObj) return null;

  return (
    <group ref={groupRef} scale={[0.04, 0.04, 0.04]}>
      <mesh>
        <sphereGeometry args={[99.8, 64, 64]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <primitive object={globeObj} />
    </group>
  );
};

export default OzGlobe;