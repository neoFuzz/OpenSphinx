import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../state/game';

/**
 * Props for the Replays component
 */
interface ReplaysProps {
    /** Callback function invoked when a replay is selected for viewing */
    onReplaySelect: (id: string) => void;
}

/**
 * Replays page component for viewing and managing game replays.
 * 
 * Displays a list of completed game replays that users can watch. Automatically
 * fetches available replays on mount and translates replay names based on the
 * user's language preference.
 * 
 * @component
 * @param props - Component props
 * @param props.onReplaySelect - Callback invoked when user clicks to watch a replay
 * @returns React component displaying the replays list
 * 
 * @example
 * ```tsx
 * <Replays onReplaySelect={(id) => console.log('Selected replay:', id)} />
 * ```
 */
export function Replays({ onReplaySelect }: ReplaysProps) {
    const { t } = useTranslation();
    const { replays, replaysPagination, fetchReplays } = useGame();
    const [page, setPage] = React.useState(1);
    const [search, setSearch] = React.useState('');
    const [searchInput, setSearchInput] = React.useState('');

    useEffect(() => {
        fetchReplays(page, 10, search);
    }, [page, search, fetchReplays]);

    /**
     * Translates server-generated replay names into the user's language.
     * 
     * Parses replay names in the format "Game ROOM123 - RED Wins" or "Game ROOM123 - RED wins"
     * and translates the game result text while preserving the room code.
     * 
     * @param inText - The original replay name from the server
     * @returns Translated replay name, or original text if format doesn't match
     * 
     * @example
     * ```ts
     * translateReplayName("Game ROOM123 - RED Wins") // Returns: "Game ROOM123 - Red Wins" (translated)
     * translateReplayName("Custom Name") // Returns: "Custom Name" (unchanged)
     * ```
     */
    const translateReplayName = (inText: string): string => {
        // Parse server-generated names like "Game ROOM123 - RED Wins" or "Game ROOM123 - RED wins"
        const match = inText.match(/^Game (.+) - (RED|SILVER) [Ww]ins?$/);
        if (match) {
            const [, roomCode, winner] = match;
            const winnerText = winner === 'RED' ? t('red_wins') : t('silver_wins');
            const translated = `${t('game')} ${roomCode} - ${winnerText}`;
            return translated;
        }
        return inText;
    };

    const handleSearch = () => {
        setSearch(searchInput);
        setPage(1);
    };

    return (
        <div className="container">
            <h2 className="mb-4">{t('game_replays')}</h2>

            <div className="mb-3">
                <div className="input-group">
                    <input
                        type="text"
                        className="form-control"
                        placeholder={t('search_replays') || 'Search replays...'}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="btn btn-primary" onClick={handleSearch}>
                        {t('search') || 'Search'}
                    </button>
                    {search && (
                        <button className="btn btn-secondary" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
                            {t('clear') || 'Clear'}
                        </button>
                    )}
                </div>
            </div>

            {replays.length === 0 ? (
                <div className="alert alert-info">
                    <p>{t('no_replays_message')}</p>
                </div>
            ) : (
                <>
                    <div className="list-group">
                        {replays.map((replay) => (
                            <div key={replay.id} className="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 className="mb-1">{translateReplayName(replay.name)}</h5>
                                    <small className="text-muted">
                                        {t('created')}: {new Date(replay.createdAt).toLocaleString()}
                                    </small>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => onReplaySelect(replay.id)}
                                >
                                    {t('watch_replay')}
                                </button>
                            </div>
                        ))}
                    </div>

                    {replaysPagination && replaysPagination.totalPages > 1 && (
                        <nav className="mt-3">
                            <ul className="pagination justify-content-center">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(page - 1)} disabled={page === 1}>
                                        {t('previous') || 'Previous'}
                                    </button>
                                </li>
                                {Array.from({ length: replaysPagination.totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === replaysPagination.totalPages || Math.abs(p - page) <= 2)
                                    .map((p, idx, arr) => (
                                        <React.Fragment key={p}>
                                            {idx > 0 && arr[idx - 1] !== p - 1 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                                            <li className={`page-item ${page === p ? 'active' : ''}`}>
                                                <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                                            </li>
                                        </React.Fragment>
                                    ))}
                                <li className={`page-item ${page === replaysPagination.totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(page + 1)} disabled={page === replaysPagination.totalPages}>
                                        {t('next') || 'Next'}
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    )}
                </>
            )}
        </div>
    );
}
