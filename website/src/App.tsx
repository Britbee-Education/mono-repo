import { useEffect, useState, type FormEvent } from "react";
import { LINKS } from "./config";
import "./index.css";

const WAITLIST_KEY = "britbee_waitlist_email";

export default function App() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(WAITLIST_KEY);
      if (saved) {
        setEmail(saved);
        setSent(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const join = document.getElementById("join");
      const joinTop = join?.offsetTop ?? Number.POSITIVE_INFINITY;
      setShowStickyCta(y > window.innerHeight * 0.55 && y + window.innerHeight < joinTop + 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [navOpen]);

  function onWaitlist(e: FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    try {
      localStorage.setItem(WAITLIST_KEY, value);
    } catch {
      /* ignore */
    }
    setSent(true);
  }

  function closeNav() {
    setNavOpen(false);
  }

  const signupWithEmail = sent && email
    ? `${LINKS.appSignup}?email=${encodeURIComponent(email)}`
    : LINKS.appSignup;

  return (
    <div className="page">
      <a className="skip" href="#main">
        Skip to content
      </a>

      <nav className={`topnav${scrolled ? " topnav-solid" : ""}`} aria-label="Primary">
        <a className="topnav-brand" href="#top" onClick={closeNav}>
          <img src="/bee.png" alt="" width={36} height={36} />
          <span>BritBee</span>
        </a>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={navOpen}
          aria-controls="site-menu"
          onClick={() => setNavOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <span className="nav-toggle-bars" aria-hidden />
        </button>

        <div id="site-menu" className={`topnav-links${navOpen ? " is-open" : ""}`}>
          <a href="#how" onClick={closeNav}>
            How it works
          </a>
          <a href="#family" onClick={closeNav}>
            For families
          </a>
          <a href="#apps" onClick={closeNav}>
            Get the app
          </a>
          <a href="#mentors" onClick={closeNav}>
            Mentors
          </a>
          <a className="btn-nav-ghost" href={LINKS.appWeb} onClick={closeNav}>
            Open web app
          </a>
          <a className="btn-nav-primary" href="#join" onClick={closeNav}>
            Join beta
          </a>
        </div>
      </nav>

      <main id="main">
        <header className="hero" id="top">
          <div className="hero-sky" aria-hidden />
          <img className="hero-bee" src="/bee.png" alt="" />
          <div className="hero-ground" aria-hidden />

          <div className="hero-inner">
            <div className="brand">
              <img src="/bee.png" alt="" width={52} height={52} />
              <span className="brand-name">BritBee</span>
              <span className="beta-pill">Beta</span>
            </div>

            <h1 className="headline">English kids love to speak.</h1>
            <p className="lede">
              Daily practice, live classes, and a garden of rewards — so children grow confident in British English.
            </p>

            <div className="cta-row">
              <a className="btn-primary" href="#join">
                Start free beta
                <span aria-hidden>→</span>
              </a>
              <a className="btn-ghost" href={LINKS.appWeb}>
                Open the web app
              </a>
            </div>
          </div>
        </header>

        <section className="strip" aria-label="Product links">
          <div className="strip-inner">
            <a className="strip-link" href={LINKS.appWeb}>
              <span className="strip-label">Kids &amp; parents</span>
              <strong>Web app</strong>
            </a>
            <a className="strip-link" href="#apps">
              <span className="strip-label">Phone &amp; tablet</span>
              <strong>iOS &amp; Android</strong>
            </a>
            <a className="strip-link" href={LINKS.office}>
              <span className="strip-label">Mentors</span>
              <strong>BritBee Office</strong>
            </a>
            <a className="strip-link" href="#join">
              <span className="strip-label">New families</span>
              <strong>Join the waitlist</strong>
            </a>
          </div>
        </section>

        <section className="band band-speak" id="how">
          <div className="band-inner">
            <p className="kicker">Listen · Speak · Play</p>
            <h2>Short games. Real speaking.</h2>
            <p>
              Kids hear clear British English, say it back, and earn Buzz for every brave try — phonics, stories,
              vocabulary, and more.
            </p>
            <ol className="steps">
              <li>
                <span className="step-num">1</span>
                <div>
                  <strong>Hear it</strong>
                  <p>Natural British voices model the sound.</p>
                </div>
              </li>
              <li>
                <span className="step-num">2</span>
                <div>
                  <strong>Say it</strong>
                  <p>Speak back in short, playful rounds.</p>
                </div>
              </li>
              <li>
                <span className="step-num">3</span>
                <div>
                  <strong>Grow it</strong>
                  <p>Plant sprouts, boost the garden, pick Buzz.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="band band-play" id="family">
          <div className="band-inner">
            <p className="kicker">For families</p>
            <h2>Parents guide. Kids play.</h2>
            <p>
              Unlock the parent shell with a PIN — billing, progress, referrals, and calm oversight — without leaving
              the same BritBee app your child already loves.
            </p>
            <ul className="bullets">
              <li>See practice streaks and class reminders</li>
              <li>BritBee Pay with mentor-verified UPI</li>
              <li>Invite friends and earn Buzz + plan discounts</li>
            </ul>
            <div className="cta-row cta-row-tight">
              <a className="btn-primary" href={LINKS.appWeb}>
                Open parent &amp; kid app
              </a>
              <a className="btn-text" href="#apps">
                Prefer mobile? Get the store apps
              </a>
            </div>
          </div>
        </section>

        <section className="band band-grow" id="apps">
          <div className="band-inner">
            <p className="kicker">Get BritBee</p>
            <h2>Web today. Phones next.</h2>
            <p>
              Start instantly in the browser, then install on the devices your family already uses. Same account. Same
              hive.
            </p>

            <div className="store-grid">
              <a className="store-tile store-web" href={LINKS.appWeb}>
                <span className="store-eyebrow">Instant access</span>
                <strong>Open web app</strong>
                <span className="store-meta">app.britbee.buzz · no install</span>
              </a>
              <a
                className="store-tile"
                href={LINKS.playStore}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="store-eyebrow">Android</span>
                <strong>Google Play</strong>
                <span className="store-meta">Coming with beta invites</span>
              </a>
              <a
                className="store-tile"
                href={LINKS.appStore}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="store-eyebrow">iPhone &amp; iPad</span>
                <strong>App Store</strong>
                <span className="store-meta">Coming with beta invites</span>
              </a>
            </div>
            <p className="store-hint">
              Store listings unlock as beta capacity opens. Join the waitlist and we’ll send the download link with your
              invite.
            </p>
          </div>
        </section>

        <section className="band band-office" id="mentors">
          <div className="band-inner">
            <p className="kicker">For mentors</p>
            <h2>Run the hive from Office.</h2>
            <p>
              Book classes, buzz learners, review BritBee Pay proofs, manage referrals, and keep every family on track —
              in the mentor cockpit built for BritBee.
            </p>
            <div className="cta-row cta-row-tight">
              <a className="btn-primary btn-on-light" href={LINKS.office}>
                Open BritBee Office
              </a>
              <a className="btn-text" href={LINKS.appWeb}>
                Learners join from the app
              </a>
            </div>
          </div>
        </section>

        <section className="band band-proof">
          <div className="band-inner">
            <p className="kicker">Built as one product</p>
            <h2>App · Parent shell · Office · Live class</h2>
            <p>
              Not four disconnected tools — one API, one progress story, one brand. Kids practise. Parents steer.
              Mentors teach. Everyone stays in the same hive.
            </p>
            <div className="ecosystem">
              <a href={LINKS.appWeb}>Web app</a>
              <span aria-hidden>·</span>
              <a href="#apps">iOS / Android</a>
              <span aria-hidden>·</span>
              <a href={LINKS.office}>Office</a>
              <span aria-hidden>·</span>
              <a href="#join">Beta waitlist</a>
            </div>
          </div>
        </section>

        <section className="band band-join" id="join">
          <div className="band-inner">
            <p className="kicker">Private beta</p>
            <h2>Claim your family’s spot.</h2>
            <p>Limited invites while we scale the hive. Enter a parent email — we’ll send access when you’re next.</p>

            <form className="waitlist" onSubmit={onWaitlist}>
              <label className="sr-only" htmlFor="email">
                Parent email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Parent email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={sent}
              />
              <button className="btn-primary" type="submit" disabled={sent}>
                {sent ? "You’re on the list!" : "Join the beta"}
              </button>
            </form>
            <p className="note">
              {sent
                ? "We’ll buzz you with beta access for your family."
                : "No spam — just your invite. Already invited? Create your account now."}
            </p>
            <p className="note-link">
              <a href={signupWithEmail}>
                {sent ? "Create your family account →" : "Already have access? Open signup →"}
              </a>
            </p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <img src="/bee.png" alt="" width={40} height={40} />
          <div>
            <strong>BritBee</strong>
            <p>Practical English for kids — learn, speak, grow.</p>
          </div>
        </div>
        <div className="footer-cols">
          <div>
            <h3>Product</h3>
            <a href={LINKS.appWeb}>Web app</a>
            <a href="#apps">Download apps</a>
            <a href={LINKS.office}>Mentor Office</a>
            <a href={LINKS.appSignup}>Sign up</a>
            <a href="#join">Join beta</a>
          </div>
          <div>
            <h3>Explore</h3>
            <a href="#how">How it works</a>
            <a href="#family">For families</a>
            <a href="#mentors">For mentors</a>
            <a href={LINKS.site}>britbee.buzz</a>
          </div>
        </div>
        <p className="footer-copy">© {new Date().getFullYear()} BritBee. All rights reserved.</p>
      </footer>

      {showStickyCta ? (
        <div className="sticky-cta" role="region" aria-label="Join beta">
          <p>Ready for your family?</p>
          <a className="btn-primary" href="#join">
            Join free beta
          </a>
        </div>
      ) : null}
    </div>
  );
}
