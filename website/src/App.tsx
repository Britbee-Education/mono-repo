import { useState, type FormEvent } from "react";
import "./index.css";

export default function App() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function onWaitlist(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-sky" aria-hidden />
        <img className="hero-bee" src="/bee.png" alt="" />
        <div className="hero-ground" aria-hidden />

        <div className="hero-inner">
          <div className="brand">
            <img src="/bee.png" alt="" width={48} height={48} />
            <span className="brand-name">BritBee</span>
            <span className="beta-pill">Beta</span>
          </div>

          <h1 className="headline">English kids love to speak.</h1>
          <p className="lede">
            Daily practice, live classes, and a garden of rewards — so children grow confident in British English.
            Private beta is open for early families.
          </p>

          <div className="cta-row">
            <a className="btn-primary" href="#join">
              Start the buzz
              <span aria-hidden>→</span>
            </a>
            <a className="btn-ghost" href="#how">
              See how it works
            </a>
          </div>
        </div>
      </header>

      <section className="band band-speak" id="how">
        <div className="band-inner">
          <p className="kicker">Listen · Speak · Play</p>
          <h2>Short games. Real speaking.</h2>
          <p>
            Kids hear clear British English, say it back, and earn Buzz for every brave try — phonics, stories, and more.
          </p>
          <div className="band-visual visual-speak" role="img" aria-label="Kids practising speaking with BritBee" />
        </div>
      </section>

      <section className="band band-play">
        <div className="band-inner">
          <p className="kicker">Grow together</p>
          <h2>A garden that grows with them.</h2>
          <p>
            Plant daily sprouts, add helper worms from class, and pick Buzz from My Garden — learning that feels like play.
          </p>
          <div className="band-visual visual-play" role="img" aria-label="BritBee garden rewards" />
        </div>
      </section>

      <section className="band band-grow" id="join">
        <div className="band-inner">
          <p className="kicker">For families</p>
          <h2>Ready when you are.</h2>
          <p>
            Parents guide from the app. Mentors run live classes. One hive — so your child never learns alone.
          </p>

          <form className="waitlist" onSubmit={onWaitlist}>
            <label className="sr-only" htmlFor="email">
              Email
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
              : "Limited beta spots — no spam, just your invite."}
          </p>
        </div>
      </section>

      <footer className="footer">
        <strong>BritBee</strong> · Practical English for kids
      </footer>
    </div>
  );
}
