import dialogflow from '@google-cloud/dialogflow';

// Configura las credenciales de Dialogflow
process.env.GOOGLE_APPLICATION_CREDENTIALS = './tu-service-account.json';

const sessionClient = new dialogflow.SessionsClient();

export const detectIntent = async (projectId, sessionId, query, languageCode = 'es') => {
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
  
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: query,
        languageCode: languageCode,
      },
    },
  };

  try {
    const responses = await sessionClient.detectIntent(request);
    return responses[0].queryResult;
  } catch (error) {
    console.error('Error con Dialogflow:', error);
    throw error;
  }
};