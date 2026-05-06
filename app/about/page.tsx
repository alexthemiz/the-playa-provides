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

const whyRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '20px',
  alignItems: 'flex-start',
  marginBottom: '20px',
};

const sideFigureStyle: React.CSSProperties = {
  flexShrink: 0,
  width: '225px',
};

const sideChartStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  display: 'block',
  borderRadius: '6px',
  border: '1px solid #e5e5e5',
};

const captionStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#aaa',
  marginTop: '4px',
  textAlign: 'center' as const,
};

const inlineLinkStyle: React.CSSProperties = {
  color: '#00aacc',
  textDecoration: 'underline',
};

const SECTIONS = [
  {
    title: 'Why?',
    content: (
      <div>
        <p style={pStyle}>
          Going to Burning Man? Cool. Super cool. The coolest. Buying a lot of stuff for it? Not cool. The opposite of cool. A bummer.
        </p>
        <p style={pStyle}>
          Sure, one of Burning Man&rsquo;s eleven principles<sup>*</sup> is decommodification. But that only applies to when you&rsquo;re there. Burning Man may be decommodified, but getting to Burning Man sure as heck isn&rsquo;t. It requires months of excessive commodification.
        </p>
        <p style={pStyle}>
          Every year brings thousands of virgin burners to the playa. And every year, thousands of veteran burners decide to sit this one out. The Playa Provides wants to make it easier for the latter to lend their gear to the former, to make a modification to decommodification.
        </p>
        <p style={pStyle}>
          Because why let your stuff collect dust in storage when it could be earning dust on playa? And why give Amazon or Walmart or Target your money when so much of what you need is already in a bin, a storage unit or a basement, itching to be put to use?
        </p>
        <p style={pStyle}>
          Just because you&rsquo;re not going doesn&rsquo;t mean your stuff can&rsquo;t.
        </p>
        <p style={pStyle}>
          While it&rsquo;s damn near-impossible to decommodify the prep for Burning Man entirely, we can engage in the pursuit of decommodification. The Playa Provides is for anyone who cares about this pursuit, tries to live more sustainably, hates buying new things from big corporations, and wants to take the circular economy for a spin. Or frankly doesn&rsquo;t have the dough to pay full retail.
        </p>
        <p style={{ ...pStyle, fontSize: '0.8rem', color: '#aaa', marginBottom: 0 }}>
          <sup>*</sup>The ten official principles + the one they should make official
        </p>
      </div>
    ),
  },
  {
    title: 'How?',
    content: (
      <div>
        <p style={pStyle}>
          We know that there&rsquo;s some risk involved with lending items out&mdash;they may break, they may get lost, they may come back covered in stickers, they may come back incessantly chatting about all the craaaaazy things that happened to them at the Burn. Dude, you&rsquo;re a spork, chill out.
        </p>
        <p style={pStyle}>
          Yet what would going to Burning Man&mdash;or not going to Burning Man&mdash;be without a little risk? You&rsquo;re brave, you&rsquo;ve climbed to the top of scaffold towers and made out with strangers in the cargo holds of art cars; what&rsquo;s a little lending of gear if it means others can climb the same towers and make out with the same strangers?
        </p>
        <p style={pStyle}>
          The terms and the exchange happen directly between lender and lendee. When listing an item, you set your terms right up front: &ldquo;If item is returned broken, you agree to x; if item not returned, you agree to y.&rdquo; It&rsquo;s up to the lendee to accept your terms, or counter; this happens via email, so there&rsquo;s a written record of whatever&rsquo;s agreed upon between you.
        </p>
        <p style={pStyle}>
          But maybe you have an aversion to strangers and would rather make items only available to people you know, giving it a level of trustitude and vouchiness. We get it, you know some great people (some questionable ones, too; you are a burner, after all), so you can choose an item&rsquo;s visibility: to your followers, your campmates, both, or anyone.
        </p>
        <p style={{ ...pStyle, marginBottom: 0 }}>
          To find your camps, simply add your Burning Man history to your profile, save, then click on the camp name to see all your campmates from across the years who&rsquo;ve also joined. You now have a private borrowing hub just for your camp. Neeeeeeeeat.
        </p>
      </div>
    ),
  },
  {
    title: 'Who?',
    content: (
      <div>
        <p style={pStyle}><strong>Who built this site? Who am I talking to right now?</strong><br />
          Me. I&rsquo;m Alex.
        </p>
        <p style={pStyle}><strong>&ldquo;I&rsquo;m&rdquo;? Then what&rsquo;s with all that &ldquo;we&rdquo; business?</strong><br />
          It sounds better. Like it might make you think that this site was built by Coursera&rsquo;s finest software engineering graduates. But nope, it&rsquo;s just me. Well, me and my boy Claude here.
        </p>
        <p style={pStyle}><strong>Ugh, another vibe coded website?</strong><br />
          I know, I know. Such a cliche. But rest assured: while I built this site using Claude Code, I did all the writing and designing myself. Besides, if it wasn&rsquo;t for vibe coding, the site wouldn&rsquo;t have been built at all, and you wouldn&rsquo;t be saving money on lag bolts and air mattresses and unicorn onesies.
        </p>
        <p style={pStyle}>
          Anyway, I&rsquo;m Alex, and I feel strongly that there&rsquo;s too much stuff, that pretty much everything that needs to be made has already been made, way more than necessary, and if we just worked together and communicated better and made ourselves a little uncomfortable, we&rsquo;d be able to make more people&rsquo;s dreams of making out with strangers in the cargo holds of art cars come true. Isn&rsquo;t that what this is all about?
        </p>
        <p style={{ ...pStyle, marginBottom: 0 }}>
          And because I can, allow me one moment of shameless self-promotion: if you have an event coming up&mdash;corporate retreat, wedding, bar mitzvah, festival, private party, whatever&mdash;consider hiring{' '}
          <a href="https://www.smoreslab.com" target="_blank" rel="noopener noreferrer" style={inlineLinkStyle}>The S&rsquo;mores Lab</a>{' '}
          for an extra sweet interactive experience. Or if you&rsquo;re looking for a communications manager or copywriter for your organization, consider hiring me!
        </p>
      </div>
    ),
  },
  {
    title: 'Can I Help?',
    content: (
      <div>
        <p style={pStyle}>Love that burnery spirit. You can help in so many ways:</p>
        <ul style={{ paddingLeft: '20px', margin: '0 0 16px' }}>
          <li style={{ ...pStyle, marginBottom: '12px' }}>
            <strong>Use the site!</strong> Add items to your inventory, make them available for borrowing, give something away, request items from others.
          </li>
          <li style={{ ...pStyle, marginBottom: '12px' }}>
            <strong>Share it!</strong> With your friends and campmates, in your WhatsApp groups and planning meetings, and everywhere burners gather and scheme. Don&rsquo;t exclude your former burner and non-burner friends, they&rsquo;re invited to the party too.
          </li>
          <li style={{ ...pStyle, marginBottom: '12px' }}>
            <strong>Improve it!</strong> Just having you here already makes the site better, because you are wonderful and your presence makes everywhere you go brighter and sweeter and prettier. But you also have a great big brain and lots of hard skills, so if you have any feature ideas, discover any bugs, want to help with design or social media, or contribute in some other way, please reach out to{' '}
            <a href="mailto:hello@theplayaprovides.com" style={inlineLinkStyle}>hello@theplayaprovides.com</a>.{' '}
            We could use all the help we can get, and are grateful for any you can give us.
          </li>
          <li style={{ ...pStyle, marginBottom: '12px' }}>
  <strong>
  <a 
    href="#" 
    style={{ ...inlineLinkStyle, color: '#2D241E', textDecoration: 'none' }} 
    onClick={(e) => { e.preventDefault(); new Audio('/bopit.mp3').play(); }}
  >
    Bop it!
  </a>
</strong>
          </li>
          <li style={{ ...pStyle, marginBottom: 0 }}>
            <strong>Fund it!</strong> You know what else is decommodified? This website! It&rsquo;s free, and I really want to keep it that way. But you know what&rsquo;s not decommodified? Society! Running a website, especially when people start to use it (supposedly)! If you find value in our site or simply believe in our mission, and feel like kicking in a few bucks, email me at{' '}
            <a href="mailto:alex@theplayaprovides.com" style={inlineLinkStyle}>alex@theplayaprovides.com</a>{' '}
            and we&rsquo;ll figure out the best way to do that.
          </li>
        </ul>
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