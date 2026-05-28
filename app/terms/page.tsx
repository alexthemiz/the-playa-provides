export const metadata = {
  title: 'Terms of Service | The Playa Provides',
  description: 'Terms of service for The Playa Provides gear sharing platform.',
}

export default function TermsPage() {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={h1Style}>Terms &amp; Conditions</h1>
        <p style={metaStyle}>Last updated: March 2026</p>

        <p style={introStyle}>
          By using The Playa Provides, you agree to these terms. This is a
          community platform — please read, it&apos;s short.
        </p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>1. Peer-to-Peer Disclaimer</h2>
          <p style={pStyle}>
            The Playa Provides is a listing platform only. We do not own, inspect,
            or guarantee any gear listed. Users interact, borrow, and lend at their
            own risk.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>2. Indemnification</h2>
          <p style={pStyle}>
            You agree to indemnify, defend, and hold harmless The Playa Provides
            and its creators from any claims, damages, or liabilities arising from
            your use of gear obtained through this platform, including but not
            limited to equipment failure, injury, or loss of property.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>3. &ldquo;As-Is&rdquo; Clause</h2>
          <p style={pStyle}>
            All items are provided &ldquo;as-is&rdquo; in the spirit of gifting and radical
            self-reliance. No warranties, express or implied, are provided by the
            platform or the lenders.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>4. Your Responsibilities</h2>
          <p style={pStyle}>
            You are responsible for the accuracy of your listings, the condition of
            gear you lend, and honouring any return agreements you make with other
            members. Don&apos;t be a dusty flake.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>5. Account Termination</h2>
          <p style={pStyle}>
            We reserve the right to suspend or terminate accounts that violate these
            terms or harm the community. You can delete your own account at any time
            by emailing{' '}
            <a href="mailto:hello@theplayaprovides.com" style={linkStyle}>
              hello@theplayaprovides.com
            </a>
            .
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>6. Changes to These Terms</h2>
          <p style={pStyle}>
            We may update these terms from time to time. Continued use of the
            platform after changes constitutes acceptance.
          </p>
        </section>

        <p style={footerNoteStyle}>
          Questions? Email us at{' '}
          <a href="mailto:hello@theplayaprovides.com" style={linkStyle}>
            hello@theplayaprovides.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  backgroundColor: '#FDFAF4',
  minHeight: '100vh',
  padding: '40px 20px',
}

const containerStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
}

const h1Style: React.CSSProperties = {
  fontFamily: "'Arvo', serif",
  fontSize: '2rem',
  fontWeight: 900,
  color: '#1C1610',
  marginBottom: '4px',
  lineHeight: 1.05,
}

const metaStyle: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: '0.7rem',
  color: '#9A8878',
  marginBottom: '24px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
}

const introStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: '#4A3828',
  lineHeight: 1.7,
  marginBottom: '32px',
  borderBottom: '1.5px solid rgba(28,22,16,0.12)',
  paddingBottom: '24px',
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '28px',
}

const h2Style: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: '0.65rem',
  fontWeight: 700,
  color: '#4A3828',
  marginBottom: '10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
}

const pStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#4A3828',
  lineHeight: 1.7,
  marginBottom: '10px',
}

const linkStyle: React.CSSProperties = {
  color: '#1E8A82',
  textDecoration: 'underline',
}

const footerNoteStyle: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: '0.72rem',
  color: '#9A8878',
  borderTop: '1.5px solid rgba(28,22,16,0.12)',
  paddingTop: '20px',
  marginTop: '8px',
}
