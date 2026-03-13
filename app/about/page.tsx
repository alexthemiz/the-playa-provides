'use client';

import { useState } from 'react';
import type React from 'react';
import { ChevronDown, Instagram } from 'lucide-react';

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
  marginBottom: '32px',
};

const headerBtnStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  background: 'none',
  border: 'none',
  padding: '20px 0',
  cursor: 'pointer',
  textAlign: 'left' as const,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  color: '#2D241E',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const bodyStyle: React.CSSProperties = {
  paddingBottom: '20px',
};

const pStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: '#555',
  lineHeight: 1.7,
  marginBottom: '16px',
};

const figureStyle: React.CSSProperties = {
  margin: '16px 0 24px',
};

const chartStyle: React.CSSProperties = {
  width: '50%',
  height: 'auto',
  display: 'block',
  borderRadius: '8px',
  border: '1px solid #e5e5e5',
  margin: '0 auto',
};

const captionStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#aaa',
  marginTop: '6px',
  textAlign: 'center' as const,
};

const emailLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '6px',
  fontSize: '1rem',
  fontWeight: 600,
  color: '#00aacc',
  textDecoration: 'none',
};

const inlineLinkStyle: React.CSSProperties = {
  color: '#00aacc',
  textDecoration: 'underline',
};

const SECTIONS = [
  {
    title: 'What Is This?',
    content: (
      <p style={pStyle}>
        The Playa Provides is a peer-to-peer gear-sharing platform built for the Burning Man
        community, and anyone who shares its values. The idea is simple: veterans who've done
        this before have tents, bikes, shade structures, and camp gear sitting in storage. New
        burners and returning ones with less stuff need exactly that. This platform connects
        them. Radical gifting, made practical.
      </p>
    ),
  },
  {
    title: "Why It's Needed",
    content: (
      <div>
        <p style={pStyle}>
          Getting to Black Rock City isn't cheap. According to the{' '}
          <a href="https://blackrockcitycensus.org/" target="_blank" rel="noopener noreferrer" style={inlineLinkStyle}>
            2024 Burning Man Census
          </a>
          , the median participant spends around $2,000 just to get to and from BRC.
        </p>
        <figure style={figureStyle}>
          <img src="/Spend_to_and_from_BRC.png" alt="Chart: travel spend to/from BRC" style={chartStyle} />
          <figcaption style={captionStyle}>Source: 2024 Burning Man Census</figcaption>
        </figure>

        <p style={pStyle}>
          In Nevada alone, participants spend an average of around $750 per person on food,
          fuel, lodging, and supplies.
        </p>
        <figure style={figureStyle}>
          <img src="/Avg_spend_in_Nevada_per_participant.png" alt="Chart: average Nevada spend per participant" style={chartStyle} />
          <figcaption style={captionStyle}>Source: 2024 Burning Man Census</figcaption>
        </figure>

        <p style={pStyle}>
          About 1 in 3 attendees at any given Burn is a first-timer, buying gear from scratch,
          often never to use it again.
        </p>
        <figure style={figureStyle}>
          <img src="/Proportion_of_virgins.png" alt="Chart: proportion of first-timers" style={chartStyle} />
          <figcaption style={captionStyle}>Source: 2024 Burning Man Census</figcaption>
        </figure>

        <p style={pStyle}>
          And most people who have ever been to Burning Man have only gone once or twice.
          That's a lot of tents, shade structures, and camp gear sitting in storage; gear that
          could be going to the playa instead.
        </p>
        <figure style={figureStyle}>
          <img src="/Number_of_burns_attended.png" alt="Chart: number of burns attended" style={chartStyle} />
          <figcaption style={captionStyle}>Source: 2024 Burning Man Census</figcaption>
        </figure>

        <p style={pStyle}>
          The gear already exists. It's sitting in storage units across the country. The Playa
          Provides gets it moving.
        </p>
      </div>
    ),
  },
  {
    title: 'Who Made This?',
    content: (
      <div>
        <p style={pStyle}>
          The Playa Provides was built by a small group of burners who got tired of watching perfectly
          good gear sit in storage every year. It's a side project, built with love and a lot of
          late nights.
        </p>
        <p style={{ ...pStyle, marginBottom: 0 }}>
          Follow along:{' '}
          <a
            href="https://www.instagram.com/theplayaprovides_/"
            target="_blank"
            rel="noopener noreferrer"
            style={inlineLinkStyle}
          >
            <Instagram size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', marginBottom: '2px' }} />
            @theplayaprovides_
          </a>
        </p>
      </div>
    ),
  },
  {
    title: 'Support the Project',
    content: (
      <div>
        <p style={pStyle}>
          This is a community project and we're genuinely open to collaborators. Got a feature
          idea? Think something should work differently? Know how to code or design and want to
          contribute? Questions, bug reports, other ideas? We'd love to hear from you.{' '}
          <a href="mailto:hello@theplayaprovides.com" style={emailLinkStyle}>
            📧 hello@theplayaprovides.com
          </a>
        </p>
        <p style={pStyle}>
          While the site is free to use and we plan to keep it that way, it takes real time and
          money to build and maintain. If you're getting value out of it or simply believe in our
          mission and want to kick in a few bucks, we'd be genuinely grateful. Reach out and
          we'll send a Venmo link over.
        </p>
      </div>
    ),
  },
];

export default function AboutPage() {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0, 1, 2, 3]));

  const toggle = (i: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={h1Style}>The Playa Provides<span style={{ textDecoration: 'underline' }}> An About Page{'\u00a0'}</span></h1>

        <div>
          {SECTIONS.map((section, i) => {
            const isOpen = openSections.has(i);
            return (
              <div key={i} style={{ borderBottom: '1px solid #e5e5e5' }}>
                <button
                  onClick={() => toggle(i)}
                  style={headerBtnStyle}
                  aria-expanded={isOpen}
                >
                  <span style={sectionTitleStyle}>{section.title}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      flexShrink: 0,
                      color: '#aaa',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>
                {isOpen && (
                  <div style={bodyStyle}>
                    {section.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
