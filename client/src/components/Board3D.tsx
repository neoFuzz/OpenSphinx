import React, { useMemo, useState, useCallback, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Environment } from '@react-three/drei';
import { useGame } from '../state/game';
import { COLS, ROWS } from '../../../shared/src/constants';
import type { Cell, Dir, GameState, Pos, Piece } from '../../../shared/src/types';
import { getNextValidSphinxDirection, getSphinxRotationDelta } from '../../../shared/src/engine/sphinx-utils';
import { useMovementAnimation, useRotationAnimation, useExplosionAnimation, usePieceAnimation, type RotationAnimation, type MovementAnimation, type ExplosionAnimation } from '../utils/animationUtils';
import { PharaohGLTF, PyramidGLTF, DjedGLTF, LaserGLTF, ObeliskGLTF, AnubisGLTF, preloadModels } from './models/GameModels';
import * as THREE from 'three';
import { CubeCamera } from './CubeCamera';

// --- layout constants ---
const TILE_SIZE = 1;          // 1 unit per square
const GAP = 0.02;             // small gap between tiles
const BOARD_W = COLS * TILE_SIZE;
const BOARD_H = ROWS * TILE_SIZE;

// --- color constants ---
const COLORS = {
    RED: '#ff6666',
    SILVER: '#fff'
};

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

/**
 * Draw the debug overlay for a cell
 * @param cell The cell to draw the debug overlay for
 * @returns A React component with the debug overlay
 */
function DebugOverlay({ piece }: { piece: Piece }) { // NOSONAR(6759)
    const color = '#ffffff';

    if (piece.kind === 'PYRAMID') {
        // Fix missing orientation
        if (!piece.orientation) {
            console.log('WARNING: Pyramid missing orientation, using default N');
            piece.orientation = 'N';
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

        const rotation = rotationMap[piece.orientation] || 0;

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

    if (piece.kind === 'DJED') {
        // Diagonal slash line for mirror - viewed from above
        return (
            <group position={[0, 0.9, 0]} rotation-x={-Math.PI / 2}>
                {piece.mirror === '/' ? (
                    <mesh position={[0, 0, 0]} rotation-z={-Math.PI / 1.35}>
                        <boxGeometry args={[0.4, 0.05, 0.05]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                ) : (
                    <mesh position={[0, 0, 0]} rotation-z={Math.PI / 1.35}>
                        <boxGeometry args={[0.4, 0.05, 0.05]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                )}
            </group>
        );
    }

    if (piece.kind === 'PHARAOH') {
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

    if (piece.kind === 'OBELISK') {
        // U shape viewed from above with stack count
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

    if (piece.kind === 'ANUBIS') {
        // U shape rotated to show vulnerable sides (opening faces away from protected front)
        if (!piece.orientation) {
            console.debug('WARNING: ANUBIS missing orientation, using default N');
        }
        const rotation = dirToY(piece.orientation || 'N') + Math.PI; // Rotate 180° so opening faces away from protected front
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

    if (piece.kind === 'LASER' || piece.kind === 'SPHINX') {
        // Arrow pointing in facing direction
        const rotation = dirToY(piece.facing);
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
interface Piece3DProps {
    r: number; c: number; cell: Piece[]; selected: boolean;
    onSelect: (pos: Pos) => void; debugMode: boolean;
    rotatingPieces: Map<string, RotationAnimation>;
    movingPieces: Map<string, MovementAnimation>;
    setRotatingPieces: React.Dispatch<React.SetStateAction<Map<string, RotationAnimation>>>;
    setMovingPieces: React.Dispatch<React.SetStateAction<Map<string, MovementAnimation>>>;
    moveStackMode: boolean;
    setMoveStackMode: React.Dispatch<React.SetStateAction<boolean>>;
    isClassic: boolean;
    envMap?: THREE.CubeTexture | null;
}

/**
 * Renders a 3D game piece with animations, selection highlighting, and interactive elements.
 * Handles piece rotation, movement animations, stack management for obelisks, and debug overlays.
 * 
 * @param props - Configuration object containing:
 * @param props.r - Row position on the game board
 * @param props.c - Column position on the game board  
 * @param props.cell - Array of pieces at this position (for stacking)
 * @param props.selected - Whether this piece is currently selected
 * @param props.onSelect - Callback when piece is clicked
 * @param props.debugMode - Whether to show debug information
 * @param props.rotatingPieces - Map of pieces currently rotating
 * @param props.movingPieces - Map of pieces currently moving
 * @param props.setRotatingPieces - Setter for rotation animations
 * @param props.setMovingPieces - Setter for movement animations
 * @param props.moveStackMode - Whether stack movement mode is enabled
 * @param props.setMoveStackMode - Setter for stack movement mode
 * @param props.isClassic - Whether using classic game rules
 * @param props.envMap - Environment map for reflective materials
 * @returns JSX element representing the 3D piece with all visual effects
 */
function Piece3D(props: Piece3DProps) {
    const { r, c, cell, selected, onSelect, debugMode, rotatingPieces, movingPieces, setRotatingPieces, setMovingPieces, moveStackMode, setMoveStackMode, isClassic, envMap } = props;
    const pos = gridToWorld(r, c);
    const topPiece = useMemo(() => cell[cell.length - 1], [cell.length, cell[cell.length - 1]?.id]); // Get top piece for display
    const colour = topPiece.owner === 'RED' ? COLORS.RED : COLORS.SILVER;
    const outline = selected ? 0.06 : 0;

    // Debug logging for piece rendering
    if (topPiece.kind === 'PYRAMID' && debugMode) {
        console.log('Rendering pyramid at position:', { r: Math.floor(r), c: Math.floor(c) });
    }

    let pyramidAngle;
    if (topPiece.orientation === 'N' || topPiece.orientation === 'S') {
        pyramidAngle = Math.PI / 2;
    } else {
        pyramidAngle = -Math.PI / 2;
    }

    // orientation-based Y rotation for Pyramid, mirror-based for Djed
    const pyramidRotY = topPiece.kind === 'PYRAMID' && topPiece.orientation ?
        dirToY(topPiece.orientation) + pyramidAngle : 0;
    const mirrorRotY = topPiece.mirror === '/' ? 0 : Math.PI / 2;

    // Get current base rotation
    let currentBaseRotY = (kind => {
        switch (kind) {
            case 'PYRAMID': return pyramidRotY;
            case 'DJED': return mirrorRotY;
            case 'LASER': return dirToY(topPiece.facing);
            case 'SPHINX': return -dirToY(topPiece.facing); // Invert rotation for model
            case 'ANUBIS': return -dirToY(topPiece.orientation); // Invert rotation for model
            default: return topPiece.orientation ? dirToY(topPiece.orientation) : 0;
        }
    })(topPiece.kind);

    // Debug current rotation calculation
    if (debugMode && topPiece.kind === 'DJED') {
        console.log('DJED rotation calc:', {
            mirror: topPiece.mirror,
            mirrorRotY: Number(mirrorRotY.toFixed(3)),
            currentBaseRotY: Number(currentBaseRotY.toFixed(3))
        });
    }

    // Use animation hook
    const { animatedRotY, animationPos, animationY } = usePieceAnimation(
        topPiece.id,
        currentBaseRotY,
        pos,
        rotatingPieces,
        movingPieces,
        setRotatingPieces,
        setMovingPieces
    );

    return (
        <group
            position={[animationPos.x, animationY, animationPos.z]}
            onPointerDown={(e) => {
                e.stopPropagation();
                onSelect({ r, c });
            }}
        >
            {/* pedestals to make selection more visible */}
            {outline > 0 && (
                <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
                    <ringGeometry args={[0.48, 0.46 + outline, 32]} />
                    <meshBasicMaterial color={topPiece.owner === 'RED' ? '#ffaaaa' : '#aaccff'} transparent opacity={0.8} />
                </mesh>
            )}

            {/* coloured base token under each piece */}
            <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[0.42, 0.46, 24]} />
                <meshBasicMaterial color={colour} />
            </mesh>

            {/* Debug overlay */}
            {debugMode && <DebugOverlay piece={topPiece} />}

            {/* Lock/unlock disc for selected obelisk stacks */}
            {selected && topPiece.kind === 'OBELISK' && cell.length > 1 && (
                <group
                    position={[0, cell.length * 0.6 + 0.5, 0]}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        setMoveStackMode(!moveStackMode);
                    }}
                >
                    <mesh>
                        <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
                        <meshBasicMaterial
                            color={moveStackMode ? '#ff4444' : '#44ff44'}
                            transparent
                            opacity={0.8}
                        />
                    </mesh>
                </group>
            )}

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
            {topPiece.kind === 'PHARAOH' && (
                <group rotation-y={animatedRotY} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    <PharaohGLTF owner={topPiece.owner} />
                </group>
            )}

            {topPiece.kind === 'OBELISK' && (
                <group rotation-y={animatedRotY} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    {/* Render multiple obelisks for stacks */}
                    {cell.map((piece, i) => (
                        <group key={piece.id} position={[0, i * 0.6, 0]}>
                            <ObeliskGLTF owner={piece.owner} />
                        </group>
                    ))}
                </group>
            )}

            {topPiece.kind === 'PYRAMID' && (
                <group rotation-y={animatedRotY} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    <PyramidGLTF owner={topPiece.owner} envMap={envMap || undefined} />
                </group>
            )}

            {topPiece.kind === 'DJED' && (
                <group rotation-y={animatedRotY} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    <DjedGLTF owner={topPiece.owner} envMap={envMap || undefined} />
                </group>
            )}

            {topPiece.kind === 'LASER' && (
                <group rotation-y={animatedRotY} position={[0, 0, 0]}>
                    <mesh castShadow receiveShadow>
                        <cylinderGeometry args={[0.3, 0.3, 0.5, 16]} />
                        <meshStandardMaterial color={topPiece.owner === 'RED' ? COLORS.RED : COLORS.SILVER} metalness={0.3} roughness={0.7} />
                    </mesh>
                </group>
            )}

            {topPiece.kind === 'SPHINX' && (
                <group rotation-y={animatedRotY} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    <LaserGLTF owner={topPiece.owner} />
                </group>
            )}

            {topPiece.kind === 'ANUBIS' && (
                <group rotation-y={animatedRotY} position={[0, 0, 0]} scale={[0.5, 0.5, 0.5]}>
                    <AnubisGLTF owner={topPiece.owner} />
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
function Tiles({ state, onTileClick, selected, getValidMoves }:
    {
        state: GameState; onTileClick: (pos: Pos) => void; selected: Pos | null;
        getValidMoves: (pos: Pos) => Array<{ r: number, c: number, type: string }>
    }) {
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
 * RotateGizmo component - simple circular arrows for rotation
 *
 * @param position Position of the gizmo
 * @param onRotate Callback when the gizmo is clicked with rotation direction
 */
function RotateGizmo({ position, onRotate }: { position: [number, number, number]; onRotate: (delta: 90 | -90) => void }) {
    return (
        <group position={position}>
            {/* Clockwise arrow */}
            <group
                position={[0.6, 0.76, 0]}
                onPointerDown={(e) => { e.stopPropagation(); onRotate(90); }} >
                <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.15]} />
                    <meshBasicMaterial color="#333" transparent opacity={0.8} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.08, 0.012, 8, 16, Math.PI * 1.5]} />
                    <meshBasicMaterial color="#00aa00" />
                </mesh>
                <mesh position={[0.075, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.035, 0.08, 3]} />
                    <meshBasicMaterial color="#00aa00" />
                </mesh>
            </group>

            {/* Counter-clockwise arrow */}
            <group
                position={[-0.6, 0.76, 0]}
                onPointerDown={(e) => { e.stopPropagation(); onRotate(-90); }}
            >
                <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.15]} />
                    <meshBasicMaterial color="#333" transparent opacity={0.8} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.08, 0.012, 8, 16, Math.PI * 1.5]} />
                    <meshBasicMaterial color="#aa0000" />
                </mesh>
                <mesh position={[0.0, 0.005, 0.08]} rotation={[Math.PI / 2, 0, -Math.PI / 2]}>
                    <coneGeometry args={[0.035, 0.08, 3]} />
                    <meshBasicMaterial color="#aa0000" />
                </mesh>
            </group>
        </group>
    );
}

/**
 * SphinxRotateGizmo component - single arrow showing next valid direction
 * 
 * @param position Position of the gizmo
 * @param onRotate Callback when the gizmo is clicked
 * @param nextDirection Next valid direction
 */
function SphinxRotateGizmo({ position, onRotate, nextDirection }: { position: [number, number, number]; onRotate: () => void; nextDirection: Dir }) {
    // Calculate rotation for the arrow to point to the next direction
    // Invert North and South directions for correct arrow pointing
    const arrowRotation = (nextDirection === 'N' || nextDirection === 'S')
        ? dirToY(nextDirection) + Math.PI
        : dirToY(nextDirection);

    return (
        <group position={position}>
            {/* Single arrow pointing to next valid direction */}
            <group
                position={[0, 1.5, 0]}
                onPointerDown={(e) => { e.stopPropagation(); onRotate(); }}
            >
                {/* Background circle */}
                <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.15]} />
                    <meshBasicMaterial color="#333" transparent opacity={0.8} />
                </mesh>

                {/* Rotating arrow group */}
                <group rotation={[0, arrowRotation, 0]}>
                    {/* Arrow shaft */}
                    <mesh position={[0, 0.00, 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.015, 0.015, 0.15, 8]} />
                        <meshBasicMaterial color="#0066cc" />
                    </mesh>
                    {/* Arrow head */}
                    <mesh position={[0, 0.005, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
                        <coneGeometry args={[0.05, 0.05, 4]} />
                        <meshBasicMaterial color="#0066cc" />
                    </mesh>
                </group>
            </group>
        </group>
    );
}

/**
 * Explosion3D component with billboard sprite and particles
 * 
 * @param explosions - Map of explosion animations
 * @param setExplosions - Function to update the explosions map
 */
function Explosion3D({ explosions, setExplosions }: { explosions: Map<string, ExplosionAnimation>; setExplosions: React.Dispatch<React.SetStateAction<Map<string, ExplosionAnimation>>> }) {
    const explosionTexture = useMemo(() => new THREE.TextureLoader().load('/explosion.webp'), []);

    useFrame(() => {
        const now = performance.now();
        const toRemove: string[] = [];

        explosions.forEach((explosion, id) => {
            if (now - explosion.startTime > 800) {
                toRemove.push(id);
            }
        });

        if (toRemove.length > 0) {
            setExplosions(prev => {
                const next = new Map(prev);
                toRemove.forEach(id => next.delete(id));
                return next;
            });
        }
    });

    return (
        <group>
            {Array.from(explosions.entries()).map(([id, explosion]) => {
                const pos = gridToWorld(explosion.pos.r, explosion.pos.c);
                const elapsed = performance.now() - explosion.startTime;
                const progress = Math.min(elapsed / 800, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const scale = 0.5 + eased * 2;
                const opacity = Math.max(0, (1 - progress) * (1 - progress));

                return (
                    <group key={id} position={[pos.x, 0.6, pos.z]}>
                        {/* Main explosion sprite */}
                        <sprite scale={[scale, scale, 1]}>
                            <spriteMaterial map={explosionTexture} transparent opacity={opacity} />
                        </sprite>

                        {/* Particle effects */}
                        {Array.from({ length: 6 }, (_, i) => {
                            const angle = (i / 6) * Math.PI * 2;
                            const distance = eased * 1.2;
                            const x = Math.cos(angle) * distance;
                            const z = Math.sin(angle) * distance;
                            const y = Math.sin(eased * Math.PI) * 0.5;
                            const particleScale = 0.03 + eased * 0.02;
                            const particleOpacity = Math.max(0, (1 - eased) * 0.8);

                            return (
                                <mesh key={i} position={[x, y, z]} scale={[particleScale, particleScale, particleScale]}>
                                    <sphereGeometry args={[1, 6, 6]} />
                                    <meshBasicMaterial color="#ffaa00" transparent opacity={particleOpacity} />
                                </mesh>
                            );
                        })}
                    </group>
                );
            })}
        </group>
    );
}

/**
 * LaserPath3D component
 * 
 * @param path to render
 * @param state current game state
 * @returns JSX.Element | null
 */
function LaserPath3D({ path, state }: { path: Pos[] | undefined; state: GameState }) {
    if (!path || path.length === 0) return null;

    // Find laser emitter position to start the path from
    let emitterPos: Pos | null = null;

    // The laser comes from the player who just moved and fired their laser
    // When there's a winner, the turn doesn't switch, so state.turn is the player who just moved
    // When there's no winner, the turn has switched, so we need the opposite player
    const laserOwner = state.winner ? state.turn : (state.turn === 'RED' ? 'SILVER' : 'RED');

    // Look for SPHINX pieces on board
    for (let r = 0; r < state.board.length; r++) {
        for (let c = 0; c < state.board[0].length; c++) {
            const cell = state.board[r][c];
            if (cell && cell.length > 0) {
                const p = cell[cell.length - 1];
                if (p.kind === 'SPHINX' && p.owner === laserOwner) {
                    emitterPos = { r, c };
                    break;
                }
            }
        }
        if (emitterPos) break;
    }

    // For classic rules, use off-board positions
    if (!emitterPos) {
        if (laserOwner === 'RED') {
            emitterPos = { r: 0, c: 0 }; // Start from first tile
        } else {
            emitterPos = { r: 7, c: 9 }; // Start from last tile
        }
    }

    const allPoints = [emitterPos, ...path];
    const points = allPoints.map(p => {
        const v = gridToWorld(p.r, p.c);
        return [v.x, 0.5, v.z];
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
 * Error boundary for Environment component
 */
class EnvironmentErrorBoundary extends Component<
    { children: ReactNode; fallback: ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: ReactNode; fallback: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): { hasError: boolean } {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.warn('Environment failed to load:', error.message);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

/**
 * Memoized lighting component to prevent multiple light instances
 */
const SceneLights = React.memo(({ isClassic }: { isClassic: boolean }) => {
    return (
        <>
            <ambientLight intensity={0.2} />
            <directionalLight
                position={[10, 10, 10]}
                intensity={0.8}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-left={-8}
                shadow-camera-right={8}
                shadow-camera-top={8}
                shadow-camera-bottom={-8}
            />
        </>
    );
});

/**
 * Memoized ground mesh with cached textures
 */
const GroundMesh = React.memo(() => {
    const textures = useMemo(() => {
        const loader = new THREE.TextureLoader();
        const createTexture = (path: string) => {
            const tex = loader.load(path);
            tex.repeat.set(32, 32);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            return tex;
        };
        return {
            map: createTexture('/textures/dirt/brown_dirt_7_diffuse.png'),
            normalMap: createTexture('/textures/dirt/brown_dirt_7_normal.png'),
            roughnessMap: createTexture('/textures/dirt/brown_dirt_7_glossiness.png'),
            metalnessMap: createTexture('/textures/dirt/brown_dirt_7_reflection.png'),
            displacementMap: createTexture('/textures/dirt/brown_dirt_7_height.png')
        };
    }, []);

    return (
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.1, 0]} receiveShadow>
            <circleGeometry args={[64, 64]} />
            <meshStandardMaterial
                {...textures}
                displacementScale={0.1}
                metalness={0.1}
                roughness={0.9}
                color="#dd773b"
            />
        </mesh>
    );
});

/**
 * Board3D component.
 * Renders the 3D board with pieces and laser paths
 *
 * @param environmentPreset The environment preset to use
 * @param cubeMapQuality The quality of the cube map for the environment
 * @returns JSX.Element | null
 */
export function Board3D({ environmentPreset = 'park', cubeMapQuality = 'low' }: { environmentPreset?: string; cubeMapQuality?: 'off' | 'low' | 'medium' | 'high' | 'ultra' }) {
    const state = useGame(s => s.state);
    const color = useGame(s => s.color);
    const sendMove = useGame(s => s.sendMove);

    const [selected, setSelected] = useState<Pos | null>(null);
    const [debugMode, setDebugMode] = useState(false);
    const [moveStackMode, setMoveStackMode] = useState(true); // true = move entire stack, false = move top only
    const [envMap, setEnvMap] = useState<THREE.CubeTexture | null>(null);
    const [fps, setFps] = useState(0);
    const prevStateRef = useRef(state);
    const fpsRef = useRef({ frames: 0, lastTime: performance.now() });
    const controlsRef = useRef<any>(null);

    // Use animation hooks
    const { rotatingPieces, setRotatingPieces, animateRotation } = useRotationAnimation();
    const { movingPieces, setMovingPieces, animateMovement } = useMovementAnimation();
    const { explosions, setExplosions, triggerExplosion } = useExplosionAnimation();

    // Cleanup WebGL context on unmount
    useEffect(() => {
        return () => {
            // Dispose of environment map
            if (envMap) {
                envMap.dispose();
            }
        };
    }, [envMap]);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'd') {
                setDebugMode(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    // FPS counter
    useEffect(() => {
        if (!debugMode) return;

        const updateFps = () => {
            fpsRef.current.frames++;
            const now = performance.now();
            if (now - fpsRef.current.lastTime >= 1000) {
                setFps(fpsRef.current.frames);
                fpsRef.current.frames = 0;
                fpsRef.current.lastTime = now;
            }
            requestAnimationFrame(updateFps);
        };

        const id = requestAnimationFrame(updateFps);
        return () => cancelAnimationFrame(id);
    }, [debugMode]);

    // Detect piece rotations and trigger animations
    useEffect(() => {
        if (!state || !prevStateRef.current) {
            prevStateRef.current = state;
            return;
        }

        const prevState = prevStateRef.current;

        // Find destroyed pieces (only check if laser was fired)
        if (state.lastLaserPath && state.lastLaserPath.length > 0) {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const prevCell = prevState.board[r][c];
                    const currentCell = state.board[r][c];

                    if (prevCell && prevCell.length > 0 && (!currentCell || currentCell.length === 0)) {
                        const prevPiece = prevCell[prevCell.length - 1];
                        let pieceMovedElsewhere = false;

                        // Check if this piece moved to another location
                        for (let nr = 0; nr < ROWS && !pieceMovedElsewhere; nr++) {
                            for (let nc = 0; nc < COLS && !pieceMovedElsewhere; nc++) {
                                const newCell = state.board[nr][nc];
                                if (newCell && newCell.some(p => p.id === prevPiece.id)) {
                                    pieceMovedElsewhere = true;
                                }
                            }
                        }

                        // Only show explosion if piece was actually destroyed (not moved)
                        if (!pieceMovedElsewhere) {
                            triggerExplosion({ r, c });
                        }
                    }
                }
            }
        }

        // Find pieces that moved or rotated
        const processedPieces = new Set<string>();

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const currentCell = state.board[r][c];
                if (!currentCell || currentCell.length === 0) continue;
                const currentTopPiece = currentCell[currentCell.length - 1];
                const currentPiece = currentTopPiece;
                if (processedPieces.has(currentPiece.id)) continue;

                // Find where this piece was in the previous state
                let foundPrevPos = null;
                for (let pr = 0; pr < ROWS; pr++) {
                    for (let pc = 0; pc < COLS; pc++) {
                        const prevCell = prevState.board[pr][pc];
                        if (!prevCell || prevCell.length === 0) continue;
                        const prevPiece = prevCell[prevCell.length - 1];
                        if (prevPiece.id === currentPiece.id) {
                            foundPrevPos = { r: pr, c: pc };

                            // Check for rotation
                            let hasRotated = false;
                            let prevBaseRotY = 0;
                            let prevValue = '';
                            let currentValue = '';

                            if (currentPiece.kind === 'DJED') {
                                prevValue = prevPiece.mirror || '';
                                currentValue = currentPiece.mirror || '';
                                if (currentPiece.mirror !== prevPiece.mirror) {
                                    hasRotated = true;
                                    prevBaseRotY = prevPiece.mirror === '/' ? 0 : Math.PI / 2;
                                }
                            } else {
                                const currentDir = currentPiece.orientation || currentPiece.facing;
                                const prevDir = prevPiece.orientation || prevPiece.facing;
                                prevValue = prevDir || '';
                                currentValue = currentDir || '';
                                if (currentDir !== prevDir) {
                                    hasRotated = true;
                                    prevBaseRotY = ((kind) => {
                                        switch (kind) {
                                            case 'PYRAMID': return dirToY(prevDir) + (prevDir === 'N' || prevDir === 'S' ? Math.PI / 2 : -Math.PI / 2);
                                            case 'ANUBIS': return dirToY(prevDir);
                                            case 'SPHINX':
                                            case 'LASER': return dirToY(prevDir);
                                            default: return dirToY(prevDir);
                                        }
                                    })(currentPiece.kind)
                                }
                            }

                            if (hasRotated) {
                                // Calculate target rotation from current piece state
                                const targetRotY = ((kind) => {
                                    switch (kind) {
                                        case 'PYRAMID': {
                                            const angle = currentPiece.orientation === 'N' || currentPiece.orientation === 'S' ? Math.PI / 2 : -Math.PI / 2;
                                            return dirToY(currentPiece.orientation) + angle;
                                        }
                                        case 'DJED': return currentPiece.mirror === '/' ? 0 : Math.PI / 2;
                                        case 'ANUBIS': return -dirToY(currentPiece.orientation); // Invert rotation for model
                                        case 'SPHINX': return -dirToY(currentPiece.facing); // Invert rotation for model
                                        case 'LASER': return dirToY(currentPiece.facing);
                                        default: return dirToY(currentPiece.orientation);
                                    }
                                })(currentPiece.kind);
                                if (process.env.NODE_ENV === 'development') {
                                    const sanitizedValues = {
                                        from: String(prevValue || '').replace(/[\r\n\t]/g, '').slice(0, 10),
                                        to: String(currentValue || '').replace(/[\r\n\t]/g, '').slice(0, 10)
                                    };
                                    console.debug('Rotation detected for piece:', sanitizedValues);
                                }
                                animateRotation(currentPiece.id, 90, prevBaseRotY, targetRotY);
                            }
                            break;
                        }
                    }
                    if (foundPrevPos) break;
                }

                // Check for movement
                if (foundPrevPos && (foundPrevPos.r !== r || foundPrevPos.c !== c)) {
                    const prevCellAtTarget = prevState.board[r][c];
                    const prevPieceAtTarget = prevCellAtTarget && prevCellAtTarget.length > 0 ? prevCellAtTarget[prevCellAtTarget.length - 1] : null;
                    const isDjedSwap = currentPiece.kind === 'DJED' && !!prevPieceAtTarget;

                    // Check for obelisk stacking/unstacking (hop animation)
                    const prevStackSize = prevState.board[foundPrevPos.r][foundPrevPos.c]?.length || 0;
                    const currentStackSize = currentCell.length;
                    const isObeliskHop = currentPiece.kind === 'OBELISK' && (
                        (prevPieceAtTarget && prevPieceAtTarget.kind === 'OBELISK') || // stacking onto obelisk
                        (prevStackSize > 1 && currentStackSize === 1) // unstacking from stack to empty space
                    );

                    animateMovement(currentPiece.id, foundPrevPos, { r, c }, isDjedSwap || isObeliskHop);
                    processedPieces.add(currentPiece.id);

                    // Handle the swapped piece
                    if (isDjedSwap && prevPieceAtTarget) {
                        animateMovement(prevPieceAtTarget.id, { r, c }, foundPrevPos, false);
                        processedPieces.add(prevPieceAtTarget.id);
                    }
                }
            }
        }

        prevStateRef.current = state;
    }, [state]);

    const isMyTurn = state && color && state.turn === color && !state.winner;

    const getValidMoves = useCallback((pos: Pos) => {
        if (!state) return [];
        const cell = state.board[pos.r][pos.c];
        if (!cell || cell.length === 0) return [];
        const piece = cell[cell.length - 1];
        if (piece.kind === 'LASER') return [];
        if (piece.kind === 'SPHINX') return []; // SPHINX can't move but can be selected for rotation

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

                    const targetCell = state.board[newR][newC];
                    if (!targetCell || targetCell.length === 0) {
                        moves.push({ r: newR, c: newC, type: 'move' });
                    } else {
                        const targetPiece = targetCell[targetCell.length - 1];
                        if (piece.kind === 'DJED' &&
                            (targetPiece.kind === 'PYRAMID' || targetPiece.kind === 'OBELISK' || targetPiece.kind === 'ANUBIS')) {
                            moves.push({ r: newR, c: newC, type: 'swap' });
                        } else if (piece.kind === 'OBELISK' && targetPiece.kind === 'OBELISK' &&
                            piece.owner === targetPiece.owner && state.config?.rules === 'CLASSIC') {
                            moves.push({ r: newR, c: newC, type: 'stack' });
                        }
                    }
                }
            }
        }
        return moves;
    }, [state]);

    const onSelectPiece = useCallback((pos: Pos) => {
        if (debugMode) {
            console.debug('onSelectPiece called:', {
                pos: { r: Math.floor(pos.r), c: Math.floor(pos.c) },
                isMyTurn: Boolean(isMyTurn),
                color: String(color)
            });
        }
        if (!isMyTurn) {
            if (debugMode) console.log('Not my turn, ignoring selection');
            return;
        }
        const cell = state?.board[pos.r][pos.c];
        if (debugMode) {
            console.debug('Cell at position has pieces:', Boolean(cell && cell.length > 0));
        }
        if (!cell || cell.length === 0 || cell[cell.length - 1].owner !== color) {
            if (debugMode) console.debug('Cell empty or not owned by player');
            return;
        }
        if (debugMode) console.debug('Setting selected to:', { r: Math.floor(pos.r), c: Math.floor(pos.c) });
        setSelected(pos);
        // Reset to default move stack mode when selecting a piece
        setMoveStackMode(true);
    }, [state, color, isMyTurn, debugMode]);

    const onTileClick = useCallback((to: Pos) => {
        if (!isMyTurn || !selected || !state) return;
        const dr = Math.abs(to.r - selected.r);
        const dc = Math.abs(to.c - selected.c);
        if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) {
            setSelected(null);
            return;
        }

        const targetCell = state.board[to.r][to.c];
        const selectedCell = state.board[selected.r][selected.c];
        if (!selectedCell || selectedCell.length === 0) return;
        const selectedPiece = selectedCell[selectedCell.length - 1];
        if (targetCell && targetCell.length > 0) {
            const targetPiece = targetCell[targetCell.length - 1];
            if (selectedPiece.kind === 'DJED' &&
                (targetPiece.kind === 'PYRAMID' || targetPiece.kind === 'OBELISK' || targetPiece.kind === 'ANUBIS')) {
                sendMove({ type: 'MOVE', from: selected, to });
            }
            else if (selectedPiece.kind === 'OBELISK' && targetPiece.kind === 'OBELISK' &&
                selectedPiece.owner === targetPiece.owner && state.config?.rules === 'CLASSIC') {
                const move: any = { type: 'MOVE', from: selected, to };
                if (selectedCell.length > 1) {
                    move.moveStack = moveStackMode;
                }
                sendMove(move);
            }
        } else {
            const move: any = { type: 'MOVE', from: selected, to };
            if (selectedPiece.kind === 'OBELISK' && selectedCell.length > 1 && state.config?.rules === 'CLASSIC') {
                move.moveStack = moveStackMode;
            }
            sendMove(move);
        }
        setSelected(null);
    }, [isMyTurn, selected, state, sendMove, moveStackMode]);

    const onRotateSelected = useCallback((delta: 90 | -90) => {
        if (!isMyTurn || !selected || !state) return;

        const selectedCell = state.board[selected.r][selected.c];
        if (!selectedCell || selectedCell.length === 0) return;
        const selectedPiece = selectedCell[selectedCell.length - 1];

        if (selectedPiece && selectedPiece.kind === 'SPHINX') {
            // For SPHINX, use the calculated rotation delta to next valid direction
            const rotationDelta = getSphinxRotationDelta(selected, selectedPiece.facing || 'N');
            if (rotationDelta) {
                sendMove({ type: 'ROTATE', from: selected, rotation: rotationDelta });
            }
        } else {
            sendMove({ type: 'ROTATE', from: selected, rotation: delta });
        }
        setSelected(null);
    }, [isMyTurn, selected, sendMove, state]);

    const resetCamera = useCallback(() => {
        if (controlsRef.current) {
            const defaultPosition = color === 'RED' ? [0, 8, -10] : [0, 8, 10];
            controlsRef.current.object.position.set(...defaultPosition);
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }
    }, [color]);

    if (!state) return <div>Waiting for state…</div>;

    preloadModels();

    return (
        <div className="border rounded" style={{ height: 600, overflow: 'hidden', position: 'relative' }}>
            {/* HUD for rotate */}
            <div className="d-flex align-items-center p-2 bg-light border-bottom" style={{ position: 'relative', zIndex: 10 }}>
                <div className="flex-grow-1">
                    <strong>Turn:</strong> <span className="text-primary">{state.turn}</span> {isMyTurn && <span className="badge bg-success ms-1">Your move</span>}
                    {selected && <span className="ms-3 text-muted">Selected: {selected.r},{selected.c}</span>}
                    {debugMode && <span className="ms-3 small text-secondary">Debug: selected={selected ? 'yes' : 'no'}, isMyTurn={isMyTurn ? 'yes' : 'no'}, FPS: {fps}</span>}
                </div>
                <div className="btn-group">
                    {(() => {
                        const selectedCell = selected && state ? state.board[selected.r][selected.c] : null;
                        const selectedPiece = selectedCell && selectedCell.length > 0 ? selectedCell[selectedCell.length - 1] : null;

                        if (selectedPiece && selectedPiece.kind === 'SPHINX') {
                            const nextDir = getNextValidSphinxDirection(selected!, selectedPiece.facing || 'N');
                            return nextDir ? (
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled={!isMyTurn || !selected}
                                    onClick={() => onRotateSelected(90)}
                                    title={`Rotate to ${nextDir}`}
                                >
                                    Rotate to {nextDir} ⟳
                                </button>
                            ) : (
                                <button className="btn btn-outline-secondary btn-sm" disabled>
                                    Cannot rotate
                                </button>
                            );
                        } else if (selectedPiece && (selectedPiece.kind === 'PYRAMID' || selectedPiece.kind === 'DJED' || selectedPiece.kind === 'ANUBIS')) {
                            return (
                                <>
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
                                </>
                            );
                        }
                        return null;
                    })()}
                    <button className="btn btn-outline-info btn-sm" onClick={resetCamera} title="Reset camera to default position">
                        📷
                    </button>
                </div>
                {/* Obelisk stack controls */}
                {selected && state && state.board[selected.r][selected.c] &&
                    state.board[selected.r][selected.c]!.length > 0 &&
                    state.board[selected.r][selected.c]![state.board[selected.r][selected.c]!.length - 1].kind === 'OBELISK' &&
                    state.board[selected.r][selected.c]!.length > 1 &&
                    state.config?.rules === 'CLASSIC' && (
                        <div className="ms-2">
                            <small className="text-muted">Stack ({state.board[selected.r][selected.c]!.length}): </small>
                            <div className="btn-group btn-group-sm">
                                <button
                                    className={`btn btn-sm ${moveStackMode ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setMoveStackMode(true)}>Move Stack</button>
                                <button
                                    className={`btn btn-sm ${!moveStackMode ? 'btn-warning' : 'btn-outline-warning'}`}
                                    onClick={() => setMoveStackMode(false)}
                                    title="Move only the top obelisk">Move Top</button>
                            </div>
                        </div>
                    )}
            </div>

            <Canvas
                shadows
                camera={{ position: color === 'RED' ? [0, 8, -10] : [0, 8, 10], fov: 45, near: 0.1, far: 100 }}
                style={{ background: '#000000', height: 'calc(100% - 50px)' }}
            >
                {environmentPreset === 'basic' ? (
                    <SceneLights isClassic={state.config?.rules === 'CLASSIC'} />
                ) : (
                    <EnvironmentErrorBoundary fallback={<SceneLights isClassic={state.config?.rules === 'CLASSIC'} />}>
                        <Environment preset={environmentPreset as any} background={true} />
                    </EnvironmentErrorBoundary>
                )}

                {/* Cube camera for reflections */}
                <CubeCamera position={[0, 2, 0]} onUpdate={setEnvMap} quality={cubeMapQuality} />

                {/* Large ground disc with dirt texture */}
                <GroundMesh />

                {/* Board shadow catcher */}
                <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} receiveShadow>
                    <planeGeometry args={[BOARD_W + 2, BOARD_H + 2]} />
                    <shadowMaterial opacity={0.25} />
                </mesh>

                {/* Board plane (tiles) */}
                <Tiles state={state} onTileClick={onTileClick} selected={selected} getValidMoves={getValidMoves} />

                {/* Grid lines */}
                <group>
                    {/* Row lines */}
                    {Array.from({ length: 9 }, (_, i) => (
                        <mesh key={`row-${i}`} position={[0, 0.0, ORIGIN_Z + i * TILE_SIZE - TILE_SIZE / 2]}>
                            <boxGeometry args={[BOARD_W, 0.32, 0.02]} />
                            <meshBasicMaterial color="#000000" />
                        </mesh>
                    ))}
                    {/* Column lines */}
                    {Array.from({ length: 11 }, (_, i) => (
                        <mesh key={`col-${i}`} position={[ORIGIN_X + i * TILE_SIZE - TILE_SIZE / 2, 0.0, 0]}>
                            <boxGeometry args={[0.02, 0.32, BOARD_H]} />
                            <meshBasicMaterial color="#000000" />
                        </mesh>
                    ))}
                </group>

                {/* Pieces */}
                <group>
                    {state.board.map((row, r) =>
                        row.map((cell, c) =>
                            cell && cell.length > 0 ? (
                                <Piece3D
                                    key={`${r}-${c}-${cell[0]?.id || ''}`}
                                    r={r}
                                    c={c}
                                    cell={cell}
                                    selected={selected?.r === r && selected?.c === c}
                                    onSelect={onSelectPiece}
                                    debugMode={debugMode}
                                    rotatingPieces={rotatingPieces}
                                    movingPieces={movingPieces}
                                    setRotatingPieces={setRotatingPieces}
                                    setMovingPieces={setMovingPieces}
                                    moveStackMode={moveStackMode}
                                    setMoveStackMode={setMoveStackMode}
                                    isClassic={state.config?.rules === 'CLASSIC'}
                                    envMap={envMap}
                                />
                            ) : null
                        )
                    )}
                </group>

                {/* Laser path visualisation */}
                <LaserPath3D path={state.lastLaserPath} state={state} />

                {/* Explosion effects */}
                <Explosion3D explosions={explosions} setExplosions={setExplosions} />

                {/* Off-board laser cylinders for Classic rules */}
                {state.config?.rules === 'CLASSIC' && (
                    <>
                        {/* RED laser cylinder off-board */}
                        <mesh position={[gridToWorld(0, 0).x, 0.2, gridToWorld(0, 0).z - 0.7]}>
                            <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
                            <meshBasicMaterial color={COLORS.RED} />
                        </mesh>
                        {/* SILVER laser cylinder off-board */}
                        <mesh position={[gridToWorld(7, 9).x, 0.2, gridToWorld(7, 9).z + 0.7]}>
                            <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
                            <meshBasicMaterial color={COLORS.SILVER} />
                        </mesh>
                    </>
                )}

                {/* Rotate gizmo for selected piece */}
                {selected && isMyTurn && (() => {
                    const selectedCell = state.board[selected.r][selected.c];
                    const selectedPiece = selectedCell && selectedCell.length > 0 ?
                        selectedCell[selectedCell.length - 1] : null;

                    if (selectedPiece && selectedPiece.kind === 'SPHINX') {
                        const nextDir = getNextValidSphinxDirection(selected, selectedPiece.facing || 'N');
                        return nextDir ? (
                            <SphinxRotateGizmo
                                position={[
                                    gridToWorld(selected.r, selected.c).x,
                                    0,
                                    gridToWorld(selected.r, selected.c).z
                                ]}
                                onRotate={() => onRotateSelected(90)}
                                nextDirection={nextDir}
                            />
                        ) : null;
                    } else if (selectedPiece && (selectedPiece.kind === 'PYRAMID' || selectedPiece.kind === 'DJED' || selectedPiece.kind === 'ANUBIS')) {
                        return (
                            <RotateGizmo
                                position={[
                                    gridToWorld(selected.r, selected.c).x,
                                    0,
                                    gridToWorld(selected.r, selected.c).z
                                ]}
                                onRotate={onRotateSelected}
                            />
                        );
                    }
                    return null;
                })()}

                <OrbitControls
                    ref={controlsRef}
                    enablePan
                    enableRotate
                    enableZoom
                    minDistance={5}
                    maxDistance={30}
                    maxPolarAngle={Math.PI / 2}
                    target={[0, 0, 0]}
                />
            </Canvas>
        </div>
    );
}
