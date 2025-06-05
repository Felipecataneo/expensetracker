# src/lambda/receiptprocessor/receiptprocessor.py
import json
import os
import boto3
import uuid
from datetime import datetime
import urllib.parse
import re # Importar o módulo re para expressões regulares

# Inicializa clientes AWS
s3 = boto3.client('s3')
textract = boto3.client('textract')
dynamodb = boto3.resource('dynamodb')

# Variáveis de ambiente
DYNAMODB_TABLE = os.environ.get('DYNAMODB_TABLE', 'Receipts')

def clean_and_format_number_string(value_str):
    """
    Limpa uma string de número, removendo símbolos de moeda, separadores de milhares,
    e convertendo vírgula decimal para ponto decimal.
    Retorna o número formatado como string com duas casas decimais (ex: "123.45").
    """
    if not value_str:
        return "0.00"

    # 1. Remover quaisquer caracteres não numéricos, exceto ponto e vírgula.
    # Ex: "R$ 1.234,56" -> "1.234,56"
    cleaned_str = re.sub(r'[^\d.,]', '', value_str)

    # 2. Lógica para detectar e padronizar o separador decimal:
    # Se uma vírgula existir E ela aparecer DEPOIS do último ponto,
    # assumimos que a vírgula é o separador decimal (formato europeu/brasileiro: "1.234,56").
    # Caso contrário, assumimos que o ponto é o separador decimal (formato americano: "1,234.56" ou "123.45").
    if ',' in cleaned_str and '.' in cleaned_str:
        if cleaned_str.rfind(',') > cleaned_str.rfind('.'):
            # Formato "1.234,56": remover pontos de milhar, substituir vírgula por ponto.
            cleaned_str = cleaned_str.replace('.', '').replace(',', '.')
        else:
            # Formato "1,234.56": remover vírgulas de milhar.
            cleaned_str = cleaned_str.replace(',', '')
    elif ',' in cleaned_str:
        # Apenas vírgula, assumir que é o separador decimal. Ex: "123,45" -> "123.45"
        cleaned_str = cleaned_str.replace(',', '.')
    # Se apenas ponto, ou nenhum, a string já está em um formato que float() pode lidar.

    # 3. Tentar converter para float e formatar para 2 casas decimais como string.
    try:
        num_value = float(cleaned_str)
        return "{:.2f}".format(num_value)
    except ValueError:
        print(f"AVISO: Não foi possível converter '{value_str}' (limpo para '{cleaned_str}') para float. Retornando '0.00'.")
        return "0.00"

def lambda_handler(event, context):
    try:
        # Obter o bucket S3 e a chave do evento
        bucket = event['Records'][0]['s3']['bucket']['name']
        # Decodificar a URL da chave para lidar com espaços e caracteres especiais
        key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'])

        print(f"Processando recibo de {bucket}/{key}")

        user_id = None
        # Tentar obter o userId dos metadados do objeto S3
        try:
            s3_object_metadata = s3.head_object(Bucket=bucket, Key=key)
            # Metadados são sempre retornados em minúsculas
            user_id = s3_object_metadata['Metadata'].get('userid')
            if not user_id:
                print(f"Aviso: ID do usuário não encontrado nos metadados do objeto S3 para {key}. Prosseguindo sem associação de usuário.")
        except Exception as e:
            print(f"Erro ao obter metadados do objeto S3 para {key}: {str(e)}")
            user_id = None # Fallback se a busca de metadados falhar

        # Verificar se o objeto existe antes de prosseguir
        try:
            s3.head_object(Bucket=bucket, Key=key)
            print(f"Verificação do objeto S3 bem-sucedida: {bucket}/{key}")
        except Exception as e:
            print(f"Falha na verificação do objeto S3: {str(e)}")
            raise Exception(f"Não foi possível acessar o objeto {key} no bucket {bucket}: {str(e)}")

        # Passo 1: Processar o recibo com o Textract
        receipt_data = process_receipt_with_textract(bucket, key)

        # Passo 2: Armazenar os resultados no DynamoDB
        # Passa o user_id para a função de armazenamento
        store_receipt_in_dynamodb(receipt_data, bucket, key, user_id)
        
        return {
            'statusCode': 200,
            'body': json.dumps('Recibo processado com sucesso!')
        }
    except Exception as e:
        print(f"Erro ao processar recibo: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Erro: {str(e)}')
        }

def process_receipt_with_textract(bucket, key):
    """Processa o recibo usando a operação AnalyzeExpense do Textract"""
    try:
        print(f"Chamando Textract analyze_expense para {bucket}/{key}")
        response = textract.analyze_expense(
            Document={
                'S3Object': {
                    'Bucket': bucket,
                    'Name': key
                }
            }
        )
        print("Chamada Textract analyze_expense bem-sucedida")
    except Exception as e:
        print(f"Chamada Textract analyze_expense falhou: {str(e)}")
        raise

    # Gerar um ID único para este recibo
    receipt_id = str(uuid.uuid4())

    # Inicializar o dicionário de dados do recibo
    receipt_data = {
        'receipt_id': receipt_id,
        'date': datetime.now().strftime('%Y-%m-%d'),  # Data padrão
        'vendor': 'Desconhecido',
        'total': '0.00', # Inicializa, será sobrescrito
        'items': [],
        's3_path': f"s3://{bucket}/{key}"
    }

    # Extrair dados da resposta do Textract
    if 'ExpenseDocuments' in response and response['ExpenseDocuments']:
        expense_doc = response['ExpenseDocuments'][0]

        # Processar campos de resumo (TOTAL, DATE, VENDOR)
        if 'SummaryFields' in expense_doc:
            for field in expense_doc['SummaryFields']:
                field_type = field.get('Type', {}).get('Text', '')
                value = field.get('ValueDetection', {}).get('Text', '')

                if field_type == 'TOTAL':
                    receipt_data['total'] = clean_and_format_number_string(value) # <-- APLICAR A FUNÇÃO AQUI
                elif field_type == 'INVOICE_RECEIPT_DATE':
                    # O Textract pode retornar a data em vários formatos.
                    # Idealmente, você teria uma função robusta para parsear e formatar datas aqui.
                    # Por simplicidade, se o Textract retornar algo, tentamos usar. Caso contrário, a data padrão.
                    # Assumimos que o formato do DynamoDB para 'date' é 'YYYY-MM-DD'.
                    if value:
                        try:
                            # Tentar parsear e formatar para YYYY-MM-DD
                            # Esta é uma tentativa simples; datas mais complexas podem precisar de uma biblioteca mais robusta
                            # como 'dateutil' (que exigiria um layer Lambda).
                            # Por enquanto, tentamos o formato ISO se houver 'T' ou um formato comum.
                            if 'T' in value: # Tentar parsear como ISO completo
                                parsed_date = datetime.fromisoformat(value.replace('Z', '+00:00')) # Z para timezone offset
                            elif re.match(r'\d{4}-\d{2}-\d{2}', value): # YYYY-MM-DD
                                parsed_date = datetime.strptime(value, '%Y-%m-%d')
                            elif re.match(r'\d{2}/\d{2}/\d{4}', value): # DD/MM/YYYY
                                parsed_date = datetime.strptime(value, '%d/%m/%Y')
                            elif re.match(r'\d{2}-\d{2}-\d{4}', value): # DD-MM-YYYY
                                parsed_date = datetime.strptime(value, '%d-%m-%Y')
                            else: # Tentativa genérica de pegar a primeira parte e parsear
                                parsed_date = datetime.strptime(value.split(' ')[0], '%Y-%m-%d') # Tenta formato básico
                            
                            receipt_data['date'] = parsed_date.strftime('%Y-%m-%d')
                        except ValueError:
                            print(f"AVISO: Não foi possível parsear a data do Textract '{value}'. Usando data padrão.")
                            receipt_data['date'] = datetime.now().strftime('%Y-%m-%d')
                    else:
                        receipt_data['date'] = datetime.now().strftime('%Y-%m-%d')
                elif field_type == 'VENDOR_NAME':
                    receipt_data['vendor'] = value

        # Processar itens de linha
        if 'LineItemGroups' in expense_doc:
            for group in expense_doc['LineItemGroups']:
                if 'LineItems' in group:
                    for line_item in group['LineItems']:
                        item = {}
                        for field in line_item.get('LineItemExpenseFields', []):
                            field_type = field.get('Type', {}).get('Text', '')
                            value = field.get('ValueDetection', {}).get('Text', '')

                            if field_type == 'ITEM':
                                item['name'] = value
                            elif field_type == 'PRICE':
                                item['price'] = clean_and_format_number_string(value) # <-- APLICAR A FUNÇÃO AQUI
                            elif field_type == 'QUANTITY':
                                item['quantity'] = value

                        # Adicionar à lista de itens se tivermos um nome
                        if 'name' in item:
                            # Garantir valores padrão se não forem extraídos (já limpos se extraídos)
                            item['price'] = item.get('price', '0.00')
                            item['quantity'] = item.get('quantity', '1')
                            receipt_data['items'].append(item)

    print(f"Dados do recibo extraídos (após limpeza): {json.dumps(receipt_data)}")
    return receipt_data

def store_receipt_in_dynamodb(receipt_data, bucket, key, user_id=None):
    """Armazena os dados do recibo extraídos no DynamoDB"""
    try:
        table = dynamodb.Table(DYNAMODB_TABLE)

        # Os itens já foram limpos e formatados para o padrão americano pela função process_receipt_with_textract
        items_for_db = []
        for item in receipt_data['items']:
            items_for_db.append({
                'name': item.get('name', 'Unknown Item'),
                'price': item.get('price', '0.00'), # Já deve estar limpo e formatado
                'quantity': item.get('quantity', '1')
            })

        # Criar item para inserção
        db_item = {
            'receipt_id': receipt_data['receipt_id'],
            'date': receipt_data['date'], # Deve estar no formato YYYY-MM-DD
            'vendor': receipt_data['vendor'],
            'total': receipt_data['total'], # Já deve estar limpo e formatado
            'items': items_for_db,
            's3_path': receipt_data['s3_path'],
            'processed_timestamp': datetime.now().isoformat()
        }
        if user_id: # Adicionar userId se presente nos metadados do S3
            db_item['userId'] = user_id

        # Inserir no DynamoDB
        table.put_item(Item=db_item)
        print(f"Dados do recibo armazenados no DynamoDB: {receipt_data['receipt_id']}")
    except Exception as e:
        print(f"Erro ao armazenar dados no DynamoDB: {str(e)}")
        raise