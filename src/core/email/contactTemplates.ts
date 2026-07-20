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
    : `<div style="font-size:24px;line-height:1.15;font-weight:800;letter-spacing:0;color:#ffffff">${safeBrand}</div>`;
  const supportEmail = brand.contactEmail ?? brand.supportEmail;
  const support = supportEmail
    ? `Besoin d'aide ? <a href="mailto:${escapeHtml(supportEmail)}" style="color:#1d4ed8;text-decoration:none;font-weight:600">${escapeHtml(supportEmail)}</a>`
    : 'Cet email a ete envoye automatiquement.';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#eef4ff;font-family:Inter,Aptos,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#0f172a">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef4ff;padding:34px 14px">
<tr>
  <td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #cfe0ff;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(29,78,216,0.12)">
      <tr>
        <td style="padding:28px 34px;background:#1d4ed8;color:#ffffff">
          <div style="font-size:12px;line-height:1.2;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#bfdbfe">TTK Services</div>
          <div style="margin-top:10px">${logo}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:30px 34px 34px">
          <h1 style="margin:0 0 18px;font-size:25px;line-height:1.22;font-weight:800;letter-spacing:0;color:#0f172a">${escapeHtml(title)}</h1>
          ${content}
        </td>
      </tr>
      <tr>
        <td style="padding:22px 34px;background:#f8fbff;border-top:1px solid #dbe7ff;font-size:12px;line-height:1.65;color:#64748b">
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
    ? `Notre equipe vous repondra depuis <a href="mailto:${escapeHtml(contactEmail)}" style="color:#1d4ed8;text-decoration:none;font-weight:600">${escapeHtml(contactEmail)}</a>.`
    : 'Notre equipe vous repondra dans les meilleurs delais.';
  const content = `
    <p style="margin:0 0 14px;font-size:15.5px;line-height:1.6;color:#1e293b">Bonjour ${safeName},</p>
    <p style="margin:0 0 20px;font-size:15.5px;line-height:1.6;color:#1e293b">Merci de nous avoir contactes. Nous avons bien recu votre demande.</p>
    <div style="margin:0 0 22px;padding:17px 18px;background:#f8fbff;border:1px solid #dbe7ff;border-radius:12px">
      <div style="margin-bottom:12px;font-size:14px;color:#334155"><strong>Sujet :</strong> ${safeSubject}</div>
      <div style="font-size:14px;line-height:1.65;color:#334155">${safeMessage}</div>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b">${contactLine}</p>`;

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
