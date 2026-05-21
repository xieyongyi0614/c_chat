import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // Upload
  UPLOAD_BASE_URL: Joi.string().uri().default('http://localhost:3001'),
  UPLOAD_PATH: Joi.string().default('./uploads'),

  // DB
  DATABASE_URL: Joi.string().uri().required(),
});
