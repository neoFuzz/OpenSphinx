import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, useGLTF } from '@react-three/drei';
import { useGame } from '../state/game';
import { COLS, ROWS } from '../../../shared/src/constants';
import type { Cell, Dir, GameState, Pos } from '../../../shared/src/types';
import * as THREE from 'three';

// --- layout constants ---
const TILE_SIZE = 1;          // 1 unit per square
const GAP = 0.02;             // small gap between tiles
const BOARD_W = COLS * TILE_SIZE;
const BOARD_H = ROWS * TILE_SIZE;

// World origin will be centre of the board:
const ORIGIN_X = -BOARD_W / 2 + TILE_SIZE / 2;
const ORIGIN_Z = -BOARD_H / 2 + TILE_SIZE / 2;

/**
 * Convert grid co-ordinates to world co-ordinates.
 * @param r Board row number
 * @param c Board column number
 * @returns Vector3 with converted co-ordinates
 */
function gridToWorld(r: number, c: number) {
    return new THREE.Vector3(
        ORIGIN_X + c * TILE_SIZE,
        0,
        ORIGIN_Z + r * TILE_SIZE
    );
}

/**
 * Convert world co-ordinates to the Board's grid.
 * @param x X co-ordinate
 * @param z Y co-ordinate
 * @returns Row and column Pos object
 */
function worldToGrid(x: number, z: number): Pos | null {
    // invert gridToWorld (approx, with bounds)
    const c = Math.round((x - ORIGIN_X) / TILE_SIZE);
    const r = Math.round((z - ORIGIN_Z) / TILE_SIZE);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r, c };
}

/**
* Apply shadows and color tinting to a scene with deep material cloning
* @param scene The THREE.Object3D scene to apply shadows and colors to
* @param owner The owner ('RED' or 'SILVER') determining the color tinting
*/
function withShadowsAndColor(scene: THREE.Object3D, owner: 'RED' | 'SILVER') {
    const baseColor = owner === 'RED' ? new THREE.Color('#cc4444') : new THREE.Color('#8888cc');

    scene.traverse((o: any) => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.material.envMapIntensity = 1; // PBR boost

            // Deep clone materials to prevent sharing between instances
            if (o.material) {
                if (Array.isArray(o.material)) {
                    o.material = o.material.map((mat: any) => {
                        const clonedMat = mat.clone();
                        clonedMat.color = baseColor.clone();
                        return clonedMat;
                    });
                } else {
                    o.material = o.material.clone();
                    o.material.color = baseColor.clone();
                }
            }
        }
    });
}

/**
 * Converts a cardinal direction to a Y-axis rotation angle in radians
 * @param facing The cardinal direction ('N', 'E', 'S', 'W')
 * @returns The Y-axis rotation angle in radians (0 for North, π/2 for East, π for South, -π/2 for West)
 */
function dirToY(facing?: Dir) {
    switch (facing) {
        case 'N': return 0;
        case 'E': return Math.PI / 2;
        case 'S': return Math.PI;
        case 'W': return -Math.PI / 2;
        default: return 0;
    }
}

// --- GLTF model components with owner-based coloring ---

/**
 * Draw the Pharaoh model
 * @param owner The owner ('RED' or 'SILVER') determining the color tinting
 * @returns A themed Pharaoh model
 */
function PharaohGLTF({ owner }: { owner: 'RED' | 'SILVER' }) {
    const { scene } = useGLTF('/models/pharaoh.glb');
    const clonedScene = useMemo(() => {
        if (scene) {
            const clone = scene.clone();
            withShadowsAndColor(clone, owner);
            return clone;
        }
        return null;
    }, [scene, owner]);
    return clonedScene ? <primitive object={clonedScene} /> : null;
}

/**
 * Draw the Pyramid model
 * @param owner The owner ('RED' or 'SILVER') determining the color tinting
 * @returns A themed Pyramid model
 */
function PyramidGLTF({ owner }: { owner: 'RED' | 'SILVER' }) {
    const { scene } = useGLTF('/models/pyramid.glb');
    const clonedScene = useMemo(() => {
        if (scene) {
            const clone = scene.clone();
            withShadowsAndColor(clone, owner);
            return clone;
        }
        return null;
    }, [scene, owner]);
    return clonedScene ? <primitive object={clonedScene} /> : null;
}

/**
 * Draw the Djed model
 * @param owner The owner ('RED' or 'SILVER') determining the color tinting
 * @returns A themed Djed model
 */
function DjedGLTF({ owner }: { owner: 'RED' | 'SILVER' }) {
    const { scene } = useGLTF('/models/djed.glb');
    const clonedScene = useMemo(() => {
        if (scene) {
            const clone = scene.clone();
            withShadowsAndColor(clone, owner);
            return clone;
        }
        return null;
    }, [scene, owner]);
    return clonedScene ? <primitive object={clonedScene} /> : null;
}

/**
 * Draw the Laser (Sphinx) model
 * @param owner The owner ('RED' or 'SILVER') determining the color tinting
 * @returns A themed Laser model
 */
function LaserGLTF({ owner }: { owner: 'RED' | 'SILVER' }) {
    const { scene } = useGLTF('/models/laser.glb');
    const clonedScene = useMemo(() => {
        if (scene) {
            const clone = scene.clone();
            withShadowsAndColor(clone, owner);
            return clone;
        }
        return null;
    }, [scene, owner]);
    return clonedScene ? <primitive object={clonedScene} /> : null;
}

/**
 * Draw the Obelisk model
 * @param owner The owner ('RED' or 'SILVER') determining the color tinting
 * @returns A themed Obelisk model
 */
function ObeliskGLTF({ owner }: { owner: 'RED' | 'SILVER' }) {
    const { scene } = useGLTF('/models/obelisk.glb'); // TODO: make Obelisk model
    const clonedScene = useMemo(() => {
        if (scene) {
            const clone = scene.clone();
            withShadowsAndColor(clone, owner);
            return clone;
        }
        return null;
    }, [scene, owner]);
    return clonedScene ? <primitive object={clonedScene} /> : null;
}

/**
 * Draw the Anubis model
 * @param owner The owner ('RED' or 'SILVER') determining the color tinting
 * @returns A themed Anubis model
 */
function AnubisGLTF({ owner }: { owner: 'RED' | 'SILVER' }) {
    const { scene } = useGLTF('/models/anubis.glb');
    const clonedScene = useMemo(() => {
        if (scene) {
            const clone = scene.clone();
            withShadowsAndColor(clone, owner);
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
 */
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
 */
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

/**
 * Draw the debug overlay for a cell
 * @param cell The cell to draw the debug overlay for
 * @returns A React component with the debug overlay
 */
function DebugOverlay({ cell }: { cell: NonNullable<Cell> }) {
    const color = '#ffffff';

    if (cell.kind === 'PYRAMID') {
        // Fix missing orientation
        if (!cell.orientation) {
            console.log('WARNING: Pyramid missing orientation, using default N');
            cell.orientation = 'N';
        }

        // Triangle with hypotenuse as reflective face
        // Orientation determines which corner the pyramid points to
        const triangleVertices = new Float32Array([
            -0.2, -0.2, 0,   // bottom left
            0.2, -0.2, 0,    // bottom right  
            0.2, 0.2, 0      // top right
        ]);

        // Rotate triangle so the hypotenuse faces the correct direction
        // N: hypotenuse faces NE (default) |\
        // E: hypotenuse faces SE  |/
        // S: hypotenuse faces SW \|
        // W: hypotenuse faces NW /|
        const rotationMap = {
            N: -Math.PI / 2,
            E: Math.PI,
            S: Math.PI / 2,
            W: 0,
            O: 0
        };

        const rotation = rotationMap[cell.orientation] || 0;

        return (
            <group position={[0, 0.9, 0]} rotation-x={-Math.PI / 2}>
                <group rotation-z={rotation}>
                    <mesh>
                        <bufferGeometry>
                            <bufferAttribute
                                attach="attributes-position"
                                count={3}
                                array={triangleVertices}
                                itemSize={3}
                            />
                        </bufferGeometry>
                        <meshBasicMaterial color={color} side={2} />
                    </mesh>
                </group>
            </group>
        );
    }

    if (cell.kind === 'DJED') {
        // Diagonal slash line for mirror - viewed from above
        return (
            <group position={[0, 0.9, 0]} rotation-x={-Math.PI / 2}>
                {cell.mirror === '/' ? (
                    <mesh position={[0, 0, 0]} rotation-z={-Math.PI / 1.45}>
                        <boxGeometry args={[0.4, 0.05, 0.05]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                ) : (
                    <mesh position={[0, 0, 0]} rotation-z={Math.PI / 1.45}>
                        <boxGeometry args={[0.4, 0.05, 0.05]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                )}
            </group>
        );
    }

    if (cell.kind === 'PHARAOH') {
        // Square
        return (
            <group position={[0, 0.9, 0]} rotation-x={-Math.PI / 2}>
                <mesh>
                    <planeGeometry args={[0.3, 0.3]} />
                    <meshBasicMaterial color={color} wireframe />
                </mesh>
            </group>
        );
    }

    if (cell.kind === 'OBELISK') {
        // U shape viewed from above
        return (
            <group position={[0, 0.9, 0]} rotation-x={-Math.PI / 2}>
                <mesh position={[-0.1, 0, 0]}>
                    <planeGeometry args={[0.05, 0.3]} />
                    <meshBasicMaterial color={color} />
                </mesh>
                <mesh position={[0.1, 0, 0]}>
                    <planeGeometry args={[0.05, 0.3]} />
                    <meshBasicMaterial color={color} />
                </mesh>
                <mesh position={[0, -0.125, 0]}>
                    <planeGeometry args={[0.2, 0.05]} />
                    <meshBasicMaterial color={color} />
                </mesh>
            </group>
        );
    }

    if (cell.kind === 'ANUBIS') {
        // U shape rotated to show vulnerable sides (opening faces away from protected front)
        const rotation = dirToY(cell.orientation) + Math.PI; // Rotate 180° so opening faces away from protected front
        return (
            <group position={[0, 0.9, 0]} rotation-x={-Math.PI / 2}>
                <group rotation-z={rotation}>
                    <mesh position={[-0.1, 0, 0]}>
                        <planeGeometry args={[0.05, 0.3]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                    <mesh position={[0.1, 0, 0]}>
                        <planeGeometry args={[0.05, 0.3]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                    <mesh position={[0, -0.125, 0]}>
                        <planeGeometry args={[0.2, 0.05]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                </group>
            </group>
        );
    }

    if (cell.kind === 'LASER') {
        // Arrow pointing in facing direction
        const rotation = dirToY(cell.facing);
        return (
            <group position={[0, 0.9, 0]} rotation-x={-Math.PI / 2}>
                <group rotation-z={rotation}>
                    <mesh position={[0, 0.1, 0]}>
                        <coneGeometry args={[0.1, 0.2, 3]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                </group>
            </group>
        );
    }

    return null;
}

/**
 * Render a piece on the board.
 * @param r row piece is on
 * @param c column piece is on
 * @param cell piece to render
 * @param selected if piece is selected
 * @param onSelect callback when piece is selected
 * @param debugMode if true, render debug overlay
 * @returns 3D mesh for the piece
 */
function Piece3D({ r, c, cell, selected, onSelect, debugMode }:
    { r: number; c: number; cell: NonNullable<Cell>; selected: boolean; onSelect: (pos: Pos) => void; debugMode: boolean }) {
    const pos = gridToWorld(r, c);
    const colour = cell.owner === 'RED' ? '#ff6b6b' : '#6b8bff';
    const outline = selected ? 0.06 : 0;

    // Debug logging for piece rendering
    if (cell.kind === 'PYRAMID') {
        console.log(`Rendering pyramid at ${r},${c}:`); //, JSON.stringify(cell, null, 2)
    }

    let pyramidAngle;
    if (cell.orientation == 'N' || cell.orientation == 'S') {
        pyramidAngle = Math.PI / 2;
    } else {
        pyramidAngle = -Math.PI / 2;
    }

    // orientation-based Y rotation for Pyramid, mirror-based for Djed
    const pyramidRotY = cell.kind === 'PYRAMID' && cell.orientation ? dirToY(cell.orientation) + pyramidAngle : 0;
    const mirrorRotY = cell.mirror === '/' ? 0 : Math.PI / 2;

    return (
        <group
            position={[pos.x, 0.2, pos.z]}
            onPointerDown={(e) => {
                e.stopPropagation();
                onSelect({ r, c });
            }}
        >
            {/* pedestals to make selection more visible */}
            {outline > 0 && (
                <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
                    <ringGeometry args={[0.35, 0.35 + outline, 32]} />
                    <meshBasicMaterial color={cell.owner === 'RED' ? '#ffaaaa' : '#aaccff'} transparent opacity={0.8} />
                </mesh>
            )}

            {/* coloured base token under each piece */}
            <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[0.28, 0.32, 24]} />
                <meshBasicMaterial color={colour} />
            </mesh>

            {/* Debug overlay */}
            {debugMode && <DebugOverlay cell={cell} />}

            {/* Compass - only show on one piece to avoid clutter */}
            {debugMode && r === 0 && c === 0 && (
                <group position={[0, 1.2, 0]}>
                    {/* N */}
                    <mesh position={[0, 0, -0.3]}>
                        <boxGeometry args={[0.02, 0.02, 0.2]} />
                        <meshBasicMaterial color="#ff0000" />
                    </mesh>
                    {/* E */}
                    <mesh position={[0.3, 0, 0]}>
                        <boxGeometry args={[0.2, 0.02, 0.02]} />
                        <meshBasicMaterial color="#00ff00" />
                    </mesh>
                    {/* S */}
                    <mesh position={[0, 0, 0.3]}>
                        <boxGeometry args={[0.02, 0.02, 0.2]} />
                        <meshBasicMaterial color="#0000ff" />
                    </mesh>
                    {/* W */}
                    <mesh position={[-0.3, 0, 0]}>
                        <boxGeometry args={[0.2, 0.02, 0.02]} />
                        <meshBasicMaterial color="#ffff00" />
                    </mesh>
                </group>
            )}

            {/* GLTF models with orientation and owner-based coloring */}
            {cell.kind === 'PHARAOH' && (
                <group position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    <PharaohGLTF owner={cell.owner} />
                </group>
            )}

            {cell.kind === 'OBELISK' && (
                <group position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    <ObeliskGLTF owner={cell.owner} />
                </group>
            )}

            {cell.kind === 'PYRAMID' && (
                <group rotation-y={pyramidRotY} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    <PyramidGLTF owner={cell.owner} />
                </group>
            )}

            {cell.kind === 'DJED' && (
                <group rotation-y={mirrorRotY} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    <DjedGLTF owner={cell.owner} />
                </group>
            )}

            {cell.kind === 'OBELISK' && (
                <group rotation-y={dirToY(cell.orientation)} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    <ObeliskGLTF owner={cell.owner} />
                </group>
            )}

            {cell.kind === 'LASER' && (
                <group rotation-y={dirToY(cell.facing)} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    <LaserGLTF owner={cell.owner} />
                </group>
            )}

            {cell.kind === 'ANUBIS' && (
                <group rotation-y={dirToY(cell.orientation) + Math.PI} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    <AnubisGLTF owner={cell.owner} />
                </group>
            )}
        </group>
    );
}

/**
 * Renders the 3D board tiles with alternating colors and click handlers
 * 
 * @param state - Current game state
 * @param onTileClick - Callback when a tile is clicked with position
 */
function Tiles({ state, onTileClick, selected, getValidMoves }: { state: GameState; onTileClick: (pos: Pos) => void; selected: Pos | null; getValidMoves: (pos: Pos) => Array<{r: number, c: number, type: string}> }) {
    const validMoves = selected ? getValidMoves(selected) : [];
    
    const tiles = useMemo(() => {
        const acc: { key: string; r: number; c: number; color: string }[] = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const even = (r + c) % 2 === 0;
                const moveHighlight = validMoves.find(m => m.r === r && m.c === c);
                let color = even ? '#ececec' : '#d6d6d6';
                
                // Color tiles based on player zones
                if (c === 0 || (c === 8 && (r === 0 || r === 7))) {
                    color = '#ffcccc'; // RED zone
                } else if (c === 9 || (c === 1 && (r === 0 || r === 7))) {
                    color = '#ccccff'; // SILVER zone
                }
                
                if (moveHighlight?.type === 'move') color = '#4caf50';
                else if (moveHighlight?.type === 'swap') color = '#ffc107';
                
                acc.push({
                    key: `${r}-${c}`,
                    r, c,
                    color
                });
            }
        }
        return acc;
    }, [validMoves]);

    return (
        <group>
            {tiles.map((t) => {
                const pos = gridToWorld(t.r, t.c);
                return (
                    <mesh
                        key={t.key}
                        position={[pos.x, 0.05, pos.z]}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            onTileClick({ r: t.r, c: t.c });
                        }}
                        receiveShadow
                        castShadow
                    >
                        <boxGeometry args={[TILE_SIZE - GAP, 0.2, TILE_SIZE - GAP]} />
                        <meshStandardMaterial color={t.color} roughness={0.8} metalness={0.1} />
                    </mesh>
                );
            })}
        </group>
    );
}

/**
 * LaserPath3D component
 * @param path to render
 * @returns JSX.Element | null
 */
function LaserPath3D({ path }: { path: Pos[] | undefined }) {
    if (!path || path.length === 0) return null;

    const points = path.map(p => {
        const v = gridToWorld(p.r, p.c);
        return [v.x, 0.35, v.z];
    });

    return (
        <Line
            points={points as unknown as [number, number, number][]}
            color="#ff3333"
            linewidth={3}
            transparent
            opacity={0.9}
        />
    );
}

/**
 * Board3D component
 * Renders the 3D board with pieces and laser paths
 * @returns JSX.Element | null
 */
export function Board3D() {
    const state = useGame(s => s.state);
    const color = useGame(s => s.color);
    const sendMove = useGame(s => s.sendMove);

    const [selected, setSelected] = useState<Pos | null>(null);
    const [debugMode, setDebugMode] = useState(false);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'd') {
                setDebugMode(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    const isMyTurn = state && color && state.turn === color;

    const getValidMoves = useCallback((pos: Pos) => {
        if (!state) return [];
        const piece = state.board[pos.r][pos.c];
        if (!piece || piece.kind === 'LASER') return [];
        
        const moves = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newR = pos.r + dr;
                const newC = pos.c + dc;
                if (newR >= 0 && newR < ROWS && newC >= 0 && newC < COLS) {
                    // Check zone restrictions
                    const isRedZone = newC === 0 || (newC === 8 && (newR === 0 || newR === 7));
                    const isSilverZone = newC === 9 || (newC === 1 && (newR === 0 || newR === 7));
                    
                    if ((piece.owner === 'RED' && isSilverZone) || (piece.owner === 'SILVER' && isRedZone)) {
                        continue; // Can't move into opponent's zone
                    }
                    
                    const targetPiece = state.board[newR][newC];
                    if (!targetPiece) {
                        moves.push({ r: newR, c: newC, type: 'move' });
                    } else if (piece.kind === 'DJED' && 
                               (targetPiece.kind === 'PYRAMID' || targetPiece.kind === 'OBELISK' || targetPiece.kind === 'ANUBIS')) {
                        moves.push({ r: newR, c: newC, type: 'swap' });
                    }
                }
            }
        }
        return moves;
    }, [state]);

    const onSelectPiece = useCallback((pos: Pos) => {
        if (debugMode) {
            console.log('onSelectPiece called:', pos, 'isMyTurn:', isMyTurn, 'color:', color);
        }
        if (!isMyTurn) {
            if (debugMode) console.log('Not my turn, ignoring selection');
            return;
        }
        const cell = state?.board[pos.r][pos.c];
        if (debugMode) console.log('Cell at position:', cell);
        if (!cell || cell.owner !== color) {
            if (debugMode) console.log('Cell empty or not owned by player');
            return;
        }
        if (debugMode) console.log('Setting selected to:', pos);
        setSelected(pos);
    }, [state, color, isMyTurn, debugMode]);

    const onTileClick = useCallback((to: Pos) => {
        if (!isMyTurn || !selected || !state) return;
        const dr = Math.abs(to.r - selected.r);
        const dc = Math.abs(to.c - selected.c);
        if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) {
            // must be 1 step in any direction
            setSelected(null);
            return;
        }
        
        const targetPiece = state.board[to.r][to.c];
        const selectedPiece = state.board[selected.r][selected.c];
        
        if (targetPiece) {
            // Allow Djed swap with enemy pieces
            if (selectedPiece?.kind === 'DJED' && 
                (targetPiece.kind === 'PYRAMID' || targetPiece.kind === 'OBELISK' || targetPiece.kind === 'ANUBIS')) {
                sendMove({ type: 'MOVE', from: selected, to });
            }
        } else {
            // Regular move to empty space
            sendMove({ type: 'MOVE', from: selected, to });
        }
        setSelected(null);
    }, [isMyTurn, selected, state, sendMove, color]);

    const onRotateSelected = useCallback((delta: 90 | -90) => {
        if (!isMyTurn || !selected) return;
        sendMove({ type: 'ROTATE', from: selected, rotation: delta });
        setSelected(null);
    }, [isMyTurn, selected, sendMove]);

    if (!state) return <div>Waiting for state…</div>;

    useGLTF.preload('/models/pharaoh.glb');
    useGLTF.preload('/models/pyramid.glb');
    useGLTF.preload('/models/djed.glb');
    useGLTF.preload('/models/obelisk.glb');
    useGLTF.preload('/models/laser.glb');
    useGLTF.preload('/models/anubis.glb');

    return (
        <div className="border rounded" style={{ height: 600, overflow: 'hidden', position: 'relative' }}>
            {/* HUD for rotate */}
            <div className="d-flex align-items-center p-2 bg-light border-bottom" style={{ position: 'relative', zIndex: 10 }}>
                <div className="flex-grow-1">
                    <strong>Turn:</strong> <span className="text-primary">{state.turn}</span> {isMyTurn && <span className="badge bg-success ms-1">Your move</span>}
                    {selected && <span className="ms-3 text-muted">Selected: {selected.r},{selected.c}</span>}
                    {debugMode && <span className="ms-3 small text-secondary">Debug: selected={selected ? 'yes' : 'no'}, isMyTurn={isMyTurn ? 'yes' : 'no'}</span>}
                </div>
                <div className="btn-group">
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled={!isMyTurn || !selected}
                        onClick={() => onRotateSelected(-90)}
                    >
                        Rotate ⟲
                    </button>
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled={!isMyTurn || !selected}
                        onClick={() => onRotateSelected(90)}
                    >
                        Rotate ⟳
                    </button>
                </div>
            </div>

            <Canvas
                shadows
                camera={{ position: [0, 8, 10], fov: 45, near: 0.1, far: 100 }}
                style={{ background: '#000000', height: 'calc(100% - 50px)' }}
            >
                {/* Lights */}
                <ambientLight intensity={0.6} />
                <directionalLight
                    position={[8, 12, 6]}
                    intensity={0.9}
                    castShadow
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                />

                {/* Ground/board shadow catcher */}
                <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} receiveShadow>
                    <planeGeometry args={[BOARD_W + 2, BOARD_H + 2]} />
                    <shadowMaterial opacity={0.25} />
                </mesh>

                {/* Board plane (tiles) */}
                <Tiles state={state} onTileClick={onTileClick} selected={selected} getValidMoves={getValidMoves} />

                {/* Pieces */}
                <group>
                    {state.board.map((row, r) =>
                        row.map((cell, c) =>
                            cell ? (
                                <Piece3D
                                    key={`${r}-${c}-${cell.id}`}
                                    r={r}
                                    c={c}
                                    cell={cell}
                                    selected={selected?.r === r && selected?.c === c}
                                    onSelect={onSelectPiece}
                                    debugMode={debugMode}
                                />
                            ) : null
                        )
                    )}
                </group>

                {/* Laser path visualisation */}
                <LaserPath3D path={state.lastLaserPath} />

                <OrbitControls
                    enablePan
                    enableRotate
                    enableZoom
                    minDistance={5}
                    maxDistance={30}
                    target={[0, 0, 0]}
                />
            </Canvas>
        </div>
    );
}
