import { Link } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'

/**
 * Public landing page that introduces the platform and routes users to auth flows.
 */
export function LandingPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  return (
    <main className="page page-landing">
      <section className="hero-section hero-surface">
        <div className="orb orb-a" aria-hidden="true" />
        <div className="orb orb-b" aria-hidden="true" />

        <p className="eyebrow">AI Interview Practice Platform</p>
        <h1>
          {isAuthenticated
            ? `Welcome back, ${user?.full_name ?? 'there'}. Ready for your next round?`
            : 'Practice interviews with structured feedback, every single day.'}
        </h1>
        <p className="hero-copy">
          {isAuthenticated
            ? 'Jump into a new interview setup and keep your momentum going. Your previous progress is saved and waiting.'
            : 'Configure a mock interview, answer with your voice, and get an analysis report that tracks your improvement over time.'}
        </p>

        <div className="hero-actions">
          {isAuthenticated ? (
            <>
              <Link className="btn btn-primary" to="/configure">
                Start Interview
              </Link>
              <Link className="btn btn-ghost" to="/dashboard">
                Go to Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link className="btn btn-primary" to="/register">
                Start Free
              </Link>
              <Link className="btn btn-ghost" to="/login">
                I already have an account
              </Link>
            </>
          )}
        </div>

        <div className="hero-stats" aria-label="Platform summary">
          <div>
            <strong>10+</strong>
            <span>Domains</span>
          </div>
          <div>
            <strong>Adaptive</strong>
            <span>Questioning</span>
          </div>
          <div>
            <strong>Live</strong>
            <span>Progress Tracking</span>
          </div>
        </div>
      </section>

      <section className="feature-grid" aria-label="Core features">
        <article className="feature-card">
          <h2>Role-specific setup</h2>
          <p>
            Choose domain, role, difficulty, and interview type so each session matches what you
            are preparing for.
          </p>
        </article>

        <article className="feature-card">
          <h2>Voice-first interview flow</h2>
          <p>
            Speak your answers naturally and get a smooth conversational interview loop powered by
            real-time AI evaluation.
          </p>
        </article>

        <article className="feature-card">
          <h2>Progress analytics</h2>
          <p>
            Review strengths, weak areas, and score trends across sessions to measure growth and
            plan focused practice.
          </p>
        </article>
      </section>

      <section className="highlight-strip" aria-label="Value proposition">
        <p>
          PrepUp turns random interview prep into a repeatable system: configure, perform, review,
          and improve.
        </p>
      </section>
    </main>
  )
}
