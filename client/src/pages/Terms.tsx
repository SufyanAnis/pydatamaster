import { Link } from "react-router-dom";
import { useSite, usePageTitle } from "../context/SiteContext";
import { LegalPage, LegalSection } from "../components/public";

const UPDATED = "January 2025";
const SECTIONS = ["Agreement to Terms", "Educational Disclaimer", "Use License", "Accounts", "Limitations"];

export default function Terms() {
  usePageTitle("Terms of Service");
  const { settings } = useSite();
  const email = settings?.contactEmail;

  return (
    <LegalPage eyebrow="Legal" title="Terms of Service" subtitle="The ground rules for using the platform, its lessons, playground and community features." updated={UPDATED} sections={SECTIONS}>
      <LegalSection number={1} title="Agreement to Terms">
        <p>By accessing our website at PyDataMaster, you agree to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>
        <p>If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
      </LegalSection>

      <LegalSection number={2} title="Educational Disclaimer">
        <p>The materials on PyDataMaster's website are provided for educational purposes only. While we strive for accuracy, the software libraries (Pandas, NumPy, Matplotlib) are subject to change. We make no warranties, expressed or implied, regarding the accuracy or reliability of the code examples provided.</p>
        <p>Always review and test code before using it in production systems or with real-world data.</p>
      </LegalSection>

      <LegalSection number={3} title="Use License">
        <p>Permission is granted to temporarily download one copy of the materials (information or software) on PyDataMaster's website for personal, non-commercial transitory viewing only.</p>
        <p>This is the grant of a license, not a transfer of title, and under this license you may not:</p>
        <ul>
          <li>modify or copy the materials for redistribution;</li>
          <li>use the materials for any commercial purpose or public display without written permission;</li>
          <li>remove any copyright or other proprietary notations from the materials;</li>
          <li>mirror the materials on any other server.</li>
        </ul>
      </LegalSection>

      <LegalSection number={4} title="Accounts">
        <p>Creating a learner profile is optional and free. If you create one, you are responsible for keeping your login credentials safe and for all activity that happens under your account. Please choose a strong password and let us know immediately if you believe your account has been compromised.</p>
        <p>We may suspend or remove accounts that abuse the platform - for example by attempting to disrupt the service, harvesting data, harassing other learners or gaming the leaderboard.</p>
      </LegalSection>

      <LegalSection number={5} title="Limitations">
        <p>In no event shall PyDataMaster or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on PyDataMaster's website.</p>
        <p>
          Questions about these terms? Reach us{" "}
          {email ? (
            <>
              at <a href={`mailto:${email}`}>{email}</a> or
            </>
          ) : null}{" "}
          through the <Link to="/contact">contact page</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
