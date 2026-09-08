import { useState } from 'react';

const initialValues = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: ''
};

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
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    if (status.type) setStatus({ type: '', message: '' });
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
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, submissionToken })
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
            <Field label="Phone" name="phone" type="tel" value={values.phone} onChange={handleChange} error={errors.phone} />
            <Field label="Subject" name="subject" value={values.subject} onChange={handleChange} error={errors.subject} />
          </div>
          <Field label="Message" name="message" value={values.message} onChange={handleChange} error={errors.message} textarea />

          {status.message && <p className={`status ${status.type}`} role="status">{status.message}</p>}
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send message'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({ label, name, type = 'text', value, onChange, error, textarea = false }) {
  const id = `field-${name}`;
  const commonProps = { id, name, value, onChange, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined };
  return (
    <div className={`field ${textarea ? 'full-width' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {textarea ? <textarea {...commonProps} rows="5" /> : <input {...commonProps} type={type} />}
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
