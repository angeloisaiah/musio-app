import type { FastifyRequest, FastifyReply, FastifyError } from 'fastify';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Log error for debugging
  request.log.error(error);

  // Handle validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      details: error.validation,
    });
  }

  // Handle JWT errors
  if (error.code === 'FST_JWT_BAD_REQUEST') {
    return reply.status(401).send({
      error: 'Invalid or missing token',
    });
  }

  // Handle database errors
  if (error.code?.startsWith('23')) {
    return reply.status(409).send({
      error: 'Database constraint violation',
    });
  }

  // Default error response
  reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal Server Error',
  });
}
