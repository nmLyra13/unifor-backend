import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // Produção (Render): lê as credenciais da variável de ambiente
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Desenvolvimento local: lê do arquivo .json via GOOGLE_APPLICATION_CREDENTIALS
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    console.log('Firebase Admin inicializado com sucesso.');
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();