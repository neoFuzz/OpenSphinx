import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CubeCameraProps {
  position?: [number, number, number];
  onUpdate?: (envMap: THREE.CubeTexture) => void;
}

export function CubeCamera({ position = [0, 2, 0], onUpdate }: CubeCameraProps) {
  const { scene, gl } = useThree();
  const cubeCameraRef = useRef<THREE.CubeCamera>();

  const cubeRenderTarget = useMemo(() =>
    new THREE.WebGLCubeRenderTarget(1024, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipMapNearestFilter
    }), []
  );

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
    if (cubeCamera && scene && gl) {
      cubeCamera.update(gl, scene);
      onUpdate?.(cubeRenderTarget.texture);
    }
  });

  return <primitive ref={cubeCameraRef} object={cubeCamera} />;
}