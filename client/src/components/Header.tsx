import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthButton } from './AuthButton';
import LanguageSwitcher from './LanguageSwitcher';
import { useGame } from '../state/game';
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
  /** Whether to show explosion particles */
  showParticles?: boolean;
  /** Callback when particle toggle is changed */
  onToggleParticles?: (checked: boolean) => void;
  /** Whether to enable true reflections (update every frame) */
  trueReflections?: boolean;
  /** Callback when true reflections toggle is changed */
  onToggleTrueReflections?: (checked: boolean) => void;
  /** Current active page */
  currentPage?: PageType;
  /** Callback to navigate to a different page */
  onNavigate?: (page: PageType) => void;
  /** Callback to show join room form */
  onJoinRoom?: () => void;
  /** Callback to show browse rooms */
  onBrowseRooms?: () => void;
  /** Current player name */
  playerName?: string;
  /** Callback when player name changes */
  onPlayerNameChange?: (name: string) => void;
  /** Whether user is logged in */
  isLoggedIn?: boolean;
  /** Whether header is minimized */
  minimized?: boolean;
  /** Callback to toggle minimized state */
  onToggleMinimized?: () => void;
  /** Current game state */
  gameState?: any;
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
  title,
  subtitle,
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
  showParticles = false,
  onToggleParticles,
  trueReflections = false,
  onToggleTrueReflections,
  currentPage = 'home',
  onNavigate,
  onJoinRoom,
  onBrowseRooms,
  playerName = 'Player',
  onPlayerNameChange,
  isLoggedIn = false,
  minimized = false,
  onToggleMinimized,
  gameState
}: HeaderProps) {
  const { t } = useTranslation();
  const roomId = (useGame as any)(s => s.roomId);
  const color = (useGame as any)(s => s.color);
  const myTurn = gameState && color && gameState.turn === color && !gameState.winner;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'options'>('menu');

  const displayTitle = title || t('app_title_short');
  const displaySubtitle = subtitle || t('app_subtitle');

  return (
    <>
      <div className={`bg-dark text-light d-flex align-items-center ${minimized ? styles.headerMinimized : 'mb-1 py-2 mt-auto'}`}>
        <div className="d-flex align-items-center">
          <img src="logo.svg" className={`${styles.logo} ${minimized ? styles.logoSmall : ''} ${!minimized ? 'me-3 ms-3' : 'ms-2 me-3'}`} title="OpenSphinx logo" alt="Sphinx coloured yellow, blue and red"></img>
          {!minimized && (
            <div>
              <h1 className="mb-0">{displayTitle}</h1>
              <small className="text-secondary">{displaySubtitle}</small>
            </div>
          )}
          {minimized && gameState && (
            <div className="d-flex gap-2 align-items-center" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              {roomId && <span><b>{t('game_id')}:</b> {roomId}</span>}
              <span><b>{t('turn')}:</b> {gameState.turn} {myTurn ? `(${t('your_move')})` : ''}</span>
            </div>
          )}
        </div>
        <div className={styles.buttonContainer} style={{ marginLeft: 'auto' }}>
          {!minimized && <LanguageSwitcher />}
          {!minimized && (
            <button
              className="btn btn-outline-light"
              onClick={() => setAccountOpen(!accountOpen)}
              style={{ backgroundColor: '#333' }}
            >
              &#128100;
            </button>
          )}
          {minimized && <LanguageSwitcher />}
          {minimized && (
            <button
              className="btn btn-outline-light"
              onClick={() => setAccountOpen(!accountOpen)}
              style={{ backgroundColor: '#333' }}
            >
              &#128100;
            </button>
          )}
          <button
            className="btn btn-outline-light"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ backgroundColor: '#333', marginRight: minimized ? '0.0rem' : '0.1rem' }}
          >
            &#9776;
          </button>
          {inGame && onToggleMinimized && (
            <button
              className="btn btn-outline-light"
              onClick={onToggleMinimized}
              style={{ backgroundColor: '#333', marginRight: minimized ? '0.0rem' : '0.5rem' }}
              title={minimized ? "Expand header" : "Minimize header"}
            >
              {minimized ? '▷' : '◁'}
            </button>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className={`position-fixed top-0 end-0 h-100 bg-dark text-light p-3 ${sidebarOpen ? 'd-block' : 'd-none'}`} style={{ width: '300px', zIndex: 1050 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>{t('settings')}</h5>
          <button className="btn btn-outline-light btn-sm" onClick={() => setSidebarOpen(false)}>×</button>
        </div>

        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>{t('menu')}</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'options' ? 'active' : ''}`} onClick={() => setActiveTab('options')}>{t('options')}</button>
          </li>
        </ul>

        {activeTab === 'menu' && (
          <div className="d-grid gap-2">
            <button className="btn btn-outline-light" onClick={() => { if (inGame) onLeaveGame?.(); onNavigate?.('home'); setSidebarOpen(false); }}>{t('home')}</button>
            {inGame ? (
              <>
                <button className="btn btn-primary" onClick={() => { onJoinRoom?.(); setSidebarOpen(false); }}>{t('join_room')}</button>
                <button className="btn btn-secondary" onClick={() => { onBrowseRooms?.(); setSidebarOpen(false); }}>{t('browse_rooms')}</button>
                <button className="btn btn-warning" onClick={onLoadGame}>{t('load_game')}</button>
                <button className="btn btn-info" onClick={() => { onNavigate?.('replays'); setSidebarOpen(false); }}>{t('view_replays')}</button>
                <button className="btn btn-danger" onClick={() => { onLeaveGame?.(); setSidebarOpen(false); }}>{t('leave_game')}</button>
              </>
            ) : (
              <>
                <button className="btn btn-primary" onClick={onNewGame}>{t('new_game')}</button>
                <button className="btn btn-secondary" onClick={onLoadGame}>{t('load_game')}</button>
                <button className="btn btn-info" onClick={() => { onNavigate?.('replays'); setSidebarOpen(false); }}>{t('view_replays')}</button>
              </>
            )}
          </div>
        )}

        {activeTab === 'options' && (
          <div className="d-grid gap-2">
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
                {t('use_3d')} {isTransitioning && `(${t('switching')})`}
              </label>
            </div>

            <div className="mb-2">
              <label htmlFor="environment-select" className="form-label small">{t('environment')}</label>
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
              <label htmlFor="cubemap-quality-select" className="form-label small">{t('mirror_quality')}</label>
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

            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={showParticles}
                onChange={e => onToggleParticles?.(e.target.checked)}
                id="show-particles-sidebar"
              />
              <label className="form-check-label" htmlFor="show-particles-sidebar">
                {t('show_particles')}
              </label>
            </div>

            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={trueReflections}
                onChange={e => onToggleTrueReflections?.(e.target.checked)}
                id="true-reflections-sidebar"
              />
              <label className="form-check-label" htmlFor="true-reflections-sidebar">
                {t('true_reflections')}
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Account Menu */}
      <div className={`position-fixed top-0 end-0 bg-dark text-light p-3 ${accountOpen ? 'd-block' : 'd-none'}`} style={{ width: '250px', zIndex: 1050, marginTop: '80px' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>{t('account')}</h5>
          <button className="btn btn-outline-light btn-sm" onClick={() => setAccountOpen(false)}>×</button>
        </div>

        <div className="d-grid gap-2">
          {!isLoggedIn && (
            <div className="mb-2">
              <label htmlFor="player-name-input" className="form-label small">{t('player_name')}</label>
              <input
                type="text"
                className="form-control form-control-sm"
                id="player-name-input"
                value={playerName}
                onChange={e => onPlayerNameChange?.(e.target.value)}
                placeholder={t('player_name')}
              />
            </div>
          )}
          <button
            className={`btn ${currentPage === 'home' ? 'btn-primary' : 'btn-outline-light'}`}
            onClick={() => { if (inGame) onLeaveGame?.(); onNavigate?.('home'); setAccountOpen(false); }}
          >
            {t('home')}
          </button>
          <button
            className={`btn ${currentPage === 'stats' ? 'btn-primary' : 'btn-outline-light'}`}
            onClick={() => { onNavigate?.('stats'); setAccountOpen(false); }}
          >
            {t('stats')}
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