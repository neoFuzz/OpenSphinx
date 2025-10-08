import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// --- color constants ---
const COLORS = {
    RED: '#ff6666',
    SILVER: '#fff'
};

/**
* Apply shadows and color tinting to a scene with deep material cloning
* @param scene The THREE.Object3D scene to apply shadows and colors to
* @param owner The owner ('RED' or 'SILVER') determining the color tinting
* @param envMap Optional environment map for reflections
*/
function withShadowsAndColor(scene: THREE.Object3D, owner: 'RED' | 'SILVER', envMap?: THREE.CubeTexture) {
    if (!scene || !scene.traverse) return;

    const baseColor = owner === 'RED' ? new THREE.Color(COLORS.RED) : new THREE.Color(COLORS.SILVER);
    const metalness = owner === 'SILVER' ? 0.5 : 0.1;
    const roughness = owner === 'SILVER' ? 0.5 : 0.9;

    try {
        const lightsToRemove: any[] = [];
        scene.traverse((o: any) => {
            if (o.isLight) {
                lightsToRemove.push(o);
            }
            if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = true;

                const name = o.name.toLowerCase();

                if (name.includes('mirror')) {
                    // Apply mirror material with environment map
                    o.material = new THREE.MeshPhysicalMaterial({
                        color: new THREE.Color('#ffffff'),
                        metalness: 0.90,
                        roughness: 0.1,
                        reflectivity: 1.0,
                        envMapIntensity: 1.0,
                        envMap: envMap || null,
                    });
                } else if (name.includes('frame')) {
                    // Apply frame material with tint
                    o.material = new THREE.MeshStandardMaterial({
                        color: baseColor.clone(),
                        metalness,
                        roughness,
                        envMapIntensity: 0,
                    });
                } else if (o.material) {
                    if (Array.isArray(o.material)) {
                        o.material = o.material.map((mat: any) => {
                            const clonedMat = mat.clone();
                            clonedMat.color = baseColor.clone();
                            clonedMat.roughness = roughness;
                            clonedMat.metalness = metalness;
                            clonedMat.envMapIntensity = 0;
                            return clonedMat;
                        });
                    } else {
                        o.material = o.material.clone();
                        o.material.color = baseColor.clone();
                        o.material.roughness = roughness;
                        o.material.metalness = metalness;
                        o.material.envMapIntensity = 0;
                    }
                }
            }
        });
        // Remove lights after traversal to avoid modifying during iteration
        lightsToRemove.forEach(light => light.parent?.remove(light));
    } catch (error) {
        console.warn('Error traversing scene:', error);
    }
}

/**
 * Draw the Pharaoh model
 */
export function PharaohGLTF({ owner }: { owner: 'RED' | 'SILVER' }) {
    const { scene } = useGLTF('/models/pharaoh.glb');
    const clonedScene = useMemo(() => {
        if (scene) {
            const clone = scene.clone();
            if (clone) withShadowsAndColor(clone, owner);
            return clone;
        }
        return null;
    }, [scene, owner]);
    return clonedScene ? <primitive object={clonedScene} /> : null;
}

/**
 * Draw the Pyramid model
 */
export function PyramidGLTF({ owner, envMap }: { owner: 'RED' | 'SILVER'; envMap?: THREE.CubeTexture }) {
    const { scene } = useGLTF('/models/pyramid.glb');
    const clonedScene = useMemo(() => {
        if (scene) {
            const clone = scene.clone();
            if (clone) withShadowsAndColor(clone, owner, envMap);
            return clone;
        }
        return null;
    }, [scene, owner, envMap]);
    return clonedScene ? <primitive object={clonedScene} /> : null;
}

/**
 * Draw the Djed model
 */
export function DjedGLTF({ owner, envMap }: { owner: 'RED' | 'SILVER'; envMap?: THREE.CubeTexture }) {
    const { scene } = useGLTF('/models/djed.glb');
    const clonedScene = useMemo(() => {
        if (scene) {
            const clone = scene.clone();
            if (clone) withShadowsAndColor(clone, owner, envMap);
            return clone;
        }
        return null;
    }, [scene, owner, envMap]);
    return clonedScene ? <primitive object={clonedScene} /> : null;
}

/**
 * Draw the Laser (Sphinx) model
 */
export function LaserGLTF({ owner }: { owner: 'RED' | 'SILVER' }) {
    const { scene } = useGLTF('/models/laser.glb');
    const clonedScene = useMemo(() => {
        if (scene) {
            const clone = scene.clone();
            if (clone) withShadowsAndColor(clone, owner);
            return clone;
        }
        return null;
    }, [scene, owner]);
    return clonedScene ? <primitive object={clonedScene} /> : null;
}

/**
 * Draw the Obelisk model
 */
export const ObeliskGLTF = React.memo(({ owner }: { owner: 'RED' | 'SILVER' }) => {
    const { scene } = useGLTF('/models/obelisk.glb');
    const clonedScene = useMemo(() => {
        if (scene) {
            const clone = scene.clone();
            if (clone) withShadowsAndColor(clone, owner);
            return clone;
        }
        return null;
    }, [scene, owner]);
    return clonedScene ? <primitive object={clonedScene} /> : null;
});

/**
 * Draw the Anubis model
 */
export function AnubisGLTF({ owner }: { owner: 'RED' | 'SILVER' }) {
    const { scene } = useGLTF('/models/anubis.glb');
    const clonedScene = useMemo(() => {
        if (scene) {
            const clone = scene.clone();
            if (clone) withShadowsAndColor(clone, owner);
            return clone;
        }
        return null;
    }, [scene, owner]);
    return clonedScene ? <primitive object={clonedScene} /> : null;
}

// --- PIECE MESHES (simple primitives) ---
/**
 * Draw the Pharaoh mesh
 * @param props The group props
 * @returns A React component with the Pharaoh mesh
 */ // @ts-ignore
function PharaohMesh(props: JSX.IntrinsicElements['group']) {
    // a gold cylinder
    return (
        <group {...props}>
            <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.35, 0.35, 0.6, 24]} />
                <meshStandardMaterial color="#c7a83c" metalness={0.6} roughness={0.4} />
            </mesh>
        </group>
    );
}

/**
 * Draw the Obelisk mesh
 * @param props The group props
 * @returns A React component with the Obelisk mesh
 */// @ts-ignore
function ObeliskMesh(props: JSX.IntrinsicElements['group']) {
    return (
        <group {...props}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[0.7, 0.9, 0.7]} />
                <meshStandardMaterial color="#666" metalness={0.1} roughness={0.9} />
            </mesh>
        </group>
    );
}

/**
 * Draw the Pyramid mesh
 * @param mirror The mirror shape ('/' or '\')
 * @returns A React component with the Pyramid mesh
 */
function PyramidMesh({ mirror }: { mirror?: '/' | '\\' }) {
    // represent mirror orientation as wedge rotation
    // we'll use a triangular prism-like wedge
    const rotY = mirror === '/' ? 0 : Math.PI / 2; // arbitrary mapping
    return (
        <group rotation-y={rotY}>
            <mesh castShadow receiveShadow rotation={[0, 0, 0]}>
                {/* A thin wedge: make by extruding a triangle, but we'll fake with a box + clipping shape */}
                <coneGeometry args={[0.45, 0.35, 3]} />
                <meshStandardMaterial color="#888" metalness={0.2} roughness={0.8} />
            </mesh>
            {/* mirror face hint */}
            <mesh position={[0, 0.18, 0]} rotation={[0, 0, 0]}>
                <planeGeometry args={[0.4, 0.25]} />
                <meshStandardMaterial color="#b0e0ff" metalness={1.0} roughness={0.1} envMapIntensity={1} />
            </mesh>
        </group>
    );
}

/**
 * Draw the Djed mesh
 * @param mirror The mirror shape ('/' or '\')
 * @returns A React component with the Djed mesh
 */
function DjedMesh({ mirror }: { mirror?: '/' | '\\' }) {
    // treat as double-sided mirror block
    const rotY = mirror === '/' ? 0 : Math.PI / 2;
    return (
        <group rotation-y={rotY}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[0.65, 0.4, 0.65]} />
                <meshStandardMaterial color="#9aa" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* mirror hints on two faces */}
            <mesh position={[0, 0.22, 0.32]}>
                <planeGeometry args={[0.55, 0.25]} />
                <meshStandardMaterial color="#b0e0ff" metalness={1.0} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.22, -0.32]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[0.55, 0.25]} />
                <meshStandardMaterial color="#b0e0ff" metalness={1.0} roughness={0.1} />
            </mesh>
        </group>
    );
}

/**
 * Draw the laser emitter mesh
 * @param facing The facing direction of the laser emitter
 * @param owner The owner of the laser emitter
 * @returns A React component with the laser emitter mesh
 */
function LaserMesh({ facing, owner }: { facing?: Dir; owner: 'RED' | 'SILVER' }) {
    const rotY = facing === 'N' ? 0
        : facing === 'E' ? Math.PI / 2
            : facing === 'S' ? Math.PI
                : facing === 'W' ? -Math.PI / 2
                    : 0;

    return (
        <group rotation-y={rotY}>
            {/* base */}
            <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.3, 0.35, 0.25, 20]} />
                <meshStandardMaterial color={owner === 'RED' ? '#cc4444' : '#8888cc'} />
            </mesh>
            {/* emitter tube */}
            <mesh position={[0, 0.35, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 0.7, 12]} />
                <meshStandardMaterial color="#444" metalness={0.3} roughness={0.7} />
            </mesh>
        </group>
    );
}

// Preload all models
export function preloadModels() {
    useGLTF.preload('/models/pharaoh.glb');
    useGLTF.preload('/models/pyramid.glb');
    useGLTF.preload('/models/djed.glb');
    useGLTF.preload('/models/obelisk.glb');
    useGLTF.preload('/models/laser.glb');
    useGLTF.preload('/models/anubis.glb');
}