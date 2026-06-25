interface EmailBrand {
  name: string;
  logoUrl?: string;
  frontendUrl?: string;
  supportEmail?: string;
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
    "'": '&#039;'
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
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${safeBrand}" width="132" style="display:block;border:0;max-width:132px;height:auto">`
    : `<div style="font-size:22px;font-weight:800;letter-spacing:-.4px;color:#ffffff">${safeBrand}</div>`;
  const home = brand.frontendUrl
    ? `<a href="${escapeHtml(brand.frontendUrl)}" style="color:#9ee8c2;text-decoration:none">${safeBrand}</a>`
    : safeBrand;
  const support = brand.supportEmail
    ? `Besoin d’aide ? <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:#16784a">${escapeHtml(brand.supportEmail)}</a>`
    : 'Cet email a été envoyé automatiquement. Merci de ne pas y répondre.';

  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f3f6f5;font-family:Arial,Helvetica,sans-serif;color:#17211d">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f5;padding:28px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 35px rgba(17,54,39,.10)">
    <tr><td style="padding:26px 32px;background:#103d2c">${logo}</td></tr>
    <tr><td style="padding:38px 32px 24px">
      <h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;color:#103d2c">${escapeHtml(title)}</h1>
      ${content}
    </td></tr>
    <tr><td style="padding:22px 32px;background:#edf7f1;border-top:1px solid #dcebe2;font-size:13px;line-height:1.6;color:#52655b">
      <div style="margin-bottom:5px">${support}</div>
      <div>© ${new Date().getUTCFullYear()} ${home}</div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

export function renderOtpEmail(
  brand: EmailBrand,
  input: {
    purpose: 'REGISTRATION' | 'PASSWORD_RESET';
    name: string;
    otp: string;
    expiresInMinutes: number;
  }
): RenderedEmail {
  const registration = input.purpose === 'REGISTRATION';
  const title = registration
    ? 'Confirmez votre adresse email'
    : 'Réinitialisez votre mot de passe';
  const action = registration
    ? 'finaliser la création de votre compte'
    : 'réinitialiser votre mot de passe';
  const subject = registration
    ? `Votre code de validation ${brand.name}`
    : `Votre code de réinitialisation ${brand.name}`;
  const safeName = escapeHtml(input.name);
  const content = `
    <p style="margin:0 0 18px;font-size:16px;line-height:1.7">Bonjour <strong>${safeName}</strong>,</p>
    <p style="margin:0 0 22px;font-size:16px;line-height:1.7">Utilisez le code ci-dessous pour ${action}.</p>
    <div style="margin:0 0 22px;padding:20px;text-align:center;background:#edf7f1;border:1px solid #cbe7d7;border-radius:14px">
      <span style="font-size:34px;line-height:1;letter-spacing:8px;font-weight:800;color:#11633d">${escapeHtml(input.otp)}</span>
    </div>
    <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#52655b">Ce code expire dans <strong>${input.expiresInMinutes} minutes</strong>.</p>
    <p style="margin:0;padding:14px 16px;background:#fff8e8;border-radius:10px;font-size:13px;line-height:1.6;color:#73551b">Ne communiquez jamais ce code. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>`;

  return {
    subject,
    text: [
      `Bonjour ${input.name},`,
      '',
      `Votre code pour ${action} est : ${input.otp}`,
      `Il expire dans ${input.expiresInMinutes} minutes.`,
      '',
      'Ne communiquez jamais ce code. Ignorez cet email si vous n’avez rien demandé.'
    ].join('\n'),
    html: layout(brand, title, `Votre code ${brand.name} : ${input.otp}`, content)
  };
}

export function renderTestEmail(
  brand: EmailBrand,
  platformName: string
): RenderedEmail {
  const title = 'Votre configuration email fonctionne';
  const content = `
    <p style="margin:0 0 18px;font-size:16px;line-height:1.7">Bonne nouvelle : le serveur SMTP de <strong>${escapeHtml(platformName)}</strong> est correctement connecté.</p>
    <div style="padding:16px;background:#edf7f1;border-radius:12px;color:#11633d;font-weight:700">✓ Email transactionnel envoyé avec succès</div>`;
  return {
    subject: `Test email ${platformName}`,
    text: `La configuration email de ${platformName} fonctionne correctement.`,
    html: layout(brand, title, 'La configuration SMTP fonctionne.', content)
  };
}
