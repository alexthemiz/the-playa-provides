'use client';

import { useState } from 'react';
import type React from 'react';
import { ChevronDown } from 'lucide-react';

const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const PAPER_DK = '#EDE5D0'
const LIME     = '#B8CC2A'
const TEAL     = '#1E8A82'

const pStyle: React.CSSProperties = { fontSize: '0.95rem', color: INK_MID, lineHeight: 1.75, marginBottom: '16px', margin: '0 0 16px' }
const linkStyle: React.CSSProperties = { color: TEAL, textDecoration: 'underline', textDecorationColor: 'rgba(30,138,130,0.4)', textUnderlineOffset: '3px' }

const SECTIONS = [
  {
    title: 'Why?',
    content: (
      <div style={{ padding: '20px 0 8px' }}>
        <p style={pStyle}>Going to Burning Man? Cool. Super cool. The coolest. Buying a lot of stuff for it? Not cool. The opposite of cool. A bummer.</p>
        <p style={pStyle}>Sure, one of Burning Man&rsquo;s eleven principles<sup>*</sup> is decommodification. But that only applies to when you&rsquo;re there. Burning Man may be decommodified, but getting to Burning Man sure as heck isn&rsquo;t. It requires months of excessive commodification.</p>
        <p style={pStyle}>Every year brings thousands of virgin burners to the playa. And every year, thousands of veteran burners decide to sit this one out. The Playa Provides wants to make it easier for the latter to lend their gear to the former, to make a modification to decommodification.</p>
        <p style={pStyle}>Because why let your stuff collect dust in storage when it could be earning dust on playa? And why give Amazon or Walmart or Target your money when so much of what you need is already in a bin, a storage unit or a basement, itching to be put to use?</p>
        <p style={pStyle}>Just because you&rsquo;re not going doesn&rsquo;t mean your stuff can&rsquo;t.</p>
        <p style={pStyle}>While it&rsquo;s damn near-impossible to decommodify the prep for Burning Man entirely, we can engage in the pursuit of decommodification. The Playa Provides is for anyone who cares about this pursuit, tries to live more sustainably, hates buying new things from big corporations, and wants to take the circular economy for a spin. Or frankly doesn&rsquo;t have the dough to pay full retail.</p>
        <p style={{ ...pStyle, fontSize: '0.8rem', color: INK_LITE, marginBottom: 0 }}>
          <sup>*</sup><a href="https://burningman.org/about-us/10-principles/" target="_blank" rel="noopener noreferrer" style={linkStyle}>The ten official principles</a> + the one <a href="https://www.11thprincipleconsent.org/" target="_blank" rel="noopener noreferrer" style={linkStyle}>they should make official</a>
        </p>
      </div>
    ),
  },
  {
    title: 'How?',
    content: (
      <div style={{ padding: '20px 0 8px' }}>
        <p style={pStyle}>We know that there&rsquo;s some risk involved with lending items out&mdash;they may break, they may get lost, they may come back covered in stickers, they may come back incessantly chatting about all the craaaaazy things that happened to them at the Burn. Dude, you&rsquo;re a spork, chill out.</p>
        <p style={pStyle}>Yet what would going to Burning Man&mdash;or not going to Burning Man&mdash;be without a little risk? You&rsquo;re brave, you&rsquo;ve climbed to the top of scaffold towers and made out with strangers in the cargo holds of art cars; what&rsquo;s a little lending of gear if it means others can climb the same towers and make out with the same strangers?</p>
        <p style={pStyle}>The terms and the exchange happen directly between lender and lendee. When listing an item, you set your terms right up front: &ldquo;If item is returned broken, you agree to x; if item not returned, you agree to y.&rdquo; It&rsquo;s up to the lendee to accept your terms, or counter; this happens via email, so there&rsquo;s a written record of whatever&rsquo;s agreed upon between you.</p>
        <p style={{ ...pStyle, marginBottom: 0 }}>But maybe you have an aversion to strangers and would rather make items only available to people you know. We get it — you can choose an item&rsquo;s visibility: to your followers, your campmates, both, or anyone.</p>
      </div>
    ),
  },
  {
    title: 'Who?',
    content: (
      <div style={{ padding: '20px 0 8px' }}>
        <p style={pStyle}>Who what?</p>
        <p style={pStyle}><strong style={{ color: INK }}>Who built this site?</strong><br />Me. I&rsquo;m Alex.</p>
        <p style={pStyle}><strong style={{ color: INK }}>&ldquo;I&rsquo;m&rdquo;? Then what&rsquo;s with all that &ldquo;we&rdquo; business?</strong><br />It sounds better. Like it might make you think that this site was built by Coursera&rsquo;s finest software engineering graduates. But nope, it&rsquo;s just me. Well, me and my boy Claude here.</p>
        <p style={pStyle}><strong style={{ color: INK }}>Ugh, another vibe coded website?</strong><br />I know, I know. Such a cliche. But rest assured: while I built this site using Claude Code, I did all the writing and designing myself. Besides, if it wasn&rsquo;t for vibe coding, the site wouldn&rsquo;t have been built at all, and you wouldn&rsquo;t be saving money on lag bolts and air mattresses and unicorn onesies.</p>
        <p style={{ ...pStyle, marginBottom: 0 }}>
          Anyway, I&rsquo;m Alex, and I feel strongly that there&rsquo;s too much stuff. If you have an event coming up, consider hiring{' '}
          <a href="https://www.smoreslab.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>The S&rsquo;mores Lab</a>.
          Or if you&rsquo;re looking for a communications manager or copywriter, consider{' '}
          <a href="https://www.alexmizrahi.com/" target="_blank" rel="noopener noreferrer" style={linkStyle}>hiring me</a>!
        </p>
      </div>
    ),
  },
  {
    title: 'Can I Help?',
    content: (
      <div style={{ padding: '20px 0 8px' }}>
        <p style={pStyle}>Love that burnery spirit. You can help in so many ways:</p>
        <p style={pStyle}><strong style={{ color: INK }}>Use the site!</strong> Add items to your inventory, make them available for borrowing, give something away, request items from others.</p>
        <p style={pStyle}><strong style={{ color: INK }}>Share it!</strong> With your friends and campmates, in your WhatsApp groups and planning meetings, and everywhere burners gather and scheme.</p>
        <p style={pStyle}><strong style={{ color: INK }}>Improve it!</strong> If you have feature ideas, discover bugs, want to help with design or social media, or contribute in some other way, please reach out to{' '}
          <a href="mailto:hello@theplayaprovides.com" style={linkStyle}>hello@theplayaprovides.com</a>.
        </p>
        <p style={pStyle}>
          <strong>
            <a href="#" style={{ ...linkStyle }} onClick={(e) => { e.preventDefault(); new Audio('/bopit.mp3').play(); }}>Bop it!</a>
          </strong>
        </p>
        <p style={{ ...pStyle, marginBottom: 0 }}>
          <strong style={{ color: INK }}>Fund it!</strong> Running a website isn&rsquo;t free. If you find value in our site or believe in our mission and feel like kicking in a few bucks, <a href="mailto:alex@theplayaprovides.com" style={linkStyle}>email me</a> and we&rsquo;ll figure out the best way to do that.
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
    <div style={{ backgroundColor: PAPER, minHeight: '100vh' }}>

      {/* Page header band */}
      <div style={{ backgroundColor: PAPER_LT, borderBottom: `2px solid ${INK}`, padding: '28px 40px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '8px' }}>About</div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '2rem', fontWeight: 900, color: INK, margin: 0, lineHeight: 1.05 }}>
            An <em style={{ fontStyle: 'italic', color: TEAL }}>About</em> Page.
          </h1>
        </div>
      </div>

      {/* Accordion */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 40px 64px' }}>
        {SECTIONS.map((section, i) => {
          const isOpen = openSections.has(i);
          return (
            <div key={i} style={{ borderBottom: `1.5px solid rgba(28,22,16,0.12)` }}>
              <button
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', background: 'none', border: 'none', padding: '20px 0',
                  cursor: 'pointer', textAlign: 'left' as const,
                }}
              >
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', fontWeight: 700, color: INK }}>{section.title}</span>
                <ChevronDown size={18} style={{ flexShrink: 0, color: INK_LITE, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
              </button>
              {isOpen && <div>{section.content}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
