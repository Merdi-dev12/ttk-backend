import type { RequestHandler } from 'express';
import { searchCatalog } from '../../core/search/catalogSearch.js';
import * as optionService from './option.service.js';
import * as productService from './product.service.js';
import * as catalogService from './service.js';

type IdParams = { id: string };
type ServiceIdParams = { serviceId: string };
type ProductIdParams = { productId: string };

export const listPublicServices: RequestHandler = async (request, response) => {
  const data = await catalogService.listPublicServices(
    request.validated?.query as { page: number; limit: number }
  );
  response.json({ status: 'success', data });
};

export const listCurrencies: RequestHandler = async (_request, response) => {
  const currencies = await catalogService.listCurrencies();
  response.json({ status: 'success', data: { currencies } });
};

export const search: RequestHandler = async (request, response) => {
  const { q, page, limit, kind } = request.validated?.query as {
    q: string;
    page: number;
    limit: number;
    kind?: 'SERVICE' | 'PRODUCT';
  };
  const data = await searchCatalog({ query: q, page, limit, kind });
  response.json({ status: 'success', data });
};

export const getPublicService: RequestHandler = async (request, response) => {
  const { slug } = request.validated?.params as { slug: string };
  const service = await catalogService.getPublicService(slug);
  response.json({ status: 'success', data: { service } });
};

export const listPublicProducts: RequestHandler = async (request, response) => {
  const { slug } = request.validated?.params as { slug: string };
  const { page, limit } = request.validated?.query as {
    page: number;
    limit: number;
  };
  const data = await productService.listPublicProducts(slug, page, limit);
  response.json({ status: 'success', data });
};

export const getPublicProduct: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const product = await productService.getPublicProduct(id);
  response.json({ status: 'success', data: { product } });
};

export const listPublicProductReviews: RequestHandler = async (
  request,
  response
) => {
  const { id } = request.validated?.params as IdParams;
  const reviews = await productService.listPublicProductReviews(id, 6);
  response.json({
    status: 'success',
    data: { reviews, total: reviews.length }
  });
};

export const listAdminServices: RequestHandler = async (request, response) => {
  const data = await catalogService.listAdminServices(
    request.validated?.query as Parameters<
      typeof catalogService.listAdminServices
    >[0]
  );
  response.json({ status: 'success', data });
};

export const getAdminService: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const service = await catalogService.getAdminService(id);
  response.json({ status: 'success', data: { service } });
};

export const deleteService: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const service = await catalogService.deleteService(id);
  response.json({ status: 'success', data: { service } });
};

export const createService: RequestHandler = async (request, response) => {
  const service = await catalogService.createService(
    request.validated?.body as Parameters<typeof catalogService.createService>[0]
  );
  response.status(201).json({ status: 'success', data: { service } });
};

export const updateService: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const service = await catalogService.updateService(
    id,
    request.validated?.body as Parameters<typeof catalogService.updateService>[1]
  );
  response.json({ status: 'success', data: { service } });
};

export const updateServiceStatus: RequestHandler = async (
  request,
  response
) => {
  const { id } = request.validated?.params as IdParams;
  const { status } = request.validated?.body as { status: string };
  const service = await catalogService.updateServiceStatus(id, status);
  response.json({ status: 'success', data: { service } });
};

export const createFormField: RequestHandler = async (request, response) => {
  const { serviceId } = request.validated?.params as ServiceIdParams;
  const field = await catalogService.createFormField(
    serviceId,
    request.validated?.body as Parameters<
      typeof catalogService.createFormField
    >[1]
  );
  response.status(201).json({ status: 'success', data: { field } });
};

export const updateFormField: RequestHandler = async (request, response) => {
  const { serviceId, fieldId } = request.validated?.params as {
    serviceId: string;
    fieldId: string;
  };
  const field = await catalogService.updateFormField(
    serviceId,
    fieldId,
    request.validated?.body as Parameters<
      typeof catalogService.updateFormField
    >[2]
  );
  response.json({ status: 'success', data: { field } });
};

export const deleteFormField: RequestHandler = async (request, response) => {
  const { serviceId, fieldId } = request.validated?.params as {
    serviceId: string;
    fieldId: string;
  };
  await catalogService.deleteFormField(serviceId, fieldId);
  response.status(204).send();
};

export const createProduct: RequestHandler = async (request, response) => {
  const { serviceId } = request.validated?.params as ServiceIdParams;
  const product = await productService.createProduct(
    serviceId,
    request.validated?.body as Parameters<typeof productService.createProduct>[1]
  );
  response.status(201).json({ status: 'success', data: { product } });
};

export const listAdminProducts: RequestHandler = async (request, response) => {
  const { serviceId } = request.validated?.params as ServiceIdParams;
  const { page, limit } = request.validated?.query as {
    page: number;
    limit: number;
  };
  const data = await productService.listAdminProducts(serviceId, page, limit);
  response.json({ status: 'success', data });
};

export const listAllAdminProducts: RequestHandler = async (
  request,
  response
) => {
  const data = await productService.listAllAdminProducts(
    request.validated?.query as Parameters<
      typeof productService.listAllAdminProducts
    >[0]
  );
  response.json({ status: 'success', data });
};

export const getAdminProduct: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const product = await productService.getAdminProduct(id);
  response.json({ status: 'success', data: { product } });
};

export const updateProduct: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const product = await productService.updateProduct(
    id,
    request.validated?.body as Parameters<typeof productService.updateProduct>[1]
  );
  response.json({ status: 'success', data: { product } });
};

export const updateProductStatus: RequestHandler = async (
  request,
  response
) => {
  const { id } = request.validated?.params as IdParams;
  const { status } = request.validated?.body as { status: string };
  const product = await productService.updateProductStatus(id, status);
  response.json({ status: 'success', data: { product } });
};

export const deleteProduct: RequestHandler = async (request, response) => {
  const { id } = request.validated?.params as IdParams;
  const product = await productService.deleteProduct(id);
  response.json({ status: 'success', data: { product } });
};

export const addImage: RequestHandler = async (request, response) => {

  const { productId } = request.validated?.params as ProductIdParams;
  const image = await optionService.addImage(
    productId,
    request.validated?.body as Parameters<typeof optionService.addImage>[1]
  );
  response.status(201).json({ status: 'success', data: { image } });
};

export const updateImage: RequestHandler = async (request, response) => {
  const { productId, imageId } = request.validated?.params as {
    productId: string;
    imageId: string;
  };
  const image = await optionService.updateImage(
    productId,
    imageId,
    request.validated?.body as Parameters<typeof optionService.updateImage>[2]
  );
  response.json({ status: 'success', data: { image } });
};

export const deleteImage: RequestHandler = async (request, response) => {
  const { productId, imageId } = request.validated?.params as {
    productId: string;
    imageId: string;
  };
  await optionService.deleteImage(productId, imageId);
  response.status(204).send();
};

export const addModality: RequestHandler = async (request, response) => {
  const { productId } = request.validated?.params as ProductIdParams;
  const modality = await optionService.addModality(
    productId,
    request.validated?.body as Parameters<typeof optionService.addModality>[1]
  );
  response.status(201).json({ status: 'success', data: { modality } });
};

export const updateModality: RequestHandler = async (request, response) => {
  const { productId, modalityId } = request.validated?.params as {
    productId: string;
    modalityId: string;
  };
  const modality = await optionService.updateModality(
    productId,
    modalityId,
    request.validated?.body as Parameters<
      typeof optionService.updateModality
    >[2]
  );
  response.json({ status: 'success', data: { modality } });
};

export const deleteModality: RequestHandler = async (request, response) => {
  const { productId, modalityId } = request.validated?.params as {
    productId: string;
    modalityId: string;
  };
  await optionService.deleteModality(productId, modalityId);
  response.status(204).send();
};

export const applyDiscount: RequestHandler = async (request, response) => {
  const { productId, modalityId } = request.validated?.params as {
    productId: string;
    modalityId: string;
  };
  const { price } = request.validated?.body as { price: number };
  const modality = await optionService.applyDiscount(
    productId,
    modalityId,
    price
  );
  response.json({ status: 'success', data: { modality } });
};

export const removeDiscount: RequestHandler = async (request, response) => {
  const { productId, modalityId } = request.validated?.params as {
    productId: string;
    modalityId: string;
  };
  const modality = await optionService.removeDiscount(productId, modalityId);
  response.json({ status: 'success', data: { modality } });
};
