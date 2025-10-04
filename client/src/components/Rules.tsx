import React from 'react';

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}