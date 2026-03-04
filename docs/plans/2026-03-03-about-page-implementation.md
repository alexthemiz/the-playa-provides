# About Page Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the lorem ipsum placeholder on `/about` with four real content sections: Mission, Get in Touch, Support the Project, and Help Build It.

**Architecture:** Single static file overwrite — `app/about/page.tsx`. No client state, no `'use client'` directive, no new routes, no new components. Inline React CSS (`React.CSSProperties`) with `as const` for literal values. Consistent styling with `app/privacy/page.tsx`.

**Tech Stack:** Next.js 16 App Router, React 19, inline CSS objects (no Tailwind in JSX)

**Design doc:** `docs/plans/2026-03-03-about-page-design.md`

---

### Task 1: Overwrite `app/about/page.tsx`

**Files:**
- Modify: `app/about/page.tsx` (full overwrite)

**Step 1: Read the current file**

Read `app/about/page.tsx` to confirm the current content before overwriting. Also read `app/privacy/page.tsx` to confirm the style patterns you'll be matching (page/container/h1/section styles).

**Step 2: Write the new page**

Replace the entire contents of `app/about/page.tsx` with the following:

```tsx
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
```

**Step 3: Verify in browser**

Run `npm run dev`, navigate to `/about`. Check:
- [ ] Page renders without errors
- [ ] Headline reads "The Playa Provides: About"
- [ ] All four sections visible (mission intro + 3 named sections)
- [ ] Email links are clickable and open mail client
- [ ] No Tailwind class names in JSX (inline styles only)
- [ ] Page looks consistent with `/privacy` in a side-by-side comparison

**Step 4: Commit**

```bash
git add app/about/page.tsx
git commit -m "feat: flesh out /about page — mission, contact, support, contribute"
```

**Step 5: Push**

```bash
git push
```

---

### Task 2: Update TASKS.md

**Files:**
- Modify: `TASKS.md`

**Step 1: Mark done and update**

In `TASKS.md`, add to the ✅ Done section:
```
- [x] Design: /about page — replaced lorem ipsum with mission, contact, support, and contribute sections
```

**Step 2: Commit**

```bash
git add TASKS.md
git commit -m "docs: mark /about page overhaul as done"
git push
```
