import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CubeCameraProps {
  position?: [number, number, number];
  onUpdate?: (envMap: THREE.CubeTexture) => void;
  quality?: 'off' | 'low' | 'medium' | 'high' | 'ultra';
}

export function CubeCamera({ position = [0, 2, 0], onUpdate, quality = 'low' }: CubeCameraProps) {
  const { scene, gl } = useThree();
  const cubeCameraRef = useRef<THREE.CubeCamera>(null);

  const cubeRenderTarget = useMemo(() => {
    const sizeMap = { off: 0, low: 256, medium: 512, high: 1024, ultra: 2048 };
    return new THREE.WebGLCubeRenderTarget(sizeMap[quality], {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipMapNearestFilter
    });
  }, [quality]);

  const cubeCamera = useMemo(() => {
    const camera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
    camera.position.set(...position);
    return camera;
  }, [position, cubeRenderTarget]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cubeRenderTarget.dispose();
    };
  }, [cubeRenderTarget]);

  useFrame(() => {
    if (quality !== 'off' && cubeCamera && scene && gl) {
      cubeCamera.update(gl, scene);
      onUpdate?.(cubeRenderTarget.texture);
    }
  });

  return quality !== 'off' ? <primitive ref={cubeCameraRef} object={cubeCamera} /> : null;
}