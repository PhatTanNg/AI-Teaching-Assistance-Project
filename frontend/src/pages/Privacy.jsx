const Privacy = () => {
  return (
    <div className="legal-page">
      <div className="legal-page__header">
        <h1 className="legal-page__title">Privacy Policy</h1>
        <span className="legal-page__meta">Last updated: March 2026</span>
      </div>

      <section className="legal-section">
        <h2 className="legal-section__heading">1. What we collect</h2>
        <p className="legal-section__body">
          We collect the information you provide when creating an account (username, email, display name, date of birth),
          and the content you create within the app (lecture transcripts, keywords, summaries, flashcard and quiz activity).
          We do not sell your data to third parties.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="legal-section__heading">2. How we use it</h2>
        <p className="legal-section__body">
          Your data is used solely to provide the AITA service: transcribing lectures, generating summaries and keywords,
          and tracking your revision progress. AI processing (transcription, summarisation) is performed via third-party
          APIs (OpenAI Whisper, GPT) under their respective privacy terms.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="legal-section__heading">3. Data retention</h2>
        <p className="legal-section__body">
          Your data is retained for as long as your account is active. You can permanently delete your account and all
          associated data at any time from your Profile settings. Deleted data cannot be recovered.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="legal-section__heading">4. Cookies &amp; storage</h2>
        <p className="legal-section__body">
          We use localStorage to store your authentication token and preferences (language, theme). A secure httpOnly cookie
          is used for session management. We do not use advertising or tracking cookies.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="legal-section__heading">5. Your rights</h2>
        <p className="legal-section__body">
          You have the right to access, correct, or delete your personal data at any time. Use the Profile settings page
          to update your information or delete your account entirely.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="legal-section__heading">6. Contact</h2>
        <p className="legal-section__body">
          This app is a final-year student project. For questions about your data, please contact the project team.
        </p>
      </section>
    </div>
  );
};

export default Privacy;
