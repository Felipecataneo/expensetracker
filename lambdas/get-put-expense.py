import json
import os
import boto3
import uuid
from datetime import datetime
from boto3.dynamodb.conditions import Key, Attr # Import Attr for FilterExpression
from botocore.exceptions import ClientError
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
DYNAMODB_TABLE = os.environ.get('DYNAMODB_TABLE', 'Receipts')

def lambda_handler(event, context):
    """
    Handler principal para gerenciar despesas.
    Compatível com API Gateway v1.0 (REST API) e v2.0 (HTTP API).
    GET: Recupera despesas do usuário.
    POST: Adiciona nova despesa manual.
    PUT: Atualiza despesa existente.
    DELETE: Deleta despesa existente.
    """
    
    logger.info(f"Received event: {json.dumps(event, default=str)}")
    
    # --- Detectar formato do API Gateway e extrair informações ---
    http_method = None
    path_parameters = {}
    body = None
    headers = {}

    try:
        # Primeira tentativa: API Gateway v1.0 format (REST API with proxy integration)
        if 'httpMethod' in event:
            http_method = event['httpMethod']
            path_parameters = event.get('pathParameters') or {}
            body = event.get('body')
            headers = event.get('headers', {})
            logger.info("Detected API Gateway v1.0 format")
        
        # Segunda tentativa: API Gateway v2.0 format (HTTP API)
        elif 'requestContext' in event and 'http' in event['requestContext']:
            http_method = event['requestContext']['http']['method']
            path_parameters = event.get('pathParameters') or {}
            body = event.get('body')
            headers = event.get('headers', {})
            logger.info("Detected API Gateway v2.0 format")
        
        # Terceira tentativa: Lambda Proxy Integration (mais comum)
        elif 'requestContext' in event and 'httpMethod' in event['requestContext']:
            http_method = event['requestContext']['httpMethod']
            path_parameters = event.get('pathParameters') or {}
            body = event.get('body')
            headers = event.get('headers', {})
            logger.info("Detected Lambda Proxy Integration format")
        
        # Quarta tentativa: Direct invocation ou formato alternativo
        elif 'method' in event:
            http_method = event['method']
            path_parameters = event.get('pathParameters') or {}
            body = event.get('body')
            headers = event.get('headers', {})
            logger.info("Detected direct invocation format")
        
        else:
            # Log completo do evento para debug
            logger.error(f"Unknown event format. Full event structure: {json.dumps(event, default=str, indent=2)}")
            
            # Tentar extrair informações básicas mesmo assim
            if 'Records' in event:
                logger.error("This appears to be an S3 or other service event, not API Gateway")
            
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Unknown event format',
                    'event_keys': list(event.keys()) if isinstance(event, dict) else 'Not a dict'
                })
            }
            
    except Exception as e:
        logger.error(f"Error parsing event format: {str(e)}")
        logger.error(f"Event structure: {json.dumps(event, default=str, indent=2)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Internal server error during event parsing', 'error': str(e)})
        }

    logger.info(f"Detected HTTP Method: {http_method}")
    logger.info(f"Detected Path Parameters: {path_parameters}")
    logger.info(f"Detected Body (raw): {body}")

    if not http_method:
        logger.error("Could not determine HTTP method from event")
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Could not determine HTTP method'})
        }

    table = dynamodb.Table(DYNAMODB_TABLE)

    # --- OBTEM O USER ID DO COGNITO AUTHORIZER ---
    user_id = None
    
    # Tentar diferentes estruturas para o Cognito Authorizer
    try:
        if 'requestContext' in event:
            request_context = event['requestContext']
            
            # Formato mais comum para Cognito User Pool Authorizer
            if 'authorizer' in request_context:
                authorizer = request_context['authorizer']
                
                # JWT Authorizer format
                if 'claims' in authorizer:
                    user_id = authorizer['claims'].get('sub')
                    logger.info("Found user_id in authorizer.claims")
                
                # Lambda Authorizer format
                elif 'principalId' in authorizer:
                    user_id = authorizer['principalId']
                    logger.info("Found user_id in authorizer.principalId")
                
                # Direct user info
                elif 'sub' in authorizer:
                    user_id = authorizer['sub']
                    logger.info("Found user_id in authorizer.sub")
            
            # Alternative: check identity
            elif 'identity' in request_context and 'cognitoAuthenticationProvider' in request_context['identity']:
                # Extract from cognito authentication provider string
                auth_provider = request_context['identity']['cognitoAuthenticationProvider']
                if ':CognitoSignIn:' in auth_provider:
                    user_id = auth_provider.split(':CognitoSignIn:')[-1]
                    logger.info("Found user_id in identity.cognitoAuthenticationProvider")
        
        logger.info(f"Final user_id: {user_id}")
        
    except Exception as e:
        logger.error(f"Error extracting user_id: {str(e)}")
        logger.error(f"RequestContext: {json.dumps(event.get('requestContext', {}), default=str)}")
    
    if not user_id:
        logger.warning("Unauthorized: User ID not found in request context.")
        logger.warning(f"Full requestContext for debugging: {json.dumps(event.get('requestContext', {}), default=str)}")
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Unauthorized - User ID not found'})
        }
    
    logger.info(f"Authenticated User ID: {user_id}")

    # === Resto do código permanece igual para GET, POST ===
    
    if http_method == 'GET':
        try:
            # This is correct as it uses the GSI (userId-date-index)
            response = table.query(
                IndexName='userId-date-index', 
                KeyConditionExpression=Key('userId').eq(user_id),
                ScanIndexForward=False
            )
            logger.info(f"Successfully fetched {len(response.get('Items', []))} items for user {user_id}")
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(response.get('Items', []), default=str)
            }
        except ClientError as e:
            logger.error(f"DynamoDB ClientError fetching expenses for user {user_id}: {e.response['Error']['Message']}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Failed to fetch expenses from database', 'error': e.response['Error']['Message']})
            }
        except Exception as e:
            logger.error(f"Error fetching expenses for user {user_id}: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Failed to fetch expenses', 'error': str(e)})
            }

    elif http_method == 'POST':
        try:
            if not body:
                logger.warning("POST request received with no body.")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Request body is required'})
                }
            
            if isinstance(body, str):
                request_body_parsed = json.loads(body)
            else:
                request_body_parsed = body

            logger.info(f"Parsed POST body: {request_body_parsed}")

            receipt_id = f"manual-{datetime.now().strftime('%Y%m%d%H%M%S')}-{os.urandom(4).hex()}"

            required_fields = ['date', 'vendor', 'total', 'items']
            if not all(k in request_body_parsed for k in required_fields):
                logger.warning(f"Missing required fields in POST request: {request_body_parsed.keys()}")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Missing required fields. Required: date, vendor, total, items'})
                }

            # *** FIX: Ensure both receipt_id (PK) and date (SK) are in the item for PUT ***
            # The 'userId' is also important for the GSI, make sure it's stored
            db_item = {
                'receipt_id': receipt_id,
                'userId': user_id, 
                'date': request_body_parsed['date'], # This is correct, as date is the Sort Key
                'vendor': request_body_parsed['vendor'],
                'total': request_body_parsed['total'],
                'items': request_body_parsed['items'],
                'processed_timestamp': datetime.now().isoformat(),
                's3_path': 'MANUAL_ENTRY'
            }
            
            logger.info(f"Attempting to put item: {db_item}")
            table.put_item(Item=db_item)
            logger.info(f"Expense {receipt_id} added successfully for user {user_id}")

            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Expense added successfully', 'receipt_id': receipt_id})
            }
        except json.JSONDecodeError:
            logger.error("Invalid JSON body received for POST request.")
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Invalid JSON body'})
            }
        except Exception as e:
            logger.error(f"Error adding expense for user {user_id}: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Failed to add expense', 'error': str(e)})
            }

    elif http_method == 'PUT':
        try:
            receipt_id = path_parameters.get('receipt_id')
            if not receipt_id:
                logger.warning("Receipt ID missing in path parameters for PUT request.")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Receipt ID is required in path parameters'})
                }
            logger.info(f"Attempting to update expense with receipt_id: {receipt_id} for user: {user_id}")

            if not body:
                logger.warning("PUT request received with no body.")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Request body is required'})
                }

            if isinstance(body, str):
                request_body_parsed = json.loads(body)
            else:
                request_body_parsed = body
            
            logger.info(f"Parsed PUT body: {request_body_parsed}")

            required_fields_for_update = ['date', 'vendor', 'total', 'items']
            if not all(k in request_body_parsed for k in required_fields_for_update):
                logger.warning(f"Missing required fields for update in PUT request: {request_body_parsed.keys()}")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Missing required fields for update. Required: date, vendor, total, items'})
                }
            
            # Get the 'date' from the request body. It's crucial for the PK.
            item_date = request_body_parsed.get('date') # This is the date from the request body
            if not item_date:
                logger.warning("Date is required in the body for PUT request to identify the item's primary key.")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Date is required in the request body to update an expense.'})
                }

            try:
                logger.info(f"Attempting to verify ownership for receipt_id: {receipt_id}, date: {item_date} for user: {user_id}")
                
                # *** FIX: Query the GSI (userId-date-index) to confirm ownership and existence of the item ***
                # *** Use 'date' in KeyConditionExpression and 'receipt_id' in FilterExpression ***
                gsi_response = table.query(
                    IndexName='userId-date-index',
                    KeyConditionExpression=Key('userId').eq(user_id) & Key('date').eq(item_date), # <--- CORREÇÃO AQUI
                    FilterExpression=Attr('receipt_id').eq(receipt_id) # <--- CORREÇÃO AQUI
                )
                existing_items_gsi = gsi_response.get('Items', [])

                if not existing_items_gsi:
                    logger.warning(f"Expense {receipt_id} with date {item_date} not found for update for user {user_id} via GSI lookup.")
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'message': 'Expense not found or you do not have permission to update it'})
                    }
                
                # If we get here, an item matching user_id, receipt_id, and date was found.
                # No need for the separate 'if existing_item.get('userId') != user_id:' check.

            except ClientError as e:
                logger.error(f"DynamoDB ClientError checking existing item {receipt_id} for user {user_id}: {e.response['Error']['Message']}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Failed to verify expense existence', 'error': e.response['Error']['Message']})
                }

            update_expression_parts = []
            expression_attribute_values = {}
            expression_attribute_names = {}

            updatable_fields = ['vendor', 'total', 'items'] 
            for field in updatable_fields:
                if field in request_body_parsed:
                    attr_name = f'#{field[0].upper()}{field[1:]}' 
                    expression_attribute_names[attr_name] = field
                    expression_attribute_values[f':{field}'] = request_body_parsed[field]
                    update_expression_parts.append(f"{attr_name} = :{field}")
            
            update_expression_parts.append("#updated = :updated_val")
            expression_attribute_names['#updated'] = 'updated_timestamp'
            expression_attribute_values[':updated_val'] = datetime.now().isoformat()

            if not update_expression_parts:
                logger.warning("No valid fields provided for update in PUT request.")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'No valid fields provided for update'})
                }

            update_expression = "SET " + ", ".join(update_expression_parts)
            
            logger.info(f"Update Expression: {update_expression}")
            logger.info(f"Expression Attribute Names: {expression_attribute_names}")
            logger.info(f"Expression Attribute Values: {expression_attribute_values}")

            # Use the actual primary key (receipt_id and date) for update_item
            response = table.update_item(
                Key={'receipt_id': receipt_id, 'date': item_date},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ReturnValues='ALL_NEW'
            )
            logger.info(f"Expense {receipt_id} updated successfully for user {user_id}. New item: {response.get('Attributes')}")

            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Expense updated successfully', 'updated_item': response.get('Attributes')}, default=str)
            }

        except json.JSONDecodeError:
            logger.error("Invalid JSON body received for PUT request.")
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Invalid JSON body'})
            }
        except ClientError as e:
            logger.error(f"DynamoDB ClientError updating expense {receipt_id} for user {user_id}: {e.response['Error']['Message']}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Failed to update expense in database', 'error': e.response['Error']['Message']})
            }
        except Exception as e:
            logger.error(f"Error updating expense {receipt_id} for user {user_id}: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Failed to update expense', 'error': str(e)})
            }

# Trecho da função DELETE no Lambda
    elif http_method == 'DELETE':
        try:
            receipt_id = path_parameters.get('receipt_id')
            if not receipt_id:
                logger.warning("Receipt ID missing in path parameters for DELETE request.")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Receipt ID is required in path parameters'})
                }
            
            # *** FIX: Obter o 'date' do corpo da requisição ***
            if not body:
                logger.warning("DELETE request received with no body.")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Request body is required for deletion'})
                }
            
            if isinstance(body, str):
                request_body_parsed = json.loads(body)
            else:
                request_body_parsed = body

            item_date_from_request = request_body_parsed.get('date')
            if not item_date_from_request:
                logger.warning("Date missing in body for DELETE request.")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Date is required in the request body for deletion'})
                }

            logger.info(f"Attempting to delete expense with receipt_id: {receipt_id}, date: {item_date_from_request} for user: {user_id}")
            
            # *** Verificação de Propriedade: Query o GSI (userId-date-index) ***
            # Isto ainda é necessário porque o DynamoDB não tem uma operação de delete_item
            # que possa verificar a propriedade baseada em um atributo não-chave (userId).
            # Precisamos garantir que o usuário é o dono do item antes de tentar deletá-lo.
            try:
                gsi_response = table.query(
                    IndexName='userId-date-index',
                    KeyConditionExpression=Key('userId').eq(user_id) & Key('date').eq(item_date_from_request), # <--- AGORA O 'date' ESTÁ NO LUGAR CERTO (KeyConditionExpression)
                    FilterExpression=Attr('receipt_id').eq(receipt_id) # <--- 'receipt_id' pode ficar no FilterExpression, pois NÃO é chave deste GSI.
                )
                gsi_items = gsi_response.get('Items', [])
                
                if not gsi_items:
                    logger.warning(f"Expense {receipt_id} with date {item_date_from_request} not found for deletion for user {user_id} via GSI lookup.")
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'message': 'Expense not found or you do not have permission to delete it'})
                    }
                
                # Se chegou aqui, o item foi encontrado e pertence ao usuário.
                logger.info(f"Item confirmed to exist and belong to user. Proceeding with deletion.")
                
            except ClientError as e:
                logger.error(f"DynamoDB ClientError verifying item ownership for deletion {receipt_id} for user {user_id}: {e.response['Error']['Message']}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Failed to verify expense ownership', 'error': e.response['Error']['Message']})
                }

            # *** Executar a deleção com a chave primária completa ***
            table.delete_item(Key={'receipt_id': receipt_id, 'date': item_date_from_request})
            logger.info(f"Expense {receipt_id} successfully deleted for user {user_id}.")

            return {
                'statusCode': 204,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': ''
            }

        except ClientError as e:
            logger.error(f"DynamoDB ClientError deleting expense {receipt_id} for user {user_id}: {e.response['Error']['Message']}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Failed to delete expense from database', 'error': e.response['Error']['Message']})
            }
        except Exception as e:
            logger.error(f"Error deleting expense {receipt_id} for user {user_id}: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Failed to delete expense', 'error': str(e)})
            }

    else:
        logger.warning(f"Method {http_method} not allowed.")
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'Method Not Allowed'})
        }