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
  
  // Design Premium Apple : Fond blanc/gris très clair, logo discret noir ou blanc selon contexte
  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${safeBrand}" width="120" style="display:block;border:0;max-width:120px;height:auto">`
    : `<div style="font-size:20px;font-weight:700;letter-spacing:-0.5px;color:#1d1d1f">${safeBrand}</div>`;
    
  const home = brand.frontendUrl
    ? `<a href="${escapeHtml(brand.frontendUrl)}" style="color:#0066cc;text-decoration:none">${safeBrand}</a>`
    : safeBrand;
    
  const support = brand.supportEmail
    ? `Besoin d’aide ? <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:#0066cc;text-decoration:none">${escapeHtml(brand.supportEmail)}</a>`
    : 'Cet email a été envoyé automatiquement. Merci de ne pas y répondre.';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#1d1d1f">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f7;padding:40px 16px">
<tr>
  <td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.04)">
      
      <!-- Header Épuré -->
      <tr>
        <td style="padding:40px 40px 24px">${logo}</td>
      </tr>
      
      <!-- Contenu Principal -->
      <tr>
        <td style="padding:0 40px 40px">
          <h1 style="margin:0 0 24px;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.5px;color:#1d1d1f">${escapeHtml(title)}</h1>
          ${content}
        </td>
      </tr>
      
      <!-- Footer Neutre Style Apple -->
      <tr>
        <td style="padding:32px 40px;background-color:#f5f5f7;border-top:1px solid #e8e8ed;font-size:12px;line-height:1.6;color:#86868b">
          <div style="margin-bottom:6px">${support}</div>
          <div>© ${new Date().getUTCFullYear()} ${home}. Tous droits réservés.</div>
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
    ? 'Vérification de votre adresse de messagerie'
    : 'Réinitialisation de votre mot de passe';
  const action = registration
    ? 'finaliser la configuration de votre compte'
    : 'modifier votre mot de passe';
  const subject = registration
    ? `${input.otp} est votre code de validation ${brand.name}`
    : `${input.otp} est votre code de réinitialisation ${brand.name}`;
    
  const safeName = escapeHtml(input.name);
  
  // Style Apple : Textes sobres, code en bleu Apple (#0066cc) ultra-lisible et aéré
  const content = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#1d1d1f">Bonjour ${safeName},</p>
    <p style="margin:0 0 32px;font-size:15px;line-height:1.5;color:#1d1d1f">Veuillez utiliser le code de validation ci-dessous pour ${action}.</p>
    
    <div style="margin:0 0 32px;padding:24px;text-align:center;background-color:#f5f5f7;border-radius:12px">
      <span style="font-size:36px;line-height:1;letter-spacing:6px;font-weight:700;color:#0066cc;font-family:SFProDisplay,-apple-system,BlinkMacSystemFont,monospace">${escapeHtml(input.otp)}</span>
    </div>
    
    <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#86868b">Ce code expirera dans <strong>${input.expiresInMinutes} minutes</strong>.</p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#86868b;border-top:1px solid #e8e8ed;padding-top:20px">Par mesure de sécurité, ne partagez jamais ce code. Si vous n’avez pas fait cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>`;

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
    html: layout(brand, title, `Votre code de validation : ${input.otp}`, content)
  };
}

export function renderTestEmail(
  brand: EmailBrand,
  platformName: string
): RenderedEmail {
  const title = 'Connexion au serveur réussie';
  
  // Style Apple : Message de succès sobre avec badge d'état discret
  const content = `
    <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#1d1d1f">Le serveur de messagerie de <strong>${escapeHtml(platformName)}</strong> est configuré correctement et prêt à envoyer des e-mails transactionnels.</p>
    
    <div style="display:inline-block;padding:8px 16px;background-color:#e1f5fe;border-radius:20px;color:#0066cc;font-size:13px;font-weight:600;letter-spacing:-0.1px">
      ✓ Validation du service réussie
    </div>`;
    
  return {
    subject: `Test de configuration : ${platformName}`,
    text: `La configuration email de ${platformName} fonctionne correctement.`,
    html: layout(brand, title, 'Test de configuration SMTP réussi.', content)
  };
}
