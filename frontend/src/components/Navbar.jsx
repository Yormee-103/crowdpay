import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav style={styles.nav}>
      <div className="container nav-inner-wrap">
        <Link
          to="/"
          style={styles.logo}
          aria-label={t('nav.homeAria')}
          aria-current={pathname === '/' ? 'page' : undefined}
        >
          CrowdPay
        </Link>
        <div className="nav-links">
          <select
            value={language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            aria-label={t('nav.selectLanguage')}
            style={styles.languageSelect}
          >
            <option value="en">EN</option>
            <option value="fr">FR</option>
          </select>
          {user ? (
            <>
              <Link
                to="/campaigns/new"
                style={styles.link}
                aria-current={pathname === '/campaigns/new' ? 'page' : undefined}
              >
                {t('nav.startCampaign')}
              </Link>
              <span style={styles.name} aria-hidden="true">{user.name}</span>
              <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.4rem 0.9rem' }}>
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.link} aria-current={pathname === '/login' ? 'page' : undefined}>
                {t('nav.login')}
              </Link>
              <Link to="/register" aria-current={pathname === '/register' ? 'page' : undefined}>
                <button className="btn-primary" style={{ padding: '0.4rem 0.9rem' }}>
                  {t('nav.signup')}
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: { background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 10 },
  logo: { fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-accent)' },
  link: { color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '0.9rem' },
  name: { color: 'var(--color-text-secondary)', fontSize: '0.85rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  languageSelect: {
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '0.35rem 0.55rem',
    color: 'var(--color-text-secondary)',
    fontSize: '0.85rem',
  },
};
