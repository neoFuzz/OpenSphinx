/**
 * SSE (Server-Sent Events) client utilities for real-time game communication.
 *
 * Replaces the previous Socket.IO singleton. Server-to-client messages arrive
 * over an EventSource stream; client-to-server actions use plain HTTP POST.
 *
 * @module sse
 */

import { SERVER_URL } from './config/server';

/** The active EventSource connection, or null when not connected to a room. */
let eventSource: EventSource | null = null;

/**
 * Stable client identifier for the lifetime of the browser tab.
 * Generated once and reused across reconnects so the server can
 * associate an SSE stream with the correct player slot.
 */
let currentClientId: string | null = null;

/**
 * Returns the stable client ID for this tab, generating one on first call.
 *
 * @returns A UUID string that persists across SSE reconnects.
 */
export function getClientId(): string {
  if (!currentClientId) {
    currentClientId = crypto.randomUUID();
  }
  return currentClientId;
}

/**
 * Opens an SSE stream for the given room and returns the EventSource.
 * Closes any previously open stream first.
 *
 * @param roomId - The room to subscribe to.
 * @returns The newly opened EventSource instance.
 */
export function connectToRoom(roomId: string): EventSource {
  eventSource?.close();
  const clientId = getClientId();
  const url = `${SERVER_URL}/api/rooms/${roomId}/events?clientId=${clientId}`;
  eventSource = new EventSource(url, { withCredentials: true });
  return eventSource;
}

/**
 * Closes the active SSE stream, if any.
 */
export function disconnectFromRoom(): void {
  eventSource?.close();
  eventSource = null;
}

/**
 * Sends a POST action to a room endpoint with CSRF protection.
 *
 * @param roomId - The target room.
 * @param action - The endpoint suffix (`join`, `move`, `save`, `leave`).
 * @param payload - Additional body fields merged with `clientId`.
 * @param csrfToken - The double-submit CSRF token from `/api/csrf-token`.
 * @returns The parsed JSON response from the server.
 */
export async function postToRoom(
  roomId: string,
  action: 'join' | 'move' | 'save' | 'leave',
  payload: Record<string, unknown>,
  csrfToken: string
): Promise<unknown> {
  const response = await fetch(`${SERVER_URL}/api/rooms/${roomId}/${action}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ ...payload, clientId: getClientId() }),
  });
  return response.json();
}
