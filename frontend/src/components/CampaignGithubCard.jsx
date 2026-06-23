import React from 'react';

function formatCount(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString();
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function CampaignGithubCard({ repoUrl, stats }) {
  if (!repoUrl || !stats || stats.unavailable) return null;

  const repoLabel = stats.owner && stats.repo
    ? `${stats.owner}/${stats.repo}`
    : repoUrl.replace(/^https?:\/\/github\.com\//i, '');

  return (
    <section
      className="campaign-card"
      style={{ marginBottom: '1.75rem' }}
      aria-label="GitHub repository stats"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Open Source</h2>
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-accent)', fontSize: '0.9rem', wordBreak: 'break-all' }}
          >
            {repoLabel}
          </a>
        </div>
        {stats.contributors?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {stats.contributors.map((contributor) => (
              <a
                key={contributor.login}
                href={contributor.html_url}
                target="_blank"
                rel="noopener noreferrer"
                title={contributor.login}
                style={{ marginLeft: '-0.35rem' }}
              >
                <img
                  src={contributor.avatar_url}
                  alt={contributor.login}
                  width={32}
                  height={32}
                  style={{
                    borderRadius: '50%',
                    border: '2px solid #fff',
                    display: 'block',
                  }}
                />
              </a>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-hint)' }}>Stars</div>
          <strong>{formatCount(stats.stars)}</strong>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-hint)' }}>Forks</div>
          <strong>{formatCount(stats.forks)}</strong>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-hint)' }}>Open issues</div>
          <strong>{formatCount(stats.open_issues)}</strong>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-hint)' }}>Last commit</div>
          <strong>{formatDate(stats.last_commit_at)}</strong>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-hint)' }}>License</div>
          <strong>{stats.license || '—'}</strong>
        </div>
      </div>
    </section>
  );
}
