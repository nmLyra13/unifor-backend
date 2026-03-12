import { FastifyInstance } from 'fastify';
import { db } from '../plugins/firebase';
import { verifyToken } from '../controllers/authController';

export default async function (fastify: FastifyInstance) {
    fastify.get('/disciplines', {
        preHandler: [verifyToken],
        schema: { tags: ['Disciplinas'], description: 'Listar todas as disciplinas disponíveis' }
    }, async (request, reply) => {
        const snapshot = await db.collection('disciplines').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    fastify.post('/disciplines', {
        preHandler: [verifyToken],
        schema: {
            tags: ['Professor'],
            description: 'Cadastrar nova disciplina (Apenas Professores)',
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        const user = (request as any).user;
        if (user.role !== 'professor') {
            return reply.code(403).send({ error: 'Apenas professores podem criar disciplinas.' });
        }

        const body = request.body as any;
        const docRef = await db.collection('disciplines').add({
            ...body,
            teacherId: user.uid,
            createdAt: new Date().toISOString()
        });
        return reply.code(201).send({ id: docRef.id, message: 'Disciplina criada com sucesso!' });
    });
}
