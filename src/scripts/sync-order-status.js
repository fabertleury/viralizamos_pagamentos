#!/usr/bin/env node

/**
 * Script para sincronizar status de pedidos com os provedores
 * 
 * Este script deve ser executado regularmente (ex. via cron) para garantir
 * que pedidos cancelados nos provedores sejam corretamente marcados no sistema.
 * 
 * Uso: 
 *   node sync-order-status.js [dias] [limite]
 * 
 * Exemplos:
 *   node sync-order-status.js         # Verifica pedidos dos últimos 7 dias, limite de 50
 *   node sync-order-status.js 30 100  # Verifica pedidos dos últimos 30 dias, limite de 100
 */

const axios = require('axios');
require('dotenv').config();

// Configurações
const API_URL = process.env.SYNC_API_URL || 'http://localhost:3000/api/orders/sync-status';
const API_KEY = process.env.API_SECRET_KEY;

// Parâmetros da linha de comando
const days = parseInt(process.argv[2] || '7', 10);
const limit = parseInt(process.argv[3] || '50', 10);

if (!API_KEY) {
  console.error('Erro: API_SECRET_KEY não definida no ambiente');
  process.exit(1);
}

async function syncOrderStatus() {
  console.log(`Iniciando sincronização de status de pedidos dos últimos ${days} dias (limite: ${limit})...`);
  
  try {
    const response = await axios.post(
      API_URL,
      {
        daysAgo: days,
        forceUpdate: true,
        limit: limit
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`\n${response.data.message}`);
    
    if (response.data.results && response.data.results.details) {
      // Contadores
      const updatedOrders = response.data.results.details.filter(d => d.result === 'updated');
      const errorOrders = response.data.results.details.filter(d => d.result === 'error');
      
      if (updatedOrders.length > 0) {
        console.log('\nPedidos atualizados:');
        updatedOrders.forEach(order => {
          console.log(`- ID: ${order.id}, Token: ${order.token}, Status: ${order.previous_status} -> ${order.new_status} (Provedor: ${order.provider_status})`);
        });
      }
      
      if (errorOrders.length > 0) {
        console.log('\nPedidos com erro:');
        errorOrders.forEach(order => {
          console.log(`- ID: ${order.id}, Erro: ${order.error || 'Desconhecido'}`);
        });
      }
    }
    
    console.log('\nSincronização concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao sincronizar status de pedidos:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Resposta:', error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Executar sincronização
syncOrderStatus(); 