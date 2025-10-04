import React from 'react';
import { useAuth } from '../state/auth';

export function Stats() {
  const { user, stats } = useAuth();

  if (!user) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          Please log in to view your statistics.
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h4 className="mb-0">Player Statistics</h4>
              <small className="text-muted">{user.username}</small>
            </div>
            <div className="card-body">
              {stats ? (
                <div className="row text-center">
                  <div className="col-3">
                    <h5 className="text-primary">{stats.gamesPlayed}</h5>
                    <small>Games Played</small>
                  </div>
                  <div className="col-3">
                    <h5 className="text-success">{stats.wins}</h5>
                    <small>Wins</small>
                  </div>
                  <div className="col-3">
                    <h5 className="text-danger">{stats.losses}</h5>
                    <small>Losses</small>
                  </div>
                  <div className="col-3">
                    <h5 className="text-info">{(stats.winRate * 100).toFixed(1)}%</h5>
                    <small>Win Rate</small>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading statistics...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}