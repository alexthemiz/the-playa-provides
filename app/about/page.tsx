export default function AboutPage() {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={h1Style}>The Playa Provides: About</h1>

        <p style={introStyle}>
          The Playa Provides is a peer-to-peer gear-sharing platform built for the Burning Man
          community. The idea is simple: the people who've done this before have tents, bikes,
          shade structures, and camp gear sitting in storage. New burners and returning ones with
          less stuff need exactly that. This platform connects them. Radical gifting, made practical.
        </p>

        {/* SECTION: Get in Touch */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Get in Touch</h2>
          <p style={pStyle}>
            Questions, bug reports, feedback, ideas — we want to hear all of it. The best way to
            reach us is email:
          </p>
          <a href="mailto:hello@theplayaprovides.com" style={emailLinkStyle}>
            hello@theplayaprovides.com
          </a>
        </section>

        <div style={dividerStyle} />

        {/* SECTION: Support */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Support the Project</h2>
          <p style={pStyle}>
            This site is free to use and we plan to keep it that way. But it takes real time and
            money to build and run — hosting, infrastructure, and a lot of late nights. If you've
            gotten value out of it and want to kick in a few bucks, we'd be genuinely grateful.
          </p>
          <p style={pStyle}>
            Drop us a line at{' '}
            <a href="mailto:hello@theplayaprovides.com" style={inlineLinkStyle}>
              hello@theplayaprovides.com
            </a>{' '}
            and we'll send you details.
          </p>
        </section>

        <div style={dividerStyle} />

        {/* SECTION: Contribute */}
        <section style={sectionStyle}>
          <h2 style={h2Style}>Help Build It</h2>
          <p style={pStyle}>
            This is a community project and we're genuinely open to collaborators. Got a feature
            idea? Think something should work differently? Know how to code or design and want to
            contribute? Reach out — we'd love to hear from you.
          </p>
          <a href="mailto:hello@theplayaprovides.com" style={emailLinkStyle}>
            hello@theplayaprovides.com
          </a>
        </section>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  minHeight: '100vh',
  padding: '40px 20px',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
};

const h1Style: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 800,
  color: '#2D241E',
  marginBottom: '20px',
};

const introStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: '#555',
  lineHeight: 1.7,
  marginBottom: '36px',
  borderBottom: '1px solid #e5e5e5',
  paddingBottom: '28px',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '8px',
};

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid #e5e5e5',
  margin: '28px 0',
};

const h2Style: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  color: '#2D241E',
  marginBottom: '10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const pStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#555',
  lineHeight: 1.7,
  marginBottom: '10px',
};

const emailLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '4px',
  fontSize: '1rem',
  fontWeight: 600,
  color: '#00aacc',
  textDecoration: 'none',
};

const inlineLinkStyle: React.CSSProperties = {
  color: '#00aacc',
  textDecoration: 'none',
  fontWeight: 600,
};
