import { FastifyRequest, FastifyReply } from 'fastify';
import { auth } from '../plugins/firebase';

export async function verifyToken(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Token de autenticação ausente ou inválido.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if(process.env.NODE_ENV !== 'production' && process.env.DEV_TOKEN && idToken == process.env.DEV_TOKEN){
        (request as any).user = { uid: 'dev-teste-123'};
        return;
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        // Anexa as informações do usuário no request para uso nas rotas privadas
        (request as any).user = decodedToken;
    } catch (error) {
        request.log.error(error);
        return reply.code(403).send({ error: 'Falha na autenticação do token.' });
    }
}