import { FastifyInstance } from 'fastify';
import { db } from '../plugins/firebase';
import { verifyToken } from '../controllers/authController';

export default async function (fastify: FastifyInstance) {
  // Criação/Atualização geral de um usuário
  fastify.put('/admin/users', {
    preHandler: [verifyToken],
    schema: {
      tags: ['Admin'],
      description: 'Salva ou Sobrescreve dados de um usuário (Professor/Aluno) via Admin',
      body: {
        type: 'object',
        required: ['uid', 'name', 'role'],
        properties: {
          uid: { type: 'string', description: 'ID do Firebase Auth deste usuário' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['aluno', 'professor', 'admin'] }
        }
      }
    }
  }, async (request, reply) => {
    const user = (request as any).user;
    if (user.role !== 'admin') {
        return reply.code(403).send({ error: 'Acesso negado. Apenas administradores podem gerenciar usuários.' });
    }
    
    const { uid, name, role } = request.body as any;
    
    await db.collection('users').doc(uid).set({
      name,
      role,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return reply.code(200).send({ message: `Usuário ${name} atualizado com papel de ${role}!` });
  });

  // Exclusão permanente de usuário
  fastify.delete('/admin/users/:uid', {
    preHandler: [verifyToken],
    schema: {
      tags: ['Admin'],
      description: 'Remove os metadados do usuário do banco (Firestore). (Obs: Não apaga a Auth principal)',
      params: {
        type: 'object',
        required: ['uid'],
        properties: { uid: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const user = (request as any).user;
    const { uid } = request.params as any;
    if (user.role !== 'admin') return reply.code(403).send({ error: 'Acesso negado.' });
    
    await db.collection('users').doc(uid).delete();
    return reply.code(200).send({ message: 'Registro do usuário deletado com sucesso do banco de dados.' });
  });

  // Criação de disciplinas
  fastify.post('/admin/disciplines', {
    preHandler: [verifyToken],
    schema: {
      tags: ['Admin'],
      description: 'Criar uma nova disciplina',
      body: {
        type: 'object',
        required: ['name', 'teacherId'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          teacherId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = (request as any).user;
    if (user.role !== 'admin') return reply.code(403).send({ error: 'Acesso negado.' });
    
    const body = request.body as any;
    const docRef = await db.collection('disciplines').add({
      ...body,
      createdAt: new Date().toISOString()
    });
    return reply.code(201).send({ id: docRef.id, message: 'Disciplina criada com sucesso!' });
  });

  // Edição de disciplinas
  fastify.put('/admin/disciplines/:id', {
    preHandler: [verifyToken],
    schema: {
      tags: ['Admin'],
      description: 'Edita dados de uma disciplina (Nome, Descrição ou Professor)',
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          teacherId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as any;
    if (user.role !== 'admin') return reply.code(403).send({ error: 'Acesso negado.' });
    
    const body = request.body as any;
    await db.collection('disciplines').doc(id).update({
      ...body,
      updatedAt: new Date().toISOString()
    });
    return reply.code(200).send({ message: 'Dados da disciplina atualizados com sucesso.' });
  });

  // Exclusão permanente de disciplinas
  fastify.delete('/admin/disciplines/:id', {
    preHandler: [verifyToken],
    schema: {
      tags: ['Admin'],
      description: 'Deletar uma disciplina no banco',
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } }
      }
    }
  }, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as any;
    if (user.role !== 'admin') return reply.code(403).send({ error: 'Acesso negado.' });
    
    await db.collection('disciplines').doc(id).delete();
    return reply.code(200).send({ message: 'A disciplina foi deletada com sucesso.' });
  });
}
