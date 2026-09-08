import { useRef, useState } from 'react';

const initialValues = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: ''
};

const allowedFileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const maxFileSize = 10 * 1024 * 1024;
const features = [
  ['↯', 'Fast response', 'We keep communication clear and timely.'],
  ['◈', 'Secure handling', 'Your details stay protected from start to finish.'],
  ['◎', 'Human support', 'Real people are ready to understand your needs.'],
  ['↔', 'Flexible process', 'Share a brief or a document in the way that suits you.'],
  ['✓', 'Careful delivery', 'Every request is reviewed with attention to detail.'],
  ['∞', 'Long-term focus', 'We build thoughtful solutions that keep working.']
];

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Please enter your name.';
  else if (!/^[A-Z][A-Za-z]*(?:[ '-][A-Za-z]+)*$/.test(values.name.trim())) errors.name = 'Name must start with an uppercase letter.';
  if (!values.email.trim()) {
    errors.email = 'Please enter your email.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!values.phone.trim()) {
    errors.phone = 'Please enter your phone number.';
  } else if (!/^\d{10}$/.test(values.phone.trim())) {
    errors.phone = 'Phone number must contain exactly 10 digits.';
  }
  if (!values.subject.trim()) errors.subject = 'Please enter a subject.';
  if (!values.message.trim()) errors.message = 'Please enter a message.';
  return errors;
}

export default function App() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [documentFile, setDocumentFile] = useState(null);
  const documentInputRef = useRef(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValue = name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setValues((current) => ({ ...current, [name]: nextValue }));
    setErrors((current) => ({ ...current, [name]: '' }));
    if (status.type) setStatus({ type: '', message: '' });
  }

  function setSelectedFile(file) {
    if (!file) {
      setDocumentFile(null);
      setErrors((current) => ({ ...current, document: '' }));
      return;
    }
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedFileExtensions.includes(extension)) {
      setDocumentFile(null);
      setErrors((current) => ({ ...current, document: 'Please upload a PDF, DOC, DOCX, XLS, or XLSX file.' }));
      if (documentInputRef.current) documentInputRef.current.value = '';
    } else if (file.size > maxFileSize) {
      setDocumentFile(null);
      setErrors((current) => ({ ...current, document: 'Document size must be 10MB or less.' }));
      if (documentInputRef.current) documentInputRef.current.value = '';
    } else {
      setDocumentFile(file);
      setErrors((current) => ({ ...current, document: '' }));
    }
  }

  function handleFileChange(event) {
    setSelectedFile(event.target.files[0] || null);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    setSelectedFile(event.dataTransfer.files[0] || null);
  }

  function removeSelectedFile() {
    setDocumentFile(null);
    setErrors((current) => ({ ...current, document: '' }));
    if (documentInputRef.current) documentInputRef.current.value = '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setStatus({ type: '', message: '' });
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    const submissionToken = crypto.randomUUID();
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => formData.append(key, value));
      formData.append('submissionToken', submissionToken);
      if (documentFile) formData.append('document', documentFile);

      const response = await fetch('/api/submit-form', {
        method: 'POST',
        body: formData
      });
      const responseText = await response.text();
      let result = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error('The submission service returned an invalid response. Please try again.');
      }
      if (!response.ok) throw new Error(result.error || 'Failed to submit the form. Please try again.');

      setStatus({ type: 'success', message: 'Form submitted successfully!' });
      setValues(initialValues);
      setDocumentFile(null);
      if (documentInputRef.current) documentInputRef.current.value = '';
    } catch (error) {
      const message = error instanceof TypeError
        ? 'Unable to connect to the submission service. Please try again.'
        : error.message || 'Failed to submit the form. Please try again.';
      setStatus({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="form-card" aria-labelledby="form-title">
        <div className="intro">
          <p className="eyebrow">GET IN TOUCH</p>
          <h1 id="form-title">Let&apos;s start a conversation.</h1>
          <p className="subtitle">Tell us a little about what you need. We&apos;ll get back to you soon.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field-grid">
            <Field label="Name" icon="✦" name="name" value={values.name} onChange={handleChange} error={errors.name} />
            <Field label="Email" icon="@" name="email" type="email" value={values.email} onChange={handleChange} error={errors.email} />
            <Field label="Phone" icon="+" name="phone" type="tel" inputMode="numeric" maxLength="10" value={values.phone} onChange={handleChange} error={errors.phone} />
            <Field label="Subject" icon="↗" name="subject" value={values.subject} onChange={handleChange} error={errors.subject} />
          </div>
          <div className="field full-width message-field">
            <div className="field-heading">
              <label htmlFor="field-message">Message</label>
              <span className="character-count">{values.message.length}/1000</span>
            </div>
            <textarea id="field-message" name="message" value={values.message} onChange={handleChange} maxLength="1000" rows="5" aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'field-message-error' : undefined} />
            {errors.message && <p className="field-error" id="field-message-error">{errors.message}</p>}
          </div>

          <div className="field full-width">
            <label htmlFor="field-document">Document (optional)</label>
            <div className={`upload-zone ${isDragging ? 'is-dragging' : ''} ${errors.document ? 'has-error' : ''}`} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
              <input ref={documentInputRef} id="field-document" name="document" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileChange} aria-invalid={Boolean(errors.document)} aria-describedby={errors.document ? 'field-document-error' : undefined} />
              <label className="upload-label" htmlFor="field-document">
                <span className="upload-icon" aria-hidden="true">↑</span>
                <span><strong>Choose a file</strong> or drag it here</span>
                <small>PDF, DOC, DOCX, XLS or XLSX · max 10MB</small>
              </label>
            </div>
            {documentFile && <div className="selected-file"><span className="file-type" aria-hidden="true">FILE</span><span className="file-name">{documentFile.name}</span><button type="button" className="remove-file" onClick={removeSelectedFile} aria-label={`Remove ${documentFile.name}`}>Remove</button></div>}
            {errors.document && <p className="field-error" id="field-document-error">{errors.document}</p>}
          </div>

          {status.message && <p className={`status ${status.type}`} role="status">{status.message}</p>}
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send message'}
          </button>
        </form>

        <section className="features" aria-labelledby="features-title">
          <div className="features-heading">
            <p className="eyebrow">WHY WORK WITH US</p>
            <h2 id="features-title">Thoughtful from the first message.</h2>
          </div>
          <div className="feature-grid">
            {features.map(([icon, title, description]) => (
              <article className="feature-item" key={title}>
                <span className="feature-icon" aria-hidden="true">{icon}</span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function Field({ label, icon, name, type = 'text', inputMode, maxLength, value, onChange, error, textarea = false }) {
  const id = `field-${name}`;
  const commonProps = { id, name, value, onChange, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined };
  return (
    <div className={`field ${textarea ? 'full-width' : ''}`}>
      <label htmlFor={id}><span className="field-icon" aria-hidden="true">{icon}</span>{label}</label>
      {textarea ? <textarea {...commonProps} rows="5" /> : <input {...commonProps} type={type} inputMode={inputMode} maxLength={maxLength} />}
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
