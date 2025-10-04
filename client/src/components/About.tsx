import React from 'react';

export function About() {
  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h4 className="mb-0">About OpenSphinx</h4>
            </div>
            <div className="card-body">
              <h5>What is OpenSphinx?</h5>
              <p>OpenSphinx is an open-source implementation of laser chess (also known as Khet), a strategic board game that combines traditional chess-like movement with laser beam mechanics.</p>

              <h5>Features</h5>
              <ul>
                <li>3D graphics powered by Three.js</li>
                <li>Real-time multiplayer gameplay</li>
                <li>Game save and load functionality</li>
                <li>Discord authentication</li>
                <li>Multiple game variants and setups</li>
                <li>Spectator mode</li>
              </ul>

              <h5>Technology Stack</h5>
              <ul>
                <li><strong>Frontend:</strong> React, TypeScript, Three.js, Bootstrap</li>
                <li><strong>Backend:</strong> Node.js, Express, Socket.IO</li>
                <li><strong>Database:</strong> SQLite</li>
                <li><strong>Authentication:</strong> Discord OAuth</li>
              </ul>

              <h5>Open Source</h5>
              <p>OpenSphinx is completely open source and available on <a href="https://github.com/neofuzz/OpenSphinx" target="_blank" rel="noopener noreferrer">GitHub</a>. Contributions, bug reports, and feature requests are welcome!</p>

              <h5>License</h5>
              <p>This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0), ensuring it remains free and open source.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}