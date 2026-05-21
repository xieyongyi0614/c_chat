export const getEnvFilePath = () => {
  const env = process.env.NODE_ENV || 'development';
  return [`.env.${env}`, '.env'];
};
