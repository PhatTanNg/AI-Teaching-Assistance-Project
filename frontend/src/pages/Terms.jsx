const Terms = () => {
  return (
    <div className="legal-page">
      <div className="legal-page__header">
        <h1 className="legal-page__title">Terms of Service</h1>
        <span className="legal-page__meta">Last updated: March 2026</span>
      </div>

      <section className="legal-section">
        <h2 className="legal-section__heading">1. Acceptance</h2>
        <p className="legal-section__body">
          By creating an account and using AITA, you agree to these terms. This is a student-built educational tool
          provided as-is, free of charge, for academic purposes.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="legal-section__heading">2. Acceptable use</h2>
        <p className="legal-section__body">
          You may use AITA to record, transcribe, and study lecture content for personal educational purposes.
          You must not upload content you do not have permission to record, attempt to reverse-engineer the service,
          or use the platform for any unlawful purpose.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="legal-section__heading">3. Your content</h2>
        <p className="legal-section__body">
          You retain ownership of all content you create. By uploading content, you grant AITA permission to process
          it (via AI services) solely to provide the features you have requested.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="legal-section__heading">4. Service availability</h2>
        <p className="legal-section__body">
          AITA is a student project and may experience downtime. We do not guarantee uptime or data durability.
          Keep personal backups of important lecture notes.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="legal-section__heading">5. Limitation of liability</h2>
        <p className="legal-section__body">
          AITA is provided &ldquo;as is&rdquo; without warranties of any kind. The project team is not liable for any loss of data
          or damages arising from use of the service.
        </p>
      </section>

      <section className="legal-section">
        <h2 className="legal-section__heading">6. Changes</h2>
        <p className="legal-section__body">
          These terms may be updated as the project develops. Continued use of the service after changes constitutes
          acceptance of the new terms.
        </p>
      </section>
    </div>
  );
};

export default Terms;
