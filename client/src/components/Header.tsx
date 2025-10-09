import React, { useState } from 'react';
import { AuthButton } from './AuthButton';
import styles from './Header.module.css';
import { PageType } from '../types/navigation';

/**
 * Props for the Header component
 */
interface HeaderProps {
  /** Main title displayed in the header */
  title?: string;
  /** Subtitle displayed below the title */
  subtitle?: string;
  /** Whether the user is currently in a game */
  inGame?: boolean;
  /** Callback to save the current game */
  onSaveGame?: () => void;
  /** Callback to load a saved game */
  onLoadGame?: () => void;
  /** Callback to start a new game */
  onNewGame?: () => void;
  /** Callback to leave the current game */
  onLeaveGame?: () => void;
  /** Whether 3D rendering is enabled */
  useThree?: boolean;
  /** Callback when 3D toggle is changed */
  onToggleThree?: (checked: boolean) => void;
  /** Whether the app is transitioning between 2D/3D modes */
  isTransitioning?: boolean;
  /** Current environment preset name */
  environmentPreset?: string;
  /** Callback when environment preset is changed */
  onEnvironmentChange?: (preset: string) => void;
  /** Current cube map quality setting */
  cubeMapQuality?: 'off' | 'low' | 'medium' | 'high' | 'ultra';
  /** Callback when cube map quality is changed */
  onCubeMapQualityChange?: (quality: 'off' | 'low' | 'medium' | 'high' | 'ultra') => void;
  /** Current active page */
  currentPage?: PageType;
  /** Callback to navigate to a different page */
  onNavigate?: (page: PageType) => void;
}

/**
 * Header component with navigation, game controls, and settings
 * 
 * Provides the main application header with:
 * - Logo and title display
 * - Game control buttons (save, load, new game, leave)
 * - Settings sidebar with 3D toggle and environment options
 * - Account menu with navigation and authentication
 * 
 * @param props - Header component props
 * @returns JSX element representing the header
 */
export function Header({
  title = "OpenSphinx",
  subtitle = "Open Source Laser Chess",
  inGame = false,
  onSaveGame,
  onLoadGame,
  onNewGame,
  onLeaveGame,
  useThree = true,
  onToggleThree,
  isTransitioning = false,
  environmentPreset = 'park',
  onEnvironmentChange,
  cubeMapQuality = 'low',
  onCubeMapQualityChange,
  currentPage = 'home',
  onNavigate
}: HeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <>

      <div className="mb-3 bg-dark text-light py-3 mt-auto d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <img src="logo.svg" className={`me-3 ms-3 ${styles.logo}`} title="OpenSphinx logo" alt="Sphinx coloured yellow, blue and red"></img>
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
      <div className={`position-fixed top-0 end-0 h-100 bg-dark text-light p-3 ${sidebarOpen ? 'd-block' : 'd-none'}`} style={{ width: '300px', zIndex: 1050 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>Options</h5>
          <button className="btn btn-outline-light btn-sm" onClick={() => setSidebarOpen(false)}>×</button>
        </div>

        <div className="d-grid gap-2">
          <button className="btn btn-outline-light" onClick={() => onNavigate?.('home')}>Home</button>
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

          <hr className="my-3" />

          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={useThree}
              onChange={e => onToggleThree?.(e.target.checked)}
              id="use3d-sidebar"
              disabled={isTransitioning}
            />
            <label className="form-check-label" htmlFor="use3d-sidebar">
              Use 3D {isTransitioning && '(switching...)'}
            </label>
          </div>

          <div className="mb-2">
            <label htmlFor="environment-select" className="form-label small">Environment</label>
            <select
              className="form-select form-select-sm"
              id="environment-select"
              value={environmentPreset}
              onChange={e => onEnvironmentChange?.(e.target.value)}
            >
              <option value="basic">Basic</option>
              <option value="park">Park</option>
              <option value="sunset">Sunset</option>
              <option value="dawn">Dawn</option>
              <option value="night">Night</option>
              <option value="warehouse">Warehouse</option>
              <option value="forest">Forest</option>
              <option value="apartment">Apartment</option>
              <option value="studio">Studio</option>
              <option value="city">City</option>
              <option value="lobby">Lobby</option>
            </select>
          </div>

          <div className="mb-2">
            <label htmlFor="cubemap-quality-select" className="form-label small">Mirror Quality</label>
            <select
              className="form-select form-select-sm"
              id="cubemap-quality-select"
              value={cubeMapQuality}
              onChange={e => onCubeMapQualityChange?.(e.target.value as 'off' | 'low' | 'medium' | 'high' | 'ultra')}
            >
              <option value="off">Off</option>
              <option value="low">Low (256px)</option>
              <option value="medium">Medium (512px)</option>
              <option value="high">High (1024px)</option>
              <option value="ultra">Ultra (2048px)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Account Menu */}
      <div className={`position-fixed top-0 end-0 bg-dark text-light p-3 ${accountOpen ? 'd-block' : 'd-none'}`} style={{ width: '250px', zIndex: 1050, marginTop: '80px' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>Account</h5>
          <button className="btn btn-outline-light btn-sm" onClick={() => setAccountOpen(false)}>×</button>
        </div>

        <div className="d-grid gap-2">
          <button
            className={`btn ${currentPage === 'home' ? 'btn-primary' : 'btn-outline-light'}`}
            onClick={() => { onNavigate?.('home'); setAccountOpen(false); }}
          >
            Home
          </button>
          <button
            className={`btn ${currentPage === 'stats' ? 'btn-primary' : 'btn-outline-light'}`}
            onClick={() => { onNavigate?.('stats'); setAccountOpen(false); }}
          >
            Stats
          </button>
          <hr className="my-2" />
          <AuthButton />
        </div>
      </div>

      {/* Backdrop */}
      {(sidebarOpen || accountOpen) && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1040 }}
          onClick={() => { setSidebarOpen(false); setAccountOpen(false); }}
        ></div>
      )}
    </>
  );
}