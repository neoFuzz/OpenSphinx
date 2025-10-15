import { getBadges } from '../../../shared/src/badges';
import { SERVER_URL } from '../config/server';

export default function DeploymentBadges() {
  const badges = getBadges();
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <a href={badges[0].url} target="_blank" rel="noopener noreferrer">
        <img src={`${SERVER_URL}/api/badge/status`} alt="Server Status" />
      </a>
      <a href={badges[1].url} target="_blank" rel="noopener noreferrer">
        <img src={`${SERVER_URL}/api/badge/client-status`} alt="Client Status" />
      </a>
    </div>
  );
}
