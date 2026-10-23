const serverless = require('serverless-http');
const app = require('../../server');

const serverlessHandler = serverless(app);

module.exports.handler = async (event, context) => {
  // Normalisasi path agar sesuai dengan router Express (/api/... atau /uploads/...)
  if (event.path.startsWith('/.netlify/functions/api')) {
    event.path = event.path.replace('/.netlify/functions/api', '') || '/';
    if (!event.path.startsWith('/api') && !event.path.startsWith('/uploads')) {
      event.path = '/api' + event.path;
    }
  }

  return await serverlessHandler(event, context);
};
