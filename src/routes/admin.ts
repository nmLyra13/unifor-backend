import { FastifyInstance } from 'fastify';
import { db, auth } from '../plugins/firebase';
import { verifyToken } from '../controllers/authController';

export default async function (fastify: FastifyInstance) {
  // === CRIAÇÃO/ATUALIZAÇÃO UNIFICADA DE USUÁRIO ===
  fastify.post('/admin/users', {
    preHandler: [verifyToken],
    schema: {
      tags: ['Admin'],
      description: 'Gerenciamento: Criar ou definir papel de um usuário por E-mail (Admin). Se a senha não for enviada, ele não tentará criar um Firebase Auth.',
      body: {
        type: 'object',
        required: ['email', 'name', 'role'], // Senha não é mais obrigatória
        properties: {
          email: { type: 'string' },
          password: { type: 'string', description: 'Opcional. Preencha apenas se for criar a conta no Firebase agora.' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['aluno', 'professor', 'admin'] }
        }
      }
    }
  }, async (request, reply) => {
    const user = (request as any).user;
    const { email, password, name, role } = request.body as any;

    if (user.role !== 'admin' && !(user.role === 'professor' && role === 'aluno')) {
      return reply.code(403).send({ error: 'Acesso negado. Apenas administradores podem gerenciar usuários.' });
    }
    try {
      let authUid = '';

      // Se a senha foi preenchida, o Admin quer FORÇAR a criação do usuário no Firebase Auth
      if (password) {
        const userRecord = await auth.createUser({
          email,
          password,
          displayName: name
        });
        authUid = userRecord.uid;
      } else {
        // Se NÃO tem senha, significa que o usuário JÁ LOGOU no front-end pelo Google/Email
        // Então vamos apenas procurar ele no Auth para pegar a ID oficial dele
        const existingUser = await auth.getUserByEmail(email);
        authUid = existingUser.uid;
      }

      // Agora salva/atualiza no Banco Firestore
      await db.collection('users').doc(authUid).set({
        email,
        name,
        role,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Sincroniza a Role com as Custom Claims do Firebase Auth
      await auth.setCustomUserClaims(authUid, { role });

      return reply.code(200).send({
        message: `Registro do usuário ${email} concluído com papel de ${role}.`,
        uid: authUid,
        email,
        role
      });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return reply.code(404).send({ error: 'Usuário não encontrado no Auth. Envie a senha se quiser criá-lo agora.' });
      }
      return reply.code(400).send({ error: error.message || 'Erro ao processar usuário' });
    }
  });

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
          email: { type: 'string' },
          role: { type: 'string', enum: ['aluno', 'professor', 'admin'] }
        }
      }
    }
  }, async (request, reply) => {
    const user = (request as any).user;
    if (user.role !== 'admin') {
      return reply.code(403).send({ error: 'Acesso negado. Apenas administradores podem gerenciar usuários.' });
    }

    const { uid, name, role, email } = request.body as any;

    const updateData: any = {
      name,
      role,
      updatedAt: new Date().toISOString()
    };
    if (email) updateData.email = email;

    await db.collection('users').doc(uid).set(updateData, { merge: true });

    // Sincroniza a Role com as Custom Claims do Firebase Auth
    await auth.setCustomUserClaims(uid, { role });

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
