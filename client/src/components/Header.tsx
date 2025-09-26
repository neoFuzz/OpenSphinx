import React, { useState } from 'react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  inGame?: boolean;
  onSaveGame?: () => void;
  onLoadGame?: () => void;
  onNewGame?: () => void;
  onLeaveGame?: () => void;
}

export function Header({ 
  title = "OpenSphinx", 
  subtitle = "Open Source Laser Chess",
  inGame = false,
  onSaveGame,
  onLoadGame,
  onNewGame,
  onLeaveGame
}: HeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <>
      <div className="mb-3 bg-dark text-light py-3 mt-auto d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <img src="logo.svg" width="64" className="me-3 ms-3"></img>
          <div>
            <h1 className="mb-0">{title}</h1>
            {subtitle && <small className="text-secondary">{subtitle}</small>}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-light" 
            onClick={() => setAccountOpen(!accountOpen)}
          >
            &#128100;
          </button>
          <button 
            className="btn btn-outline-light me-3" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            &#9776;
          </button>
        </div>
      </div>
      
      {/* Sidebar */}
      <div className={`position-fixed top-0 end-0 h-100 bg-dark text-light p-3 ${sidebarOpen ? 'd-block' : 'd-none'}`} style={{width: '300px', zIndex: 1050}}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>Options</h5>
          <button className="btn btn-outline-light btn-sm" onClick={() => setSidebarOpen(false)}>×</button>
        </div>
        
        <div className="d-grid gap-2">
          {inGame ? (
            <>
              <button className="btn btn-primary" onClick={onSaveGame}>Save Game</button>
              <button className="btn btn-secondary" onClick={onLoadGame}>Load Game</button>
              <button className="btn btn-warning" onClick={onNewGame}>New Game</button>
              <button className="btn btn-danger" onClick={onLeaveGame}>Leave Game</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={onNewGame}>New Game</button>
              <button className="btn btn-secondary" onClick={onLoadGame}>Load Game</button>
            </>
          )}
        </div>
      </div>
      
      {/* Account Menu */}
      <div className={`position-fixed top-0 end-0 bg-dark text-light p-3 ${accountOpen ? 'd-block' : 'd-none'}`} style={{width: '250px', zIndex: 1050, marginTop: '80px'}}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>Account</h5>
          <button className="btn btn-outline-light btn-sm" onClick={() => setAccountOpen(false)}>×</button>
        </div>
        
        <div className="d-grid gap-2">
          <button className="btn btn-outline-light">Sign In</button>
          <button className="btn btn-outline-light">Register</button>
          <hr className="text-secondary" />
          <button className="btn btn-outline-secondary">Guest Mode</button>
        </div>
      </div>
      
      {/* Backdrop */}
      {(sidebarOpen || accountOpen) && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
          style={{zIndex: 1040}}
          onClick={() => {setSidebarOpen(false); setAccountOpen(false);}}
        ></div>
      )}
    </>
  );
}