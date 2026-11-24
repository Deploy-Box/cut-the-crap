"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"checking" | "healthy" | "unreachable">("checking");

  useEffect(() => {
    api("/api/health").then(() => setStatus("healthy")).catch(() => setStatus("unreachable"));
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const parsed = new URL(url.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      router.push(`/result?url=${encodeURIComponent(parsed.href)}`);
    } catch {
      setError("Please enter a valid HTTP or HTTPS recipe URL.");
    }
  }

  return (
    <main className="home">
      <div className="home-inner">
        <p className="eyebrow"><span className="eyebrow-line" /> A SHORTCUT TO THE GOOD PART</p>
        <h1>Just the recipe.<br /><em>None of the crap.</em></h1>
        <p className="home-description">Skip the life stories, ads, and pop-ups. Paste a recipe link and get straight to cooking.</p>
        <form onSubmit={submit} className="url-form">
          <label htmlFor="recipe-url">Recipe URL</label>
          <div className="url-field">
            <input id="recipe-url" type="url" required placeholder="https://example.com/your-favorite-recipe" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} />
            <button type="submit" className="button">Get recipe <span aria-hidden="true">↗</span></button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </form>
        <p className="disclaimer">Cut The Crap can make mistakes. Check ingredients and instructions before cooking.</p>
      </div>
      <div className="home-bottom"><span>MADE FOR HUNGRY PEOPLE</span><span className="status"><i className={`dot ${status}`} />{status === "checking" ? "Checking connection" : status === "healthy" ? "Extraction API connected" : "Extraction API unreachable"}</span></div>
    </main>
  );
}
