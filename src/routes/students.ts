import { FastifyInstance } from 'fastify';
import { db } from '../plugins/firebase';
import { verifyToken } from '../controllers/authController';

export default async function (fastify: FastifyInstance) {
    fastify.post('/students/enroll', {
        preHandler: [verifyToken],
        schema: {
            tags: ['Aluno'],
            description: 'Escolher uma disciplina para cursar (Matricular-se)',
            body: {
                type: 'object',
                required: ['disciplineId'],
                properties: { disciplineId: { type: 'string' } }
            }
        }
    }, async (request, reply) => {
        const user = (request as any).user;
        if (user.role !== 'aluno') return reply.code(403).send({ error: 'Acesso restrito a alunos.' });

        const { disciplineId } = request.body as any;
        await db.collection('enrollments').add({
            studentId: user.uid,
            disciplineId,
            enrolledAt: new Date().toISOString()
        });
        return reply.code(201).send({ message: 'Matriculado com sucesso na disciplina!' });
    });

    fastify.get('/students/grades', {
        preHandler: [verifyToken],
        schema: { tags: ['Aluno'], description: 'Visualizar o boletim de notas do próprio aluno' }
    }, async (request, reply) => {
        const user = (request as any).user;
        if (user.role !== 'aluno') return reply.code(403).send({ error: 'Acesso restrito a alunos.' });

        const snapshot = await db.collection('grades').where('studentId', '==', user.uid).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
}
