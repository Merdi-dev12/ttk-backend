import { enqueueContactEmail } from '../../core/queues/email.queue.js';
import { createAdminNotification } from '../admin/notifications.service.js';
import type { ContactInput } from './schema.js';

export async function sendContactMessage(input: ContactInput): Promise<void> {
  await createAdminNotification({
    type: 'CONTACT_MESSAGE',
    title: `Nouveau message de ${input.nom}`,
    message: input.sujet,
    metadata: {
      name: input.nom,
      email: input.email,
      subject: input.sujet,
      message: input.message,
      source: 'contact_form'
    }
  });

  await enqueueContactEmail({
    type: 'CONTACT_MESSAGE',
    name: input.nom,
    email: input.email,
    subject: input.sujet,
    message: input.message
  });
}
