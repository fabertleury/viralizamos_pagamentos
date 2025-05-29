import psycopg2
from datetime import datetime
import pytz
from decimal import Decimal

# Database connection parameters
DB_PARAMS = {
    'dbname': 'railway',
    'user': 'postgres',
    'password': 'zacEqGceWerpWpBZZqttjamDOCcdhRbO',
    'host': 'shinkansen.proxy.rlwy.net',
    'port': '29036'
}

def get_all_approved_transactions():
    try:
        # Connect to the database
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        
        # Query to get total of all approved transactions until May 24th, 2025
        query = """
        SELECT 
            SUM(amount) as total_amount,
            COUNT(*) as transaction_count,
            MIN(created_at) as first_transaction,
            MAX(created_at) as last_transaction
        FROM transactions
        WHERE status = 'approved'
        AND created_at <= '2025-05-24 23:59:59'
        """
        
        cur.execute(query)
        result = cur.fetchone()
        
        total_amount = Decimal(str(result[0])) if result[0] is not None else Decimal('0')
        total_count = result[1] if result[1] is not None else 0
        first_date = result[2]
        last_date = result[3]
        
        ticket_medio = total_amount / total_count if total_count > 0 else Decimal('0')
        
        print("\nRelatório Geral de Transações Aprovadas")
        print("-" * 50)
        print(f"Período: {first_date.strftime('%d/%m/%Y')} até {last_date.strftime('%d/%m/%Y')}")
        print(f"Total de Transações: {total_count:,}")
        print(f"Valor Total: R$ {total_amount:,.2f}")
        print(f"Ticket Médio: R$ {ticket_medio:,.2f}")
        print("-" * 50)
        
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {str(e)}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    get_all_approved_transactions() 