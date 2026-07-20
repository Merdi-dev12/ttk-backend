import type { RequestHandler } from 'express';
import * as contactService from './service.js';
import type { ContactInput } from './schema.js';

export const submitContact: RequestHandler = async (request, response) => {
  await contactService.sendContactMessage(
    request.validated?.body as ContactInput
  );
  response.status(202).json({
    status: 'success',
    message: 'Votre message a bien ete recu.'
  });
};
