import React from 'react';

/**
 * Rules component that displays the game rules for Khet/Laser Chess
 * 
 * Renders a card containing:
 * - Game objective
 * - Initial setup instructions
 * - Turn structure
 * - Description of game pieces and their behaviors
 * - Laser mechanics
 * - Win conditions
 * 
 * @returns {JSX.Element} A Bootstrap-styled card containing game rules
 */
export function Rules() {
  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h4 className="mb-0">Game Rules</h4>
            </div>
            <div className="card-body">
              <h5>Objective</h5>
              <p>Eliminate your opponent's Pharaoh by hitting it with a laser beam.</p>

              <h5>Setup</h5>
              <p>Each player starts with pieces on placed on the 8x10 board. The active player's laser is located at the right corner of their side.</p>

              <h5>Turn Structure</h5>
              <ol>
                <li><strong>Move or Rotate:</strong> Move one piece in any direction (up/down/left/right/diagonally) to an adjacent empty square, OR rotate a piece 90° clockwise or counterclockwise</li>
                <li><strong>Fire Laser:</strong> The laser automatically fires after you make your move</li>
              </ol>

              <h5>Pieces</h5>
              <ul>
                <li><strong>Pharaoh:</strong> The king piece - if hit by laser, you lose!</li>
                <li><strong>Pyramid:</strong> Reflects laser at 90° angle based on its orientation. It is destroyed if hit on a non-mirrored surface</li>
                <li><strong>Djed:</strong> Reflects laser 90° on both sides and can not be destroyed. Can swap positions with Pyramid pieces</li>
                <li><strong>Anubis:</strong> Blocks laser completely on the front but is destroyed when hit on any other side <i>(2.0 Rules)</i></li>
                <li><strong>Obelisk:</strong> Blocks laser completely but is destroyed when hit. Starts in stacks of two, which can move together or be split <i>(Classic Rules)</i></li>
              </ul>

              <h5>Laser Rules</h5>
              <ul>
                <li>Laser travels in straight lines until it hits a piece or board edge</li>
                <li>Pyramids reflect the laser at 90° angles</li>
                <li>Anubis, Obelisks and Pharaohs stop the laser</li>
                <li>If laser hits a piece, that piece is destroyed (except Djed or Anubis' front)</li>
              </ul>

              <h5>Winning</h5>
              <p>The game ends when a laser beam hits and destroys the opponent's Pharaoh.</p>

              <h5>Strategy Tips</h5>
              <ul>
                <li><strong>Protect Your Pharaoh:</strong> Always keep your Pharaoh shielded from potential laser paths</li>
                <li><strong>Control the Center:</strong> Positioning pieces in the center gives you more tactical options</li>
                <li><strong>Plan Ahead:</strong> Think about where the laser will travel after your move</li>
                <li><strong>Use Pyramids Wisely:</strong> Pyramids can create complex laser paths to surprise your opponent</li>
                <li><strong>Defensive Play:</strong> Sometimes the best move is strengthening your defense rather than attacking</li>
              </ul>

              <h5>Game Variants</h5>
              <p><strong>Classic Rules:</strong> Features Obelisk pieces that can stack and move together. Obelisks block lasers but are destroyed when hit.</p>
              <p><strong>Khet 2.0 Rules:</strong> Introduces Anubis pieces that have a protected front face. The Anubis blocks lasers from the front without being destroyed, but is vulnerable from other angles.</p>

              <h5>History of Laser Chess</h5>
              <p>Laser chess, commercially known as Khet, was invented by Luke Hooper and Michael Larson. The game combines elements of chess with laser beam mechanics, creating a unique strategic experience. OpenSphinx brings this engaging board game to the web with modern 3D graphics and online multiplayer capabilities.</p>

              <h5>Getting Started</h5>
              <p>Ready to play? Create a new game room or join an existing one from the home page. You can play against friends by sharing your room code, or browse available games to join. Save your games at any point and resume them later!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}