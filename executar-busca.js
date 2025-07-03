/**
 * Script para executar a busca de compras configurando a variável de ambiente DATABASE_URL
 */

const { spawn } = require('child_process');
const path = require('path');

// URL do banco de dados extraída do Dockerfile
const DATABASE_URL = "postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway";

// Caminho para o script de busca
const scriptPath = path.join(__dirname, 'src', 'scripts', 'listar-compras-por-email.js');

// Caminho para o arquivo de emails
const emailsPath = path.join(__dirname, 'emails_para_busca.txt');

console.log('Iniciando busca de compras com a configuração correta do banco de dados...');
console.log(`DATABASE_URL: ${DATABASE_URL.replace(/\/\/.*:(.*)@/, '//***:***@')}`); // Oculta credenciais no log

// Configurar ambiente para o processo filho
const env = { ...process.env, DATABASE_URL };

// Executar o script de busca como processo filho
const child = spawn('node', [scriptPath, emailsPath], { 
  env,
  stdio: 'inherit' // Redireciona stdout e stderr para o processo pai
});

// Manipular eventos do processo filho
child.on('close', (code) => {
  if (code === 0) {
    console.log('Script de busca concluído com sucesso!');
  } else {
    console.error(`Script de busca falhou com código de saída ${code}`);
  }
});

child.on('error', (err) => {
  console.error('Erro ao executar o script de busca:', err);
}); 