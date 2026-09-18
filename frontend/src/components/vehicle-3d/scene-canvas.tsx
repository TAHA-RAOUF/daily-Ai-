'use client';

/* eslint-disable react/no-unknown-property -- React Three Fiber JSX props */

import type { VehicleDamage } from './types';

import { Suspense } from 'react';
import { Html } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

import { VehicleScene } from './vehicle-scene';

export default function SceneCanvas(props: { damages: VehicleDamage[]; selected: number | null; markersVisible: boolean; resetKey: number; onSelect: (index: number) => void }) {
  return <Canvas frameloop="demand" shadows camera={{ position: [4.8, 2.8, 5.5], fov: 40 }} dpr={[1, 1.5]} gl={{ antialias: true }}><color attach="background" args={['#f4f6f8']} /><Suspense fallback={<Html center><span style={{ whiteSpace: 'nowrap', color: '#637381' }}>Loading vehicle model…</span></Html>}><VehicleScene {...props} /></Suspense></Canvas>;
}
