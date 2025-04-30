import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const db = new PrismaClient();

// Configuração do Supabase para o banco de orders
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function syncUsers() {
  try {
    console.log('Iniciando sincronização de usuários...');

    // Buscar transações sem user_id
    const transactions = await db.transaction.findMany({
      where: {
        metadata: {
          not: null
        }
      },
      include: {
        payment_request: true
      }
    });

    console.log(`Encontradas ${transactions.length} transações para processar`);

    for (const transaction of transactions) {
      try {
        // Extrair dados do cliente do metadata
        const metadata = JSON.parse(transaction.metadata || '{}');
        const customerEmail = metadata.customer?.email || 
                            metadata.contact?.email || 
                            transaction.payment_request.customer_email;

        if (!customerEmail) {
          console.log(`Transação ${transaction.id} não possui email do cliente`);
          continue;
        }

        // Buscar ou criar usuário no banco de orders
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', customerEmail)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error(`Erro ao buscar usuário ${customerEmail}:`, userError);
          continue;
        }

        let userId = user?.id;

        if (!userId) {
          // Criar novo usuário
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              email: customerEmail,
              name: metadata.customer?.name || 
                    metadata.contact?.name || 
                    transaction.payment_request.customer_name || 
                    customerEmail.split('@')[0],
              phone: metadata.customer?.phone || 
                     metadata.contact?.phone || 
                     transaction.payment_request.customer_phone,
              role: 'customer'
            })
            .select()
            .single();

          if (createError) {
            console.error(`Erro ao criar usuário ${customerEmail}:`, createError);
            continue;
          }

          userId = newUser.id;
          console.log(`Usuário criado com sucesso: ${customerEmail} (${userId})`);
        } else {
          console.log(`Usuário já existe: ${customerEmail} (${userId})`);
        }

        // Atualizar transação com o user_id
        await db.transaction.update({
          where: { id: transaction.id },
          data: {
            metadata: JSON.stringify({
              ...metadata,
              user_id: userId
            })
          }
        });

        console.log(`Transação ${transaction.id} atualizada com user_id: ${userId}`);
      } catch (error) {
        console.error(`Erro ao processar transação ${transaction.id}:`, error);
      }
    }

    console.log('Sincronização de usuários concluída');
  } catch (error) {
    console.error('Erro na sincronização de usuários:', error);
  } finally {
    await db.$disconnect();
  }
}

// Executar o script
syncUsers(); 