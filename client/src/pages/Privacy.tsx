import { Link } from "react-router-dom";
import { useSite, usePageTitle } from "../context/SiteContext";
import { LegalPage, LegalSection } from "../components/public";

const UPDATED = "January 2025";
const SECTIONS = ["Introduction", "Data We Collect", "Cookies & AdSense", "AI Tutor", "Contact Us"];

export default function Privacy() {
  usePageTitle("Privacy Policy");
  const { settings, siteName } = useSite();
  const email = settings?.contactEmail;

  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy" subtitle="How we collect, use and protect your data when you learn with us." updated={UPDATED} sections={SECTIONS}>
      <LegalSection number={1} title="Introduction">
        <p>Welcome to PyDataMaster. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights.</p>
      </LegalSection>

      <LegalSection number={2} title="Data We Collect">
        <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
        <ul>
          <li>
            <strong>Technical Data</strong> - includes your IP address, browser type and version, time zone setting, operating system and the other technology on the devices you use to access this website.
          </li>
          <li>
            <strong>Usage Data</strong> - includes information about how you use our website, such as the pages you visit, the lessons you open and the code you run in the interactive playground.
          </li>
          <li>
            <strong>Account Data</strong> - if you create a learner profile we store your name, email address and learning progress (completed lessons, quiz results, XP, streaks and badges) so that it can be synced across your devices.
          </li>
        </ul>
        <p>We only collect the data we need to run the platform, keep it secure and improve the learning experience. We never sell your personal data.</p>
      </LegalSection>

      <LegalSection number={3} title="Cookies and Google AdSense">
        <p>We use a small number of cookies and similar technologies: a session cookie that keeps you logged in, and local preferences such as your chosen theme and dismissed announcements. These are essential for the site to function and are not used to track you across other websites.</p>
        <p>
          We use Google AdSense to display ads on some pages. Google, as a third-party vendor, uses cookies to serve ads based on your prior visits to this and other websites. You may opt out of personalized advertising at any time by visiting{" "}
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer">
            Google Ads Settings
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection number={4} title="AI Tutor">
        <p>Questions you send to the AI tutor may be processed by a third-party AI provider to generate answers. Along with your question we send limited context - such as the title of the lesson you are viewing and the code you are working on - so the tutor can give relevant help.</p>
        <p>Please do not include passwords, personal identifiers or other sensitive information in tutor conversations. We may retain tutor conversations to monitor quality and improve the curriculum.</p>
      </LegalSection>

      <LegalSection number={5} title="Contact Us">
        <p>
          If you have any questions about this privacy policy or how {siteName} handles your data, please contact us{" "}
          {email ? (
            <>
              at <a href={`mailto:${email}`}>{email}</a> or
            </>
          ) : null}{" "}
          through our <Link to="/contact">contact page</Link>. We will respond as soon as we can.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
