'use client';

/* eslint-disable react/no-unknown-property -- React Three Fiber JSX props */

import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { VehicleDamage } from './types';

import { useThree } from '@react-three/fiber';
import { useRef, useState, useEffect } from 'react';
import { Html, useGLTF, OrbitControls } from '@react-three/drei';

import { severityColor, vehicleZoneMap } from './vehicle-zone-map';

export function VehicleScene({ damages, selected, markersVisible, resetKey, onSelect }: { damages: VehicleDamage[]; selected: number | null; markersVisible: boolean; resetKey: number; onSelect: (index: number) => void }) {
  const { scene } = useGLTF('/models/car-lite.glb');
  const controls = useRef<OrbitControlsImpl>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const { camera } = useThree();
  useEffect(() => { camera.position.set(4.8, 2.8, 5.5); controls.current?.target.set(0, 0, 0); controls.current?.update(); }, [camera, resetKey]);
  useEffect(() => { if (selected === null) return; const point = vehicleZoneMap[damages[selected].zone]; controls.current?.target.set(...point.target); controls.current?.update(); }, [damages, selected]);
  return <>
    <ambientLight intensity={1.5} /><directionalLight position={[4, 7, 5]} intensity={2.5} castShadow />
    <primitive object={scene} scale={1.15} />
    {markersVisible && damages.map((damage, index) => { const point = vehicleZoneMap[damage.zone]; if (!point) { if (process.env.NODE_ENV === 'development') console.warn(`Missing 3D mapping for ${damage.zone}`); return null; } const active = selected === index; return <group key={`${damage.zone}-${index}`} position={point.position}><mesh onPointerOver={() => setHovered(index)} onPointerOut={() => setHovered(null)} onClick={(event) => { event.stopPropagation(); onSelect(index); }} scale={active ? 1.35 : 1}><sphereGeometry args={[0.11, 24, 24]} /><meshStandardMaterial color={severityColor(damage.severity)} emissive={severityColor(damage.severity)} emissiveIntensity={active ? 1 : 0.35} /></mesh><Html distanceFactor={8} center style={{ pointerEvents: 'none', opacity: active || hovered === index ? 1 : 0 }}><span style={{ background: '#161c24', color: '#fff', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 12 }}>{point.label}</span></Html></group>; })}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]} receiveShadow><planeGeometry args={[20, 20]} /><shadowMaterial opacity={0.18} /></mesh>
    <OrbitControls ref={controls} enablePan={false} minDistance={3.5} maxDistance={9} minPolarAngle={0.45} maxPolarAngle={Math.PI / 2.05} />
  </>;
}

useGLTF.preload('/models/car-lite.glb');
