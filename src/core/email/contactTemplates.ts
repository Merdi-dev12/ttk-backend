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
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${safeBrand}" width="120" style="display:block;border:0;max-width:120px;height:auto">`
    : `<div style="font-size:20px;font-weight:700;color:#1d1d1f">${safeBrand}</div>`;
  const supportEmail = brand.contactEmail ?? brand.supportEmail;
  const support = supportEmail
    ? `Besoin d'aide ? <a href="mailto:${escapeHtml(supportEmail)}" style="color:#0066cc;text-decoration:none">${escapeHtml(supportEmail)}</a>`
    : 'Cet email a ete envoye automatiquement.';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f7;padding:40px 16px">
<tr>
  <td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.04)">
      <tr><td style="padding:40px 40px 20px">${logo}</td></tr>
      <tr>
        <td style="padding:0 40px 40px">
          <h1 style="margin:0 0 24px;font-size:28px;line-height:1.2;font-weight:700;color:#1d1d1f">${escapeHtml(title)}</h1>
          ${content}
        </td>
      </tr>
      <tr>
        <td style="padding:28px 40px;background-color:#f5f5f7;border-top:1px solid #e8e8ed;font-size:12px;line-height:1.6;color:#86868b">
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
    ? `Notre equipe vous repondra depuis <a href="mailto:${escapeHtml(contactEmail)}" style="color:#0066cc;text-decoration:none">${escapeHtml(contactEmail)}</a>.`
    : 'Notre equipe vous repondra dans les meilleurs delais.';
  const content = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#1d1d1f">Bonjour ${safeName},</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#1d1d1f">Merci de nous avoir contactes. Nous avons bien recu votre demande.</p>
    <div style="margin:0 0 24px;padding:20px;background-color:#f5f5f7;border-radius:12px">
      <div style="margin-bottom:12px;font-size:14px;color:#1d1d1f"><strong>Sujet :</strong> ${safeSubject}</div>
      <div style="font-size:14px;line-height:1.6;color:#1d1d1f">${safeMessage}</div>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#86868b">${contactLine}</p>`;

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
    html: layout(brand, 'Nous avons bien recu votre message', 'Votre message a bien ete recu.', content)
  };
}
