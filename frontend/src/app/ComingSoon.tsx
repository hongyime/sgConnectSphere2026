// Standard page for a route whose screen isn't built yet. It names the story
// so anyone who lands here knows what will appear and where it's tracked.
import { Link } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import './comingSoon.css';

export function ComingSoon({ story, title, summary }: { story: string; title: string; summary: string }) {
  return (
    <main className="coming-soon-page">
      <header className="page-heading">
        <p className="eyebrow">Coming soon · {story}</p>
        <h1>{title}</h1>
      </header>
      <section className="card coming-soon-card" aria-label="About this page">
        <span className="coming-soon-icon" aria-hidden="true"><Hammer size={22} /></span>
        <p>{summary}</p>
        <p className="coming-soon-note">This screen is planned for story {story} and isn&apos;t available yet.</p>
        <div><Link to="/home" className="secondary-action">Back to my home page</Link></div>
      </section>
    </main>
  );
}
