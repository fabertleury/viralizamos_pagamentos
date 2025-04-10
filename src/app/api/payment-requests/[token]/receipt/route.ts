import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token) {
    return NextResponse.json(
      { error: 'Token não fornecido' },
      { status: 400 }
    );
  }

  try {
    console.log(`[API] Gerando recibo para o pedido com token: ${token}`);

    // Buscar o pedido pelo token
    const paymentRequest = await db.paymentRequest.findUnique({
      where: { token },
      include: {
        transactions: {
          orderBy: {
            created_at: 'desc'
          },
          take: 1
        }
      }
    });

    if (!paymentRequest) {
      console.log(`[API] Pedido com token ${token} não encontrado`);
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    const transaction = paymentRequest.transactions.length > 0 
      ? paymentRequest.transactions[0]
      : null;

    // Formatar dados para o recibo
    const receiptData = {
      id: paymentRequest.token.substring(0, 8),
      date: new Date(paymentRequest.created_at).toLocaleDateString('pt-BR'),
      customer: {
        name: paymentRequest.customer_name,
        email: paymentRequest.customer_email
      },
      order: {
        service: paymentRequest.service_name,
        profile: paymentRequest.profile_username,
        amount: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(paymentRequest.amount),
        status: formatStatus(paymentRequest.status)
      },
      payment: transaction ? {
        method: formatPaymentMethod(transaction.method),
        status: formatStatus(transaction.status),
        date: transaction.processed_at 
          ? new Date(transaction.processed_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'N/A'
      } : null,
      company: {
        name: 'Viralizamos Brasil',
        cnpj: '12.345.678/0001-90',
        address: 'Av. Exemplo, 123 - São Paulo, SP'
      }
    };

    // Gerar HTML do recibo
    const html = generateReceiptHTML(receiptData);

    // Retornar HTML
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('[API] Erro ao gerar recibo:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Funções auxiliares
function formatStatus(status: string): string {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'success':
      return 'Concluído';
    case 'pending':
      return 'Pendente';
    case 'processing':
    case 'in progress':
      return 'Processando';
    case 'approved':
      return 'Aprovado';
    case 'failed':
      return 'Falhou';
    case 'rejected':
      return 'Rejeitado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status || 'Desconhecido';
  }
}

function formatPaymentMethod(method: string): string {
  switch (method?.toLowerCase()) {
    case 'pix':
      return 'PIX';
    case 'credit_card':
      return 'Cartão de Crédito';
    case 'boleto':
      return 'Boleto Bancário';
    default:
      return method || 'Desconhecido';
  }
}

function generateReceiptHTML(data: any): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo #${data.id}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .receipt {
      border: 1px solid #ddd;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .receipt-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    .receipt-header h1 {
      color: #2c5282;
      margin-bottom: 5px;
    }
    .receipt-body {
      margin-bottom: 20px;
    }
    .receipt-section {
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    .receipt-section:last-child {
      border-bottom: none;
    }
    .receipt-section h2 {
      color: #2c5282;
      font-size: 1.2rem;
      margin-bottom: 10px;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .receipt-label {
      font-weight: bold;
      color: #4a5568;
      flex: 1;
    }
    .receipt-value {
      flex: 2;
      text-align: right;
    }
    .receipt-footer {
      text-align: center;
      margin-top: 30px;
      font-size: 0.9rem;
      color: #718096;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
      text-align: center;
      background-color: #eee;
    }
    .status-completed {
      background-color: #c6f6d5;
      color: #22543d;
    }
    .status-processing {
      background-color: #bee3f8;
      color: #2c5282;
    }
    .status-pending {
      background-color: #fefcbf;
      color: #744210;
    }
    .status-failed {
      background-color: #fed7d7;
      color: #9b2c2c;
    }
    .status-canceled {
      background-color: #e2e8f0;
      color: #4a5568;
    }
    .print-button {
      display: block;
      margin: 20px auto;
      padding: 10px 15px;
      background-color: #3182ce;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    }
    @media print {
      .print-button {
        display: none;
      }
      body {
        padding: 0;
      }
      .receipt {
        box-shadow: none;
        border: none;
      }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">Imprimir Recibo</button>
  
  <div class="receipt">
    <div class="receipt-header">
      <h1>Recibo de Pagamento</h1>
      <p><strong>Pedido #${data.id}</strong> | <strong>Data:</strong> ${data.date}</p>
    </div>
    
    <div class="receipt-body">
      <div class="receipt-section">
        <h2>Cliente</h2>
        <div class="receipt-row">
          <span class="receipt-label">Nome:</span>
          <span class="receipt-value">${data.customer.name}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Email:</span>
          <span class="receipt-value">${data.customer.email}</span>
        </div>
      </div>
      
      <div class="receipt-section">
        <h2>Dados do Pedido</h2>
        <div class="receipt-row">
          <span class="receipt-label">Serviço:</span>
          <span class="receipt-value">${data.order.service}</span>
        </div>
        ${data.order.profile ? `
        <div class="receipt-row">
          <span class="receipt-label">Perfil:</span>
          <span class="receipt-value">${data.order.profile}</span>
        </div>
        ` : ''}
        <div class="receipt-row">
          <span class="receipt-label">Valor:</span>
          <span class="receipt-value">${data.order.amount}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Status:</span>
          <span class="receipt-value">
            <span class="status-badge status-${data.order.status.toLowerCase().replace(' ', '-')}">${data.order.status}</span>
          </span>
        </div>
      </div>
      
      ${data.payment ? `
      <div class="receipt-section">
        <h2>Dados do Pagamento</h2>
        <div class="receipt-row">
          <span class="receipt-label">Método:</span>
          <span class="receipt-value">${data.payment.method}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Status:</span>
          <span class="receipt-value">
            <span class="status-badge status-${data.payment.status.toLowerCase().replace(' ', '-')}">${data.payment.status}</span>
          </span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Data do Pagamento:</span>
          <span class="receipt-value">${data.payment.date}</span>
        </div>
      </div>
      ` : ''}
    </div>
    
    <div class="receipt-footer">
      <p>
        <strong>${data.company.name}</strong><br>
        CNPJ: ${data.company.cnpj}<br>
        ${data.company.address}
      </p>
      <p>Este recibo é um comprovante legal de pagamento. Obrigado por sua compra.</p>
    </div>
  </div>
</body>
</html>
  `;
} 