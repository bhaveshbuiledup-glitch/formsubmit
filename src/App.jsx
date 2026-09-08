import { useState } from 'react';

const initialValues = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: ''
};

const allowedFileExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const maxFileSize = 10 * 1024 * 1024;

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
  } else if (!/^\d{1,19}$/.test(values.phone.trim())) {
    errors.phone = 'Phone number must contain only digits and a maximum of 19 digits.';
  }
  if (!values.subject.trim()) errors.subject = 'Please enter a subject.';
  if (!values.message.trim()) errors.message = 'Please enter a message.';
  return errors;
}

export default function App() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [documentFile, setDocumentFile] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValue = name === 'phone' ? value.replace(/\D/g, '').slice(0, 19) : value;
    setValues((current) => ({ ...current, [name]: nextValue }));
    setErrors((current) => ({ ...current, [name]: '' }));
    if (status.type) setStatus({ type: '', message: '' });
  }

  function handleFileChange(event) {
    const file = event.target.files[0] || null;
    if (!file) {
      setDocumentFile(null);
      setErrors((current) => ({ ...current, document: '' }));
      return;
    }
    const extension = file.name.split('.').pop().toLowerCase();
    if (!allowedFileExtensions.includes(extension)) {
      setDocumentFile(null);
      setErrors((current) => ({ ...current, document: 'Please upload a PDF, DOC, DOCX, XLS, or XLSX file.' }));
      event.target.value = '';
    } else if (file.size > maxFileSize) {
      setDocumentFile(null);
      setErrors((current) => ({ ...current, document: 'Document size must be 10MB or less.' }));
      event.target.value = '';
    } else {
      setDocumentFile(file);
      setErrors((current) => ({ ...current, document: '' }));
    }
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
            <Field label="Name" name="name" value={values.name} onChange={handleChange} error={errors.name} />
            <Field label="Email" name="email" type="email" value={values.email} onChange={handleChange} error={errors.email} />
            <Field label="Phone" name="phone" type="tel" inputMode="numeric" maxLength="19" value={values.phone} onChange={handleChange} error={errors.phone} />
            <Field label="Subject" name="subject" value={values.subject} onChange={handleChange} error={errors.subject} />
          </div>
          <Field label="Message" name="message" value={values.message} onChange={handleChange} error={errors.message} textarea />

          <div className="field full-width">
            <label htmlFor="field-document">Document (optional)</label>
            <input id="field-document" name="document" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileChange} aria-invalid={Boolean(errors.document)} aria-describedby={errors.document ? 'field-document-error' : undefined} />
            {documentFile && <p className="file-name">{documentFile.name}</p>}
            {errors.document && <p className="field-error" id="field-document-error">{errors.document}</p>}
          </div>

          {status.message && <p className={`status ${status.type}`} role="status">{status.message}</p>}
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send message'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({ label, name, type = 'text', inputMode, maxLength, value, onChange, error, textarea = false }) {
  const id = `field-${name}`;
  const commonProps = { id, name, value, onChange, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined };
  return (
    <div className={`field ${textarea ? 'full-width' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {textarea ? <textarea {...commonProps} rows="5" /> : <input {...commonProps} type={type} inputMode={inputMode} maxLength={maxLength} />}
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
