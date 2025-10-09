import React, { useState } from 'react';
import { useAuth } from '../state/auth';

/**
 * Authentication button component that handles user login/logout state.
 * 
 * Displays different UI based on authentication state:
 * - Loading spinner during auth operations
 * - User info with logout button when authenticated
 * - Discord login button when not authenticated
 * 
 * @returns {JSX.Element} Conditional UI based on auth state
 */
export function AuthButton() {
  const { user, loading, login, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false); // Currently unused but reserved for future dropdown functionality

  if (loading) {
    return (
      <div className="spinner-border spinner-border-sm" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="d-flex flex-column w-100">
        <div className="d-flex align-items-center text-light">
          {user.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt="Avatar"
              className="rounded-circle me-2"
              width="24"
              height="24"
            />
          )}
          {user.username}
        </div>
        <div className="d-flex justify-content-end">
          <button className="btn btn-outline-light btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <button className="btn btn-outline-light" onClick={login}>
      Login with Discord
    </button>
  );
}