import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Props interface for the CubeCamera component
 * 
 * @interface
 * @property {[number, number, number]} [position] - Position of the cube camera in 3D space
 * @property {(envMap: THREE.CubeTexture) => void} [onUpdate] - Callback function that receives the updated environment map texture
 * @property {'off' | 'low' | 'medium' | 'high' | 'ultra'} [quality] - Quality setting for the render target resolution:
 *                                                                      - off: disabled (0)
 *                                                                      - low: 256px 
 *                                                                      - medium: 512px
 *                                                                      - high: 1024px
 *                                                                      - ultra: 2048px
 */
interface CubeCameraProps {
  position?: [number, number, number];
  onUpdate?: (envMap: THREE.CubeTexture) => void;
  quality?: 'off' | 'low' | 'medium' | 'high' | 'ultra';
}

/**
 * A component that creates a cube camera for environment mapping and reflections
 * @component
 * 
 * @param {Object} props - Component props
 * @param {[number, number, number]} [props.position=[0, 2, 0]] - Position of the cube camera in 3D space
 * @param {(envMap: THREE.CubeTexture) => void} [props.onUpdate] - Callback function that receives the updated environment map texture
 * @param {'off' | 'low' | 'medium' | 'high' | 'ultra'} [props.quality='low'] - Quality setting for the render target resolution
 *                                                                              - off: disabled (0)
 *                                                                              - low: 256px
 *                                                                              - medium: 512px
 *                                                                              - high: 1024px
 *                                                                              - ultra: 2048px
 * 
 * @returns {JSX.Element | null} Returns the cube camera primitive or null if quality is 'off'
 */
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