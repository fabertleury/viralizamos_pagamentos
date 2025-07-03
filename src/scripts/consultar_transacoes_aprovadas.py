import psycopg2
from datetime import datetime
from decimal import Decimal

# Configuração da conexão com o banco de dados
DATABASE_URL = "postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway"

def consultar_transacoes_aprovadas(data_consulta):
    """
    Consulta todas as transações aprovadas em uma data específica e retorna o valor total.
    
    Args:
        data_consulta (str): Data no formato DD/MM/AAAA
    
    Returns:
        tuple: (total_transacoes, valor_total)
    """
    try:
        # Converter a data para o formato do PostgreSQL (YYYY-MM-DD)
        data_obj = datetime.strptime(data_consulta, "%d/%m/%Y")
        data_formatada = data_obj.strftime("%Y-%m-%d")
        
        # Conectar ao banco de dados
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Consulta SQL para buscar transações aprovadas na data especificada
        query = """
        SELECT id, valor, data_transacao, status
        FROM transacoes
        WHERE status = 'aprovada' 
        AND DATE(data_transacao) = %s
        """
        
        cursor.execute(query, (data_formatada,))
        transacoes = cursor.fetchall()
        
        # Calcular o valor total
        total_transacoes = len(transacoes)
        valor_total = Decimal('0.00')
        
        print(f"\nTransações aprovadas em {data_consulta}:")
        print("-" * 60)
        print(f"{'ID':<10} {'Valor (R$)':<15} {'Data/Hora':<20} {'Status':<10}")
        print("-" * 60)
        
        for transacao in transacoes:
            id_transacao, valor, data_hora, status = transacao
            valor_total += Decimal(str(valor))
            print(f"{id_transacao:<10} R$ {valor:<12.2f} {data_hora.strftime('%d/%m/%Y %H:%M:%S'):<20} {status:<10}")
        
        print("-" * 60)
        print(f"Total de transações: {total_transacoes}")
        print(f"Valor total: R$ {valor_total:.2f}")
        
        # Fechar conexão
        cursor.close()
        conn.close()
        
        return total_transacoes, valor_total
        
    except psycopg2.Error as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        return 0, Decimal('0.00')
    except Exception as e:
        print(f"Erro: {e}")
        return 0, Decimal('0.00')

if __name__ == "__main__":
    data_consulta = "01/06/2025"
    print(f"Consultando transações aprovadas em {data_consulta}...")
    consultar_transacoes_aprovadas(data_consulta)
