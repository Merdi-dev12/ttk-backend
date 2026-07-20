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
    : `<div style="display:inline-block;padding:8px 12px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:13px;font-weight:700">${safeBrand}</div>`;

  const home = brand.frontendUrl
    ? `<a href="${escapeHtml(brand.frontendUrl)}" style="color:#2563eb;text-decoration:none">${safeBrand}</a>`
    : safeBrand;

  const support = brand.supportEmail
    ? `Besoin d'aide ? <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:#2563eb;text-decoration:none">${escapeHtml(brand.supportEmail)}</a>`
    : 'Cet email a ete envoye automatiquement. Merci de ne pas y repondre.';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#172033">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:36px 14px">
<tr>
  <td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dbe7ff;border-radius:14px;overflow:hidden">
      <tr>
        <td style="padding:30px 32px 18px">${logo}</td>
      </tr>
      <tr>
        <td style="padding:0 32px 34px">
          <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;font-weight:750;color:#172033">${escapeHtml(title)}</h1>
          ${content}
        </td>
      </tr>
      <tr>
        <td style="padding:22px 32px;background:#f8fafc;border-top:1px solid #e5edf8;font-size:12px;line-height:1.6;color:#64748b">
          <div style="margin-bottom:6px">${support}</div>
          <div>&copy; ${new Date().getUTCFullYear()} ${home}. Tous droits reserves.</div>
        </td>
      </tr>
    </table>
  </td>
</tr>
</table>
</body>
</html>`;
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
    ? 'Verification de votre adresse email'
    : 'Reinitialisation de votre mot de passe';
  const action = registration
    ? 'finaliser la creation de votre compte'
    : 'modifier votre mot de passe';
  const subject = registration
    ? `${input.otp} est votre code de validation ${brand.name}`
    : `${input.otp} est votre code de reinitialisation ${brand.name}`;

  const content = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#172033">Bonjour ${escapeHtml(input.name)},</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#172033">Utilisez ce code pour ${action}.</p>

    <div style="margin:0 0 24px;padding:22px 18px;text-align:center;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px">
      <div style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0;text-transform:uppercase;color:#1d4ed8">Code de securite</div>
      <span style="display:inline-block;font-size:34px;line-height:1;letter-spacing:6px;font-weight:800;color:#1e40af;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace">${escapeHtml(input.otp)}</span>
    </div>

    <p style="margin:0 0 16px;font-size:13px;line-height:1.55;color:#64748b">Ce code expire dans <strong>${input.expiresInMinutes} minutes</strong>.</p>
    <p style="margin:0;padding-top:16px;border-top:1px solid #e5edf8;font-size:13px;line-height:1.55;color:#64748b">Ne partagez jamais ce code. Si vous n'avez pas fait cette demande, vous pouvez ignorer cet email.</p>`;

  return {
    subject,
    text: [
      `Bonjour ${input.name},`,
      '',
      `Votre code pour ${action} est : ${input.otp}`,
      `Il expire dans ${input.expiresInMinutes} minutes.`,
      '',
      "Ne communiquez jamais ce code. Ignorez cet email si vous n'avez rien demande."
    ].join('\n'),
    html: layout(brand, title, `Votre code de validation : ${input.otp}`, content)
  };
}

export function renderTestEmail(
  brand: EmailBrand,
  platformName: string
): RenderedEmail {
  const title = 'Connexion au serveur reussie';
  const content = `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#172033">Le serveur de messagerie de <strong>${escapeHtml(platformName)}</strong> est configure correctement.</p>
    <div style="display:inline-block;padding:8px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;color:#1d4ed8;font-size:13px;font-weight:700">Validation du service reussie</div>`;

  return {
    subject: `Test de configuration : ${platformName}`,
    text: `La configuration email de ${platformName} fonctionne correctement.`,
    html: layout(brand, title, 'Test de configuration SMTP reussi.', content)
  };
}
