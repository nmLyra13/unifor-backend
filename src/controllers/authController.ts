import { FastifyRequest, FastifyReply } from 'fastify';
import { auth, db } from '../plugins/firebase';

export async function verifyToken(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Token de autenticação ausente ou inválido.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let uid = '';
    let role = 'aluno'; // default

    // Bypass: Permite Testar Como Admin, Professor ou Aluno localmente
    if (process.env.NODE_ENV !== 'production' && process.env.DEV_ADMIN && idToken === process.env.DEV_ADMIN) {
        uid = 'dev-admin-123';
        role = 'admin';
    }
    else if (process.env.NODE_ENV !== 'production' && process.env.DEV_PROFESSOR && idToken === process.env.DEV_PROFESSOR) {
        uid = 'dev-prof-123';
        role = 'professor';
    }
    else if (process.env.NODE_ENV !== 'production' && process.env.DEV_ALUNO && idToken === process.env.DEV_ALUNO) {
        uid = 'dev-aluno-123';
        role = 'aluno';
    }
    else {
        try {
            const decodedToken = await auth.verifyIdToken(idToken);
            uid = decodedToken.uid;
            const email = decodedToken.email;

            console.log(`[AUTH] ID Token verificado para: ${email} (UID: ${uid})`);

            // 1. Prioridade: Root Admin via Variável de Ambiente (Bootstrap Seguro em Produção)
            if (email && process.env.ROOT_ADMIN_EMAIL && email === process.env.ROOT_ADMIN_EMAIL) {
                role = 'admin';
                console.log(`[AUTH] ROOT ADMIN detectado por e-mail: ${email}`);
            } 
            // 2. Segunda opção: Role já presente no Token (Custom Claims)
            else if (decodedToken.role) {
                role = decodedToken.role;
                console.log(`[AUTH] Role recuperada das Claims: ${role}`);
            } 
            // 3. Terceira opção: Busca no Firestore
            else {
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists) {
                    role = userDoc.data()?.role || 'aluno';
                    console.log(`[AUTH] Role recuperada do Firestore: ${role}`);
                } else {
                    console.log(`[AUTH] Usuário não encontrado no Firestore. UID: ${uid}`);
                }
            }

            // --- AUTO-SINCRONIZAÇÃO DE CLAIMS ---
            // Se encontramos a role (por DB ou Email) mas ela NÃO está no "crachá" (Token), vamos gravar agora!
            if (role && !decodedToken.role) {
                console.log(`[AUTH] Sincronizando Role '${role}' com Custom Claims para UID: ${uid}`);
                await auth.setCustomUserClaims(uid, { role });
                console.log(`[AUTH] Sincronização concluída. O próximo login ou refresh de token já virá com a role.`);
            }

        } catch (error: any) {
            console.error(`[AUTH] Erro crítico na autenticação: ${error.message}`);
            return reply.code(403).send({ error: 'Falha na autenticação do token.' });
        }
    }

    // Passa o ID e a Role para a Request (pra Rota usar)
    (request as any).user = { uid, role };
}
