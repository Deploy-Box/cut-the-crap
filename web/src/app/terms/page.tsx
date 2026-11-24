import Link from "next/link";

const sections = [
  ["1. Acceptance of Terms", "By accessing or using Cut The Crap (\"the App\"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App."],
  ["2. Description of Service", "Cut The Crap is a recipe extraction tool that allows you to paste a URL from a recipe website and receive a simplified version of the recipe without extraneous content. The App may also allow you to save and organize extracted recipes."],
  ["3. User Accounts", "Some features require you to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to provide accurate information and to update it as necessary."],
  ["4. Subscriptions & Payments", "Cut The Crap offers both free and paid tiers. Paid subscriptions are billed through your platform's payment provider (Apple App Store, Google Play, or Stripe for web). Subscriptions automatically renew unless cancelled before the end of the current billing period. Refunds are handled according to the policies of the respective platform."],
  ["5. Acceptable Use", "You agree not to misuse the App, including but not limited to: attempting to bypass usage limits, scraping or redistributing extracted content in bulk, reverse-engineering the App, or using the App for any unlawful purpose."],
  ["6. Intellectual Property", "The App and its original content, features, and functionality are owned by Cut The Crap and are protected by copyright and other intellectual property laws. Recipes extracted through the App remain the intellectual property of their respective authors and websites."],
  ["7. Disclaimer of Warranties", "The App is provided \"as is\" without warranties of any kind, express or implied. We do not guarantee that recipe extraction will be accurate, complete, or error-free. Always verify ingredients and instructions, especially for allergens and dietary restrictions."],
  ["8. Limitation of Liability", "To the fullest extent permitted by law, Cut The Crap shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App."],
  ["9. Changes to Terms", "We reserve the right to modify these Terms at any time. Continued use of the App after changes constitutes acceptance of the updated Terms. We will make reasonable efforts to notify users of significant changes."],
  ["10. Contact", "If you have questions about these Terms, please contact us through the App or our website."],
];

export default function TermsPage() {
  return <main className="page-shell legal"><div className="page-toolbar"><Link className="back-link" href="/">← Back to recipes</Link></div><h1 className="page-title">Terms of Service</h1><p>Last updated: March 20, 2026</p>{sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}</main>;
}
