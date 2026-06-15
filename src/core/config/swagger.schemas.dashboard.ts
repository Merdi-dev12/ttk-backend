const countGroup = {
  type: 'object',
  additionalProperties: { type: 'integer' }
};

export const dashboardSchemas = {
  DashboardResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['success'] },
      data: {
        type: 'object',
        properties: {
          services: countGroup,
          products: countGroup,
          users: countGroup,
          orders: { type: 'object', nullable: true },
          payments: { type: 'object', nullable: true },
          submissions: { type: 'object', nullable: true },
          series: { type: 'array', items: { type: 'object' } },
          currency: { type: 'string', enum: ['USD', 'CDF'] },
          unavailableDomains: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    }
  },
  ActivityResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['success'] },
      data: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'object' } },
          unavailableDomains: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    }
  }
};
