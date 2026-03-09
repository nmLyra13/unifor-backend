import * as admin from 'firebase-admin';

// Inicializa o Firebase Admin usando as credenciais padrão da aplicação.
// O Node.js automaticamente enxerga o carragamento do arquivo .env configurado com o novo node --env-file.
// O pacote firebase-admin busca a variável GOOGLE_CREDENTIALS globalmente
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('Firebase Admin inicializado com sucesso.');
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();