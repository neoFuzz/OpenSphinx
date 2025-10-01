import React, { useState } from 'react';
import { useAuth } from '../state/auth';

export function AuthButton() {
  const { user, loading, login, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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