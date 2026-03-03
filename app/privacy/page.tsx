export default function PrivacyPage() {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={h1Style}>Privacy Policy</h1>
        <p style={metaStyle}>Effective date: March 2026</p>

        <p style={introStyle}>
          The Playa Provides ("we," "us," or "our") is a community gear-sharing platform for the
          Burning Man community. This Privacy Policy explains what information we collect, how we
          use it, and how we protect it.
        </p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>1. Information We Collect</h2>
          <p style={pStyle}>
            We collect the minimum information needed to run the platform:
          </p>
          <ul style={listStyle}>
            <li style={liStyle}>
              <strong>Account information</strong> — When you sign up with Google, we receive your
              name and email address from Google. When you sign up with email and password, we
              collect only your email.
            </li>
            <li style={liStyle}>
              <strong>Profile information</strong> — Your chosen username and preferred display name,
              which you provide during sign-up.
            </li>
            <li style={liStyle}>
              <strong>Inventory data</strong> — Items you list, descriptions, photos, and
              availability status.
            </li>
            <li style={liStyle}>
              <strong>Request data</strong> — Borrow and lending requests you send or receive,
              including any messages attached.
            </li>
            <li style={liStyle}>
              <strong>Basic usage logs</strong> — Standard server logs (IP address, page visits,
              timestamps) retained for security and debugging.
            </li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>2. How We Use Your Information</h2>
          <ul style={listStyle}>
            <li style={liStyle}>To create and manage your account</li>
            <li style={liStyle}>To display your profile and inventory to other community members</li>
            <li style={liStyle}>To send request and lending notifications via email</li>
            <li style={liStyle}>To maintain and improve the platform</li>
          </ul>
          <p style={pStyle}>
            We do not sell, rent, or share your personal information with third parties for
            marketing purposes. We do not use your data for advertising.
          </p>
        </section>

        <section style={{ ...sectionStyle, ...googleBoxStyle }}>
          <h2 style={h2Style}>3. Google API Data Disclosure</h2>
          <p style={pStyle}>
            The Playa Provides offers sign-in via Google OAuth. If you use this option, we receive
            your name and email address from Google to create your account.
          </p>
          <p style={{ ...pStyle, fontWeight: 600, color: '#2D241E' }}>
            The Playa Provides' use and transfer of information received from Google APIs to any
            other app will adhere to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <p style={pStyle}>
            In plain terms: we only use your Google account data to create and identify your account
            on The Playa Provides. We do not share it with other services or use it for any other
            purpose.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>4. Data Storage and Security</h2>
          <p style={pStyle}>
            Your data is stored on{' '}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              Supabase
            </a>
            , hosted on AWS infrastructure with industry-standard encryption in transit (TLS) and at
            rest. Photos are stored in Supabase Storage (S3-backed).
          </p>
          <p style={pStyle}>
            We take reasonable precautions to protect your data, but no online service can guarantee
            absolute security. Use a strong password and sign out on shared devices.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>5. Data Deletion</h2>
          <p style={pStyle}>
            You can request deletion of your account and all associated data at any time by emailing
            us at{' '}
            <a href="mailto:hello@theplayaprovides.com" style={linkStyle}>
              hello@theplayaprovides.com
            </a>
            . We will process deletion requests within 30 days.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>6. Cookies and Sessions</h2>
          <p style={pStyle}>
            We use session cookies to keep you logged in. No third-party tracking cookies are used.
            You can clear cookies at any time through your browser settings, which will sign you out
            of the platform.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>7. Children's Privacy</h2>
          <p style={pStyle}>
            The Playa Provides is not intended for anyone under the age of 18. We do not knowingly
            collect personal information from minors.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>8. Changes to This Policy</h2>
          <p style={pStyle}>
            We may update this policy from time to time. If we make material changes, we will
            update the effective date at the top of this page. Continued use of the platform
            after changes constitutes acceptance.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>9. Contact</h2>
          <p style={pStyle}>
            Questions about this policy? Email us at{' '}
            <a href="mailto:hello@theplayaprovides.com" style={linkStyle}>
              hello@theplayaprovides.com
            </a>
            .
          </p>
        </section>

        <p style={footerNoteStyle}>
          Note: This policy is provided in good faith for a community platform. It is not a
          substitute for formal legal counsel.
        </p>
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
  marginBottom: '4px',
};

const metaStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#aaa',
  marginBottom: '24px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
};

const introStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: '#555',
  lineHeight: 1.7,
  marginBottom: '32px',
  borderBottom: '1px solid #e5e5e5',
  paddingBottom: '24px',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '32px',
};

const googleBoxStyle: React.CSSProperties = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #bae6fd',
  borderRadius: '10px',
  padding: '20px 24px',
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

const listStyle: React.CSSProperties = {
  paddingLeft: '20px',
  marginBottom: '12px',
};

const liStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#555',
  lineHeight: 1.7,
  marginBottom: '6px',
};

const linkStyle: React.CSSProperties = {
  color: '#00aacc',
  textDecoration: 'underline',
};

const footerNoteStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#aaa',
  fontStyle: 'italic' as const,
  borderTop: '1px solid #e5e5e5',
  paddingTop: '20px',
  marginTop: '16px',
};
