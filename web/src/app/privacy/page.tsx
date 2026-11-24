import Link from "next/link";

const sections = [
  ["1. Information We Collect", "We collect information you provide directly, including your email address and name when you create an account. We also collect URLs you submit for recipe extraction and recipes you choose to save. We do not collect or store the full content of third-party websites."],
  ["2. How We Use Your Information", "We use your information to: provide and maintain the App, process recipe extraction requests, store your saved recipes, manage your subscription, and improve our services. We do not sell your personal information to third parties."],
  ["3. Authentication", "We use WorkOS for authentication. When you sign in, your authentication is handled securely through their service. We store a minimal user profile (name, email, avatar URL) to identify your account."],
  ["4. Data Storage", "Your account information and saved recipes are stored in our secure database. Recipe data includes titles, ingredients, steps, and source URLs. We retain this data for as long as your account is active."],
  ["5. Third-Party Services", "The App uses the following third-party services that may collect information: WorkOS (authentication), OpenAI (recipe extraction processing), Stripe (payment processing for web subscriptions), and Apple/Google (in-app purchase processing on mobile). Each service is governed by its own privacy policy."],
  ["6. Cookies & Analytics", "The web version of the App may use essential cookies for authentication and session management. We do not use third-party tracking cookies or advertising trackers."],
  ["7. Data Security", "We implement reasonable security measures to protect your information, including encrypted connections (HTTPS), secure authentication tokens, and parameterized database queries. However, no method of transmission over the internet is 100% secure."],
  ["8. Your Rights", "You may request access to, correction of, or deletion of your personal data at any time by contacting us. Deleting your account will remove your saved recipes and personal information from our systems."],
  ["9. Children's Privacy", "The App is not directed at children under 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it."],
  ["10. Changes to This Policy", "We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy in the App. Your continued use of the App after changes constitutes acceptance of the updated policy."],
  ["11. Contact", "If you have questions about this Privacy Policy or your personal data, please contact us through the App or our website."],
];

export default function PrivacyPage() {
  return <main className="page-shell legal"><div className="page-toolbar"><Link className="back-link" href="/">← Back to recipes</Link></div><h1 className="page-title">Privacy Policy</h1><p>Last updated: March 20, 2026</p>{sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}</main>;
}
