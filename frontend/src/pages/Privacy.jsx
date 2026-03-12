const Privacy = () => {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Last updated: March 2026
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>1. What we collect</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          We collect the information you provide when creating an account (username, email, display name, date of birth),
          and the content you create within the app (lecture transcripts, keywords, summaries, flashcard and quiz activity).
          We do not sell your data to third parties.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>2. How we use it</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Your data is used solely to provide the AITA service: transcribing lectures, generating summaries and keywords,
          and tracking your revision progress. AI processing (transcription, summarisation) is performed via third-party
          APIs (OpenAI Whisper, GPT) under their respective privacy terms.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>3. Data retention</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Your data is retained for as long as your account is active. You can permanently delete your account and all
          associated data at any time from your Profile settings. Deleted data cannot be recovered.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>4. Cookies & storage</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          We use localStorage to store your authentication token and preferences (language, theme). A secure httpOnly cookie
          is used for session management. We do not use advertising or tracking cookies.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>5. Your rights</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          You have the right to access, correct, or delete your personal data at any time. Use the Profile settings page
          to update your information or delete your account entirely.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>6. Contact</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          This app is a final-year student project. For questions about your data, please contact the project team.
        </p>
      </section>
    </div>
  );
};

export default Privacy;
