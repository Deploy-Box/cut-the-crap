"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function CheckoutStatus() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") !== "success") return;
    let cancelled = false;
    function cleanUrl() {
      if (cancelled) return;
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    async function check() {
      try {
        for (let i = 0; i < 5 && !cancelled; i++) {
          const result = await api<{ entitlements: Record<string, { status: string }> }>("/api/v1/me/entitlements");
          if (cancelled) return;
          if (result.entitlements.pro?.status === "active") {
            setMessage("Your Pro subscription is active.");
            cleanUrl();
            return;
          }
          setMessage("Checkout completed. Your subscription is being activated.");
          if (i < 4) await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        cleanUrl();
      } catch {
        if (!cancelled) {
          setMessage("Checkout completed, but we couldn't check your subscription. Please try again later.");
          cleanUrl();
        }
      }
    }
    void check();
    return () => { cancelled = true; };
  }, []);

  return message ? <p className="notice" role="status">{message}</p> : null;
}
