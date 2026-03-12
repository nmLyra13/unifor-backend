import { FastifyInstance } from 'fastify';
import { db } from '../plugins/firebase';
import { verifyToken } from '../controllers/authController';

export default async function (fastify: FastifyInstance) {
    fastify.post('/auth/profile', {
        preHandler: [verifyToken],
        schema: {
            tags: ['Login & Perfis'],
            description: 'Cria/Atualiza o perfil do usuário logo após ele logar no Firebase (Para definir se é professor ou aluno)',
            body: {
                type: 'object',
                required: ['role', 'name'],
                properties: {
                    role: { type: 'string', enum: ['aluno', 'professor'] },
                    name: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        const user = (request as any).user;
        const { role, name } = request.body as any;

        await db.collection('users').doc(user.uid).set({
            role,
            name,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { message: 'Perfil salvo com sucesso', role };
    });
}
