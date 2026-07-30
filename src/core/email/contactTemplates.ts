interface EmailBrand {
  name: string;
  logoUrl?: string;
  frontendUrl?: string;
  supportEmail?: string;
  contactEmail?: string;
}

interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]!);
}

function layout(
  brand: EmailBrand,
  title: string,
  preheader: string,
  content: string
): string {
  const safeBrand = escapeHtml(brand.name);
  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${safeBrand}" width="112" style="display:block;border:0;max-width:112px;height:auto">`
    : `<div style="font-size:17px;line-height:1.3;font-weight:600;letter-spacing:0;color:#111827">${safeBrand}</div>`;
  const supportEmail = brand.contactEmail ?? brand.supportEmail;
  const support = supportEmail
    ? `Besoin d'aide ? <a href="mailto:${escapeHtml(supportEmail)}" style="color:#2563eb;text-decoration:none">${escapeHtml(supportEmail)}</a>`
    : 'Cet email a ete envoye automatiquement.';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f9;padding:32px 14px">
<tr>
  <td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
      <tr>
        <td style="padding:30px 34px 12px">
          ${logo}
        </td>
      </tr>
      <tr>
        <td style="padding:18px 34px 34px">
          <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;font-weight:500;letter-spacing:0;color:#111827">${escapeHtml(title)}</h1>
          ${content}
        </td>
      </tr>
      <tr>
        <td style="padding:22px 34px;background:#fafafa;border-top:1px solid #eeeeee;font-size:12px;line-height:1.65;color:#6b7280">
          <div style="margin-bottom:6px">${support}</div>
          <div>&copy; ${new Date().getUTCFullYear()} ${safeBrand}. Tous droits reserves.</div>
        </td>
      </tr>
    </table>
  </td>
</tr>
</table>
</body>
</html>`;
}

export function renderContactNotificationEmail(
  brand: EmailBrand,
  input: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }
): RenderedEmail {
  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.email);
  const safeSubject = escapeHtml(input.subject);
  const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br>');
  const content = `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#1d1d1f">Un visiteur a envoye un message depuis le formulaire de contact.</p>
    <div style="margin:0 0 24px;padding:20px;background-color:#f5f5f7;border-radius:12px">
      <div style="margin-bottom:10px;font-size:14px;color:#1d1d1f"><strong>Nom :</strong> ${safeName}</div>
      <div style="margin-bottom:10px;font-size:14px;color:#1d1d1f"><strong>Email :</strong> <a href="mailto:${safeEmail}" style="color:#0066cc;text-decoration:none">${safeEmail}</a></div>
      <div style="font-size:14px;color:#1d1d1f"><strong>Sujet :</strong> ${safeSubject}</div>
    </div>
    <div style="font-size:15px;line-height:1.6;color:#1d1d1f">${safeMessage}</div>`;

  return {
    subject: `[Contact] ${input.subject}`,
    text: [
      'Nouveau message de contact',
      '',
      `Nom: ${input.name}`,
      `Email: ${input.email}`,
      `Sujet: ${input.subject}`,
      '',
      input.message
    ].join('\n'),
    html: layout(brand, 'Nouveau message de contact', `Nouveau message de ${input.name}`, content)
  };
}

export function renderContactReceiptEmail(
  brand: EmailBrand,
  input: {
    name: string;
    subject: string;
    message: string;
  }
): RenderedEmail {
  const safeName = escapeHtml(input.name);
  const safeSubject = escapeHtml(input.subject);
  const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br>');
  const contactEmail = brand.contactEmail ?? brand.supportEmail;
  const contactLine = contactEmail
    ? `Notre equipe vous repondra depuis <a href="mailto:${escapeHtml(contactEmail)}" style="color:#2563eb;text-decoration:none">${escapeHtml(contactEmail)}</a>.`
    : 'Notre equipe vous repondra dans les meilleurs delais.';
  const content = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#374151">Bonjour ${safeName},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#374151">Nous avons bien recu votre message. Notre equipe va l'examiner et vous repondra dans les meilleurs delais.</p>
    <div style="margin:0 0 22px;padding:18px 20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px">
      <div style="margin-bottom:12px;font-size:13px;line-height:1.5;color:#6b7280">Sujet</div>
      <div style="margin-bottom:16px;font-size:15px;line-height:1.55;color:#111827">${safeSubject}</div>
      <div style="margin-bottom:12px;font-size:13px;line-height:1.5;color:#6b7280">Message</div>
      <div style="font-size:14px;line-height:1.65;color:#374151">${safeMessage}</div>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280">${contactLine}</p>`;

  return {
    subject: `Message recu : ${input.subject}`,
    text: [
      `Bonjour ${input.name},`,
      '',
      'Merci de nous avoir contactes. Nous avons bien recu votre demande.',
      '',
      `Sujet: ${input.subject}`,
      '',
      input.message
    ].join('\n'),
    html: layout(brand, 'Message recu', 'Votre message a bien ete recu.', content)
  };
}
