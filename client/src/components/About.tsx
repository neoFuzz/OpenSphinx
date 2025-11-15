import React from 'react';

/**
 * 'About' component that displays information about the OpenSphinx project.
 * 
 * This component renders a static informational page containing:
 * - Project description and overview
 * - Feature list highlighting key capabilities
 * - Technology stack details
 * - Open source information and licensing
 * 
 * The component uses Bootstrap classes for responsive layout and styling.
 * 
 * @returns {JSX.Element} A card-based layout with project information
 */
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

              <h5>Why OpenSphinx?</h5>
              <p>We created OpenSphinx to make laser chess accessible to everyone. Traditional physical versions of the game can be expensive and hard to find. Our web-based implementation allows players worldwide to enjoy this strategic game for free, with the added benefits of online multiplayer and 3D visualization.</p>

              <h5>Development</h5>
              <p>OpenSphinx is built using modern web technologies including React 19 for the user interface, Three.js for 3D graphics rendering, and Socket.IO for real-time multiplayer communication. The game engine is shared between client and server to ensure fair play and consistent game logic.</p>

              <h5>Community</h5>
              <p>Join our community on <a href="https://discord.gg/8eYTA7gkQV" target="_blank" rel="noopener noreferrer">Discord</a> to discuss strategies, report bugs, suggest features, or contribute to development. We welcome players of all skill levels!</p>

              <h5>Future Plans</h5>
              <ul>
                <li>Tournament system with rankings and leaderboards</li>
                <li>AI opponents for single-player practice</li>
                <li>Custom board setups and game variants</li>
                <li>Mobile app improvements and optimization</li>
                <li>Replay analysis tools and move suggestions</li>
              </ul>

              <h5>Credits</h5>
              <p>OpenSphinx is developed and maintained by the open source community. Special thanks to all contributors who have helped improve the game through code, bug reports, and feedback.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}