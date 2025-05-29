import psycopg2
from datetime import datetime, timedelta
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

def calculate_daily_total(date):
    try:
        # Connect to the database
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        
        # Set start and end of the day
        start_date = datetime(date.year, date.month, date.day, 0, 0, 0, tzinfo=pytz.UTC)
        end_date = datetime(date.year, date.month, date.day, 23, 59, 59, tzinfo=pytz.UTC)
        
        # Query to get total of approved transactions for the day
        query = """
        SELECT 
            COALESCE(SUM(amount), 0) as total_amount,
            COUNT(*) as transaction_count
        FROM transactions
        WHERE status = 'approved'
        AND created_at >= %s
        AND created_at <= %s
        """
        
        cur.execute(query, (start_date, end_date))
        result = cur.fetchone()
        
        total_amount = Decimal(str(result[0])) if result[0] is not None else Decimal('0')
        total_count = result[1] if result[1] is not None else 0
        
        return total_amount, total_count
        
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {str(e)}")
        return Decimal('0'), 0
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

def main():
    try:
        # Define the date range
        start_date = datetime(2025, 5, 1, tzinfo=pytz.UTC)
        end_date = datetime(2025, 5, 23, tzinfo=pytz.UTC)
        
        print("\nRelatório de Transações Aprovadas por Dia")
        print("=" * 50)
        
        total_general = Decimal('0')
        total_transactions = 0
        
        current_date = start_date
        while current_date <= end_date:
            amount, count = calculate_daily_total(current_date)
            
            print(f"\nData: {current_date.strftime('%d/%m/%Y')}")
            print("-" * 50)
            print(f"Total de Transações: {count:,}")
            print(f"Valor Total: R$ {amount:,.2f}")
            print("-" * 50)
            
            total_general += amount
            total_transactions += count
            
            current_date += timedelta(days=1)
        
        print("\nResumo Geral")
        print("=" * 50)
        print(f"Total Geral de Transações: {total_transactions:,}")
        print(f"Valor Total Geral: R$ {total_general:,.2f}")
        print("=" * 50)
        
    except Exception as e:
        print(f"Erro ao executar o script: {str(e)}")

if __name__ == "__main__":
    main() 