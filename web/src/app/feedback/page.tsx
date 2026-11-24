"use client";

import { useState } from "react";
import Link from "next/link";
import { post } from "@/lib/api";

export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    setError("");
    try { await post("/api/v1/feedback/send", { message: message.trim() }); setSent(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not send feedback."); }
    finally { setBusy(false); }
  }

  return <main className="page-shell"><div className="page-toolbar"><Link className="back-link" href="/">← Back to recipes</Link></div>
    {sent ? <><h1 className="page-title">Thanks for the feedback.</h1><p className="lead">We appreciate you helping us improve.</p><Link className="button" href="/">Back home</Link></> :
      <><h1 className="page-title">Tell us what’s up.</h1><p className="lead">A bug, a request, or just a hello? We’d love to hear it.</p>
        <form onSubmit={submit} className="stack"><div><label className="field-label" htmlFor="feedback">Your feedback</label><textarea className="form-control" id="feedback" rows={8} required maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} /><p className="muted">{message.length}/5000</p></div>
          {error && <p className="error" role="alert">{error}</p>}<button className="button" disabled={busy || !message.trim()}>{busy ? "Sending…" : "Send feedback"}</button></form></>}
  </main>;
}
