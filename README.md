# Viralizamos Pagamentos

Sistema de pagamentos para o Viralizamos, implementando integração com gateways de pagamento como Mercado Pago.

## Funcionalidades

- Criação de solicitações de pagamento
- Geração de links de pagamento com token único
- Geração de QR Code para pagamento via PIX
- Processamento de notificações de pagamento via webhooks
- Consulta de status de pagamentos

## Tecnologias

- Next.js 14 (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS
- Mercado Pago SDK

## Requisitos

- Node.js 18+
- PostgreSQL

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/viralizamos_pagamentos.git
cd viralizamos_pagamentos
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Configure o banco de dados:
```bash
npx prisma migrate dev
# ou
npx prisma db push
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## Configuração

### Banco de dados

O sistema utiliza PostgreSQL através do Prisma ORM. Configure a URL de conexão no arquivo `.env`:

```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/viralizamos_pagamentos"
```

### Mercado Pago

Para utilizar a integração com o Mercado Pago, você precisa configurar as credenciais no arquivo `.env`:

```
MERCADO_PAGO_ACCESS_TOKEN="SEU_ACCESS_TOKEN"
```

Para obter suas credenciais, acesse o [Mercado Pago Developers](https://www.mercadopago.com.br/developers).

### Webhooks

Configure a URL de webhook no painel do Mercado Pago para receber notificações de pagamento. A URL deve ser:

```
https://seu-dominio.com/api/webhooks/mercadopago
```

## Estrutura do Projeto

- `/src/app/api`: Endpoints da API REST
- `/src/app/pagamento`: Páginas de pagamento para o usuário final
- `/src/lib`: Bibliotecas e utilitários
- `/prisma`: Modelos e migrações do banco de dados

## Endpoints da API

### Solicitações de Pagamento

- `POST /api/payment-requests`: Criar nova solicitação de pagamento
- `GET /api/payment-requests`: Listar solicitações de pagamento
- `GET /api/payment-requests/{token}`: Buscar solicitação pelo token

### Pagamentos

- `POST /api/payments/pix`: Criar um pagamento PIX
- `GET /api/payments/{id}`: Buscar detalhes de um pagamento

### Webhooks

- `POST /api/webhooks/mercadopago`: Receber notificações do Mercado Pago

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

## Suporte

Para problemas ou dúvidas, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.
