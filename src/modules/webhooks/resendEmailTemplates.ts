interface EmailBrand {
  name: string;
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

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function layout(brand: EmailBrand, title: string, preheader: string, content: string): string {
  const safeBrand = escapeHtml(brand.name);
  const supportEmail = brand.contactEmail ?? brand.supportEmail;
  const support = supportEmail
    ? `<a href="mailto:${escapeHtml(supportEmail)}" style="color:#1d4ed8;text-decoration:none;font-weight:600">${escapeHtml(supportEmail)}</a>`
    : safeBrand;

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
          <div style="font-size:12px;line-height:1.2;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#bfdbfe">Accuse de reception</div>
          <div style="margin-top:10px;font-size:24px;line-height:1.15;font-weight:800;letter-spacing:0;color:#ffffff">${safeBrand}</div>
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
          <div>${support}</div>
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

export function renderInboundReceiptEmail(
  brand: EmailBrand,
  input: { subject: string }
): RenderedEmail {
  const content = `
    <p style="margin:0 0 14px;font-size:15.5px;line-height:1.6;color:#1e293b">Bonjour,</p>
    <p style="margin:0 0 20px;font-size:15.5px;line-height:1.6;color:#1e293b">Nous avons bien recu votre message. Notre equipe va le lire et revenir vers vous dans les meilleurs delais.</p>
    <div style="margin:0 0 22px;padding:17px 18px;background:#f8fbff;border:1px solid #dbe7ff;border-radius:12px;font-size:14px;line-height:1.55;color:#334155">
      <strong>Sujet :</strong> ${escapeHtml(input.subject || 'Message sans sujet')}
    </div>
    <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b">Cet accuse de reception est automatique. Merci de ne pas repondre a cette adresse.</p>`;

  return {
    subject: `Accuse de reception : ${input.subject || 'votre message'}`,
    text: [
      'Bonjour,',
      '',
      'Nous avons bien recu votre message. Notre equipe va le lire et revenir vers vous dans les meilleurs delais.',
      '',
      `Sujet: ${input.subject || 'Message sans sujet'}`
    ].join('\n'),
    html: layout(brand, 'Message bien recu', 'Votre message a bien ete recu.', content)
  };
}

export function renderInboundNotificationEmail(
  brand: EmailBrand,
  input: {
    from: string;
    to: string[];
    subject: string;
    text?: string | null;
    html?: string | null;
  }
): RenderedEmail {
  const message = input.text?.trim() || (input.html ? stripHtml(input.html) : '');
  const safeMessage = escapeHtml(message || 'Aucun contenu texte disponible.').replace(/\n/g, '<br>');
  const safeFrom = escapeHtml(input.from);
  const safeSubject = escapeHtml(input.subject || 'Message sans sujet');

  const content = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#172033">Un email a ete recu sur ${escapeHtml(input.to.join(', '))}.</p>
    <div style="margin:0 0 20px;padding:16px 18px;background:#f8fafc;border:1px solid #e5edf8;border-radius:10px;font-size:14px;line-height:1.6;color:#334155">
      <div><strong>De :</strong> <a href="mailto:${safeFrom}" style="color:#2563eb;text-decoration:none">${safeFrom}</a></div>
      <div><strong>Sujet :</strong> ${safeSubject}</div>
    </div>
    <div style="font-size:15px;line-height:1.65;color:#172033">${safeMessage}</div>`;

  return {
    subject: `[Email contact] ${input.subject || 'Message sans sujet'}`,
    text: [
      'Nouvel email recu',
      '',
      `De: ${input.from}`,
      `A: ${input.to.join(', ')}`,
      `Sujet: ${input.subject || 'Message sans sujet'}`,
      '',
      message || 'Aucun contenu texte disponible.'
    ].join('\n'),
    html: layout(brand, 'Nouvel email contact', `Nouveau message de ${input.from}`, content)
  };
}
