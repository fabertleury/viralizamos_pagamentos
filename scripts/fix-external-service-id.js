/**
 * Script para corrigir external_service_id em payment_requests
 * 
 * Este script:
 * 1. Identifica payment_requests com external_service_id vazio
 * 2. Para cada um, verifica se o additional_data contém o external_service_id
 * 3. Se encontrado, atualiza o payment_request
 * 
 * Para executar:
 * node scripts/fix-external-service-id.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixExternalServiceIds() {
  console.log('====== CORREÇÃO DE EXTERNAL_SERVICE_ID EM PAYMENT_REQUESTS ======\n');
  
  try {
    // 1. Buscar payment_requests com external_service_id NULL mas com service_id preenchido
    const paymentRequests = await prisma.paymentRequest.findMany({
      where: {
        external_service_id: null,
        service_id: { not: null }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    console.log(`Encontrados ${paymentRequests.length} payment_requests para correção\n`);
    
    if (paymentRequests.length === 0) {
      console.log('Nenhum registro precisa ser corrigido.');
      return;
    }
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const request of paymentRequests) {
      console.log(`\nProcessando payment_request ${request.id}`);
      console.log(`Service ID: ${request.service_id}`);
      
      let externalServiceId = null;
      
      // Verificar se existe external_service_id no additional_data
      if (request.additional_data) {
        try {
          const additionalData = JSON.parse(request.additional_data);
          
          // Opção 1: Direto no additional_data
          if (additionalData.external_service_id) {
            externalServiceId = additionalData.external_service_id;
            console.log(`  Found external_service_id in additional_data: ${externalServiceId}`);
          } 
          // Opção 2: Dentro de um objeto de metadados no additional_data
          else if (additionalData.metadata && additionalData.metadata.external_service_id) {
            externalServiceId = additionalData.metadata.external_service_id;
            console.log(`  Found external_service_id in metadata: ${externalServiceId}`);
          }
          // Opção 3: No array de posts, pegar do primeiro (assumindo que são todos do mesmo serviço)
          else if (additionalData.posts && additionalData.posts.length > 0 && additionalData.posts[0].external_service_id) {
            externalServiceId = additionalData.posts[0].external_service_id;
            console.log(`  Found external_service_id in posts: ${externalServiceId}`);
          }
        } catch (e) {
          console.error(`  Erro ao processar additional_data: ${e.message}`);
        }
      }
      
      // Se não encontrar no additional_data, usar o service_id como fallback
      if (!externalServiceId && request.service_id) {
        console.log(`  Usando service_id como external_service_id: ${request.service_id}`);
        externalServiceId = request.service_id;
      }
      
      if (externalServiceId) {
        try {
          // Atualizar o payment_request
          await prisma.paymentRequest.update({
            where: { id: request.id },
            data: { external_service_id: externalServiceId }
          });
          
          console.log(`  ✅ Payment_request atualizado com external_service_id: ${externalServiceId}`);
          updatedCount++;
        } catch (error) {
          console.error(`  ❌ Erro ao atualizar payment_request: ${error.message}`);
          errorCount++;
        }
      } else {
        console.log(`  ⚠️ Não foi possível determinar external_service_id`);
        errorCount++;
      }
    }
    
    console.log('\n====== RESUMO ======');
    console.log(`Total processado: ${paymentRequests.length}`);
    console.log(`Atualizados com sucesso: ${updatedCount}`);
    console.log(`Falhas: ${errorCount}`);
    
  } catch (error) {
    console.error('Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
fixExternalServiceIds(); 