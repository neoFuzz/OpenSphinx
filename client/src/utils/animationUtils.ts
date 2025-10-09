import React, { useCallback, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Pos } from '../../../shared/src/types';
import { playExplosionSound } from './explosionEffect';
import * as THREE from 'three';

/**
 * Animation state for piece rotation
 */
export interface RotationAnimation {
    /** Timestamp when the rotation animation started */
    startTime: number;
    /** Direction of rotation (1 for clockwise, -1 for counterclockwise) */
    direction: number;
    /** Initial rotation angle in radians */
    startRotation: number;
    /** Target rotation angle in radians */
    targetRotation: number;
}

/**
 * Animation state for piece movement
 */
export interface MovementAnimation {
    /** Timestamp when the movement animation started */
    startTime: number;
    /** Starting grid position */
    from: Pos;
    /** Target grid position */
    to: Pos;
    /** Whether this is a Djed piece hopping animation */
    isDjedHop: boolean;
}

/**
 * Animation state for explosion effects
 */
export interface ExplosionAnimation {
    /** Timestamp when the explosion animation started */
    startTime: number;
    /** Grid position where the explosion occurs */
    pos: Pos;
}

/**
 * Hook for managing piece movement animations
 * 
 * @returns Object containing movement state and animation trigger function
 */
export function useMovementAnimation() {
    const [movingPieces, setMovingPieces] = useState<Map<string, MovementAnimation>>(new Map());

    const animateMovement = useCallback((pieceId: string, from: Pos, to: Pos, isDjedHop: boolean) => {
        const startTime = performance.now();
        setMovingPieces(prev => new Map(prev).set(pieceId, { startTime, from, to, isDjedHop }));
    }, []);

    return { movingPieces, setMovingPieces, animateMovement };
}

/**
 * Hook for managing piece rotation animations
 * 
 * @returns Object containing rotation state and animation trigger function
 */
export function useRotationAnimation() {
    const [rotatingPieces, setRotatingPieces] = useState<Map<string, RotationAnimation>>(new Map());

    const animateRotation = useCallback((pieceId: string, direction: number, startRotation: number, targetRotation: number) => {
        if (process.env.NODE_ENV === 'development') {
            const rotationData = {
                direction: Number(direction) || 0,
                startRotation: Number(startRotation.toFixed(3)) || 0,
                targetRotation: Number(targetRotation.toFixed(3)) || 0
            };
            console.debug('animateRotation called:', rotationData);
        }
        const startTime = performance.now();
        setRotatingPieces(prev => new Map(prev).set(pieceId, { startTime, direction, startRotation, targetRotation }));
    }, []);

    return { rotatingPieces, setRotatingPieces, animateRotation };
}

/**
 * Hook for managing explosion animations
 * 
 * @returns Object containing explosion state and trigger function
 */
export function useExplosionAnimation() {
    const [explosions, setExplosions] = useState<Map<string, ExplosionAnimation>>(new Map());

    const triggerExplosion = useCallback((pos: Pos) => {
        const explosionId = `explosion-${pos.r}-${pos.c}-${Date.now()}`;
        setExplosions(prev => new Map(prev).set(explosionId, {
            startTime: performance.now(),
            pos
        }));
        playExplosionSound();
    }, []);

    return { explosions, setExplosions, triggerExplosion };
}

/**
 * Hook for managing individual piece animations with frame updates
 * 
 * Handles smooth interpolation of rotation and movement animations
 * using Three.js useFrame for 60fps updates.
 * 
 * @param pieceId - Unique identifier for the piece
 * @param currentBaseRotY - Base rotation angle when not animating
 * @param gridPosition - Current grid position as world coordinates
 * @param rotatingPieces - Map of active rotation animations
 * @param movingPieces - Map of active movement animations
 * @param setRotatingPieces - State setter for rotation animations
 * @param setMovingPieces - State setter for movement animations
 * @returns Object containing animated rotation, position, and height values
 */
export function usePieceAnimation(
    pieceId: string,
    currentBaseRotY: number,
    gridPosition: THREE.Vector3,
    rotatingPieces: Map<string, RotationAnimation>,
    movingPieces: Map<string, MovementAnimation>,
    setRotatingPieces: React.Dispatch<React.SetStateAction<Map<string, RotationAnimation>>>,
    setMovingPieces: React.Dispatch<React.SetStateAction<Map<string, MovementAnimation>>>
) {
    const [animatedRotY, setAnimatedRotY] = useState(currentBaseRotY);
    const [animationPos, setAnimationPos] = useState(gridPosition);
    const [animationY, setAnimationY] = useState(0.2);

    // Update animated rotation when piece state changes (but not during animation)
    React.useEffect(() => {
        if (!rotatingPieces.has(pieceId)) {
            setAnimatedRotY(currentBaseRotY);
        }
    }, [currentBaseRotY, pieceId]);

    // Smooth animation updates
    useFrame(() => {
        const now = performance.now();

        // Handle rotation animation
        const rotationData = rotatingPieces.get(pieceId);
        if (rotationData) {
            const elapsed = now - rotationData.startTime;
            const progress = Math.min(elapsed / 300, 1);

            if (progress >= 1) {
                setAnimatedRotY(rotationData.targetRotation);
                setRotatingPieces(prev => {
                    const next = new Map(prev);
                    next.delete(pieceId);
                    return next;
                });
            } else {
                const eased = 1 - Math.pow(1 - progress, 3);
                const startRot = rotationData.startRotation;
                const targetRot = rotationData.targetRotation;

                let diff = targetRot - startRot;
                // Normalize angle difference to take shortest path
                while (diff > Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;

                const newRotY = startRot + diff * eased;
                setAnimatedRotY(newRotY);

                if (process.env.NODE_ENV === 'development') {
                    const sanitizedRotationValues = {
                        progress: Number(progress.toFixed(2)) || 0,
                        from: Number(startRot.toFixed(2)) || 0,
                        to: Number(targetRot.toFixed(2)) || 0,
                        current: Number(newRotY.toFixed(2)) || 0
                    };
                    console.debug('Animating rotation:', sanitizedRotationValues);
                }
            }
        }

        // Handle movement animation
        const moveData = movingPieces.get(pieceId);
        if (moveData) {
            const elapsed = now - moveData.startTime;
            const progress = Math.min(elapsed / 400, 1);

            if (progress >= 1) {
                setMovingPieces(prev => {
                    const next = new Map(prev);
                    next.delete(pieceId);
                    return next;
                });
                setAnimationPos(gridPosition);
                setAnimationY(0.2);
            } else {
                const eased = 1 - Math.pow(1 - progress, 3);
                const fromPos = gridToWorld(moveData.from.r, moveData.from.c);
                const toPos = gridToWorld(moveData.to.r, moveData.to.c);

                setAnimationPos(new THREE.Vector3(
                    fromPos.x + (toPos.x - fromPos.x) * eased,
                    0,
                    fromPos.z + (toPos.z - fromPos.z) * eased
                ));

                if (moveData.isDjedHop) {
                    setAnimationY(0.2 + Math.sin(progress * Math.PI) * 0.8);
                } else {
                    setAnimationY(0.2);
                }
            }
        } else {
            setAnimationPos(gridPosition);
            setAnimationY(0.2);
        }
    });

    return { animatedRotY, animationPos, animationY };
}

/**
 * Converts grid coordinates to Three.js world coordinates
 * 
 * @param r - Grid row (0-7)
 * @param c - Grid column (0-9)
 * @returns Three.js Vector3 representing world position
 */
function gridToWorld(r: number, c: number) {
    const TILE_SIZE = 1;
    const BOARD_W = 10 * TILE_SIZE;
    const BOARD_H = 8 * TILE_SIZE;
    const ORIGIN_X = -BOARD_W / 2 + TILE_SIZE / 2;
    const ORIGIN_Z = -BOARD_H / 2 + TILE_SIZE / 2;

    return new THREE.Vector3(
        ORIGIN_X + c * TILE_SIZE,
        0,
        ORIGIN_Z + r * TILE_SIZE
    );
}