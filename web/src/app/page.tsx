"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

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
        <h1>Just the recipe.<br /><em>None of the crap.</em></h1>
        <form onSubmit={submit} className="url-form">
          <label htmlFor="recipe-url">Recipe URL</label>
          <div className="url-field">
            <input id="recipe-url" type="url" required placeholder="https://example.com/your-favorite-recipe" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} />
            <button type="submit" className="button">Get recipe <span aria-hidden="true">↗</span></button>
          </div>
          {error && <p className="error" role="alert">{getFriendlyErrorMessage(error)}</p>}
        </form>
        <p className="disclaimer">Cut The Crap can make mistakes. Check ingredients and instructions before cooking.</p>
      </div>
    </main>
  );
}
