# Configuração da Expay

## Variáveis de Ambiente

Para configurar a integração com a Expay, adicione a seguinte variável de ambiente ao arquivo `.env`:

```env
EXPAY_MERCHANT_KEY="sua_merchant_key_aqui"
```

## Configuração do Webhook

1. Configure a URL de webhook no painel da Expay para:
```
https://seu-dominio.com/api/webhooks/expay
```

2. A Expay enviará notificações POST para esta URL com atualizações de status dos pagamentos.

## Fluxo de Pagamento

1. O sistema gera um pagamento PIX através da API da Expay
2. A Expay retorna o QR Code e código PIX
3. Quando o pagamento é confirmado, a Expay envia uma notificação para o webhook
4. O webhook verifica o status do pagamento e atualiza o banco de dados
5. Se aprovado, o sistema notifica o serviço de orders para processar o pedido

## Status de Pagamento

A Expay utiliza os seguintes status:
- pending: aguardando pagamento
- canceled: cancelado
- paid: aprovado
- refunded: estornado

Estes status são mapeados internamente para:
- pending -> pending
- canceled -> cancelled
- paid -> approved
- refunded -> refunded

## Campos Obrigatórios

Ao criar um pagamento PIX, os seguintes campos são obrigatórios:
- merchant_key: chave do comerciante
- currency_code: código da moeda (sempre 'BRL')
- invoice_id: identificador único da fatura
- invoice_description: descrição da fatura
- total: valor total
- devedor: nome do pagador
- email: email do pagador
- cpf_cnpj: CPF/CNPJ do pagador
- notification_url: URL para notificações
- telefone: telefone do pagador
- items: array com os itens do pedido 