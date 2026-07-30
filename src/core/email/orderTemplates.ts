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

function layout(
  brand: EmailBrand,
  title: string,
  preheader: string,
  content: string
): string {
  const safeBrand = escapeHtml(brand.name);
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
          <div style="font-size:17px;line-height:1.3;font-weight:600;letter-spacing:0;color:#111827">${safeBrand}</div>
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

export function renderOrderPaymentLinkEmail(
  brand: EmailBrand,
  input: {
    customerName: string;
    reference: string;
    paymentUrl: string;
    serviceName: string;
    productName?: string | null;
    amount?: string | null;
    currency?: string | null;
  }
): RenderedEmail {
  const safeCustomerName = escapeHtml(input.customerName);
  const safeReference = escapeHtml(input.reference);
  const safePaymentUrl = escapeHtml(input.paymentUrl);
  const safeServiceName = escapeHtml(input.serviceName);
  const safeProductName = input.productName ? escapeHtml(input.productName) : null;
  const amountLine = input.amount && input.currency
    ? `<div style="margin-top:10px;font-size:14px;line-height:1.5;color:#374151">Montant : ${escapeHtml(input.amount)} ${escapeHtml(input.currency)}</div>`
    : '';

  const content = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#374151">Bonjour ${safeCustomerName},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#374151">Votre commande a ete validee. Vous pouvez maintenant poursuivre vers le paiement depuis le lien ci-dessous.</p>
    <div style="margin:0 0 22px;padding:18px 20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px">
      <div style="margin-bottom:10px;font-size:14px;line-height:1.5;color:#374151">Reference : ${safeReference}</div>
      <div style="font-size:14px;line-height:1.5;color:#374151">Service : ${safeServiceName}</div>
      ${safeProductName ? `<div style="margin-top:10px;font-size:14px;line-height:1.5;color:#374151">Produit : ${safeProductName}</div>` : ''}
      ${amountLine}
    </div>
    <div style="margin:0 0 22px">
      <a href="${safePaymentUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500">Proceder au paiement</a>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><a href="${safePaymentUrl}" style="color:#2563eb;text-decoration:none">${safePaymentUrl}</a></p>`;

  return {
    subject: `Paiement disponible pour votre commande ${input.reference}`,
    text: [
      `Bonjour ${input.customerName},`,
      '',
      'Votre commande a ete validee. Vous pouvez maintenant poursuivre vers le paiement.',
      '',
      `Reference: ${input.reference}`,
      `Service: ${input.serviceName}`,
      input.productName ? `Produit: ${input.productName}` : undefined,
      input.amount && input.currency ? `Montant: ${input.amount} ${input.currency}` : undefined,
      '',
      `Lien de paiement: ${input.paymentUrl}`
    ].filter(Boolean).join('\n'),
    html: layout(
      brand,
      'Paiement disponible',
      `Votre commande ${input.reference} a ete validee.`,
      content
    )
  };
}
