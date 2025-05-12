import { useState, useEffect } from 'react';
import { Tables } from '@multi-tenant-platform/types';
import { api } from '../../services/api';

interface CompetitionsListProps {
  tenantId: string;
}

export function CompetitionsList({ tenantId }: CompetitionsListProps) {
  const [competitions, setCompetitions] = useState<Tables<'competitions'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchCompetitions();
    }
  }, [tenantId]);

  async function fetchCompetitions() {
    try {
      setLoading(true);
      const data = await api.getTenantCompetitions(tenantId);
      setCompetitions(data);
      setError(null);
    } catch (err) {
      setError('Failed to load competitions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading && competitions.length === 0) {
    return <div>Loading competitions...</div>;
  }

  return (
    <div className="competitions-list">
      <h2>Competitions for Tenant</h2>
      
      {error && <div className="error">{error}</div>}

      {competitions.length === 0 ? (
        <p>No competitions found for this tenant.</p>
      ) : (
        <ul className="competitions-grid">
          {competitions.map((competition) => (
            <li key={competition.id} className="competition-card">
              <h3>{competition.title}</h3>
              {competition.description && <p>{competition.description}</p>}
              <div className="competition-meta">
                <span className="visibility-badge">{competition.visibility}</span>
                <span className="date">Created: {new Date(competition.created_at).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
