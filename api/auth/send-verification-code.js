const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM_EMAIL = 'WardrobeForge <noreply@grahams.sk>';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim().toLowerCase());
const isValidVerificationCode = (value) => /^\d{6}$/.test(String(value || '').trim());

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();
  const fromEmail = String(process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL).trim();
  const email = String(request.body?.email || '').trim().toLowerCase();
  const verificationCode = String(request.body?.verificationCode || '').trim();

  if (!resendApiKey) {
    return response.status(500).json({ message: 'Email delivery is not configured yet.' });
  }

  if (!isValidEmail(email)) {
    return response.status(400).json({ message: 'Enter a valid email address.' });
  }

  if (!isValidVerificationCode(verificationCode)) {
    return response.status(400).json({ message: 'Invalid verification code.' });
  }

  const emailPayload = {
    from: fromEmail,
    to: [email],
    subject: 'Your WardrobeForge verification code',
    text: [
      'Your WardrobeForge verification code is:',
      verificationCode,
      '',
      'This code expires when you request a new one.',
    ].join('\n'),
    html: [
      '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">',
      '<h2 style="margin:0 0 16px">WardrobeForge verification code</h2>',
      `<p style="margin:0 0 12px">Use this code to finish creating your account:</p>`,
      `<p style="margin:0 0 20px;font-size:32px;font-weight:700;letter-spacing:0.18em">${verificationCode}</p>`,
      '<p style="margin:0;color:#4b5563">This code expires when you request a new one.</p>',
      '</div>',
    ].join(''),
  };

  try {
    const resendResponse = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const resendBody = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      return response.status(resendResponse.status).json({
        message: resendBody?.message || resendBody?.error || 'Resend could not send the email.',
      });
    }

    return response.status(200).json({
      delivery: 'email',
      id: resendBody?.id || null,
    });
  } catch (error) {
    return response.status(502).json({ message: 'Could not reach the email delivery provider.' });
  }
}
