const Terms = () => {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Terms of Service</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Last updated: March 2026
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>1. Acceptance</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          By creating an account and using AITA, you agree to these terms. This is a student-built educational tool
          provided as-is, free of charge, for academic purposes.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>2. Acceptable use</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          You may use AITA to record, transcribe, and study lecture content for personal educational purposes.
          You must not upload content you do not have permission to record, attempt to reverse-engineer the service,
          or use the platform for any unlawful purpose.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>3. Your content</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          You retain ownership of all content you create. By uploading content, you grant AITA permission to process
          it (via AI services) solely to provide the features you have requested.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>4. Service availability</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          AITA is a student project and may experience downtime. We do not guarantee uptime or data durability.
          Keep personal backups of important lecture notes.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>5. Limitation of liability</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          AITA is provided "as is" without warranties of any kind. The project team is not liable for any loss of data
          or damages arising from use of the service.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>6. Changes</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          These terms may be updated as the project develops. Continued use of the service after changes constitutes
          acceptance of the new terms.
        </p>
      </section>
    </div>
  );
};

export default Terms;
