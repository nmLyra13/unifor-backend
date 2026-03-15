import { FastifyInstance } from 'fastify';
import { db, auth } from '../plugins/firebase';
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
                    name: { type: 'string' },
                    email: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        const user = (request as any).user;
        const { role, name, email } = request.body as any;

        const updateData: any = {
            role,
            name,
            updatedAt: new Date().toISOString()
        };
        if (email) updateData.email = email;

        await db.collection('users').doc(user.uid).set(updateData, { merge: true });

        await auth.setCustomUserClaims(user.uid, { role });

        return { message: 'Perfil salvo com sucesso', role };
    });
}
