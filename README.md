# ExpenseTracker - Controle de Despesas Domésticas

Bem-vindo ao ExpenseTracker! Uma aplicação web completa para gerenciar suas despesas domésticas, inspirada na necessidade de ter um controle mais "tecnológico" do que uma simples planilha. Desenvolvido com Next.js no frontend e Lambdas da AWS no backend, esta aplicação oferece funcionalidades de autenticação, registro manual de despesas, upload de recibos via S3/Textract e visualização de gastos mensais.

## 🚀 Funcionalidades

*   **Autenticação de Usuário:** Gerenciamento de usuários via AWS Cognito (Registro, Confirmação, Login, Logout).
*   **Registro Manual de Despesas:** Formulário intuitivo para adicionar despesas com data, vendedor, total e itens detalhados.
*   **Upload de Recibos:** Envie fotos ou PDFs de recibos para que sejam processados automaticamente pelo AWS Textract.
*   **Extração de Dados Inteligente:** O AWS Textract extrai automaticamente a data, vendedor, total e itens do recibo.
*   **Listagem de Despesas:** Visualize todas as suas despesas em uma tabela paginada, com opções de edição e exclusão.
*   **Gráficos de Gastos Mensais:** Monitore seus padrões de gastos com um gráfico mensal.
*   **Formatação Localizada (pt-BR):** Valores monetários e datas exibidos no formato brasileiro (vírgula como separador decimal).
*   **Interface Responsiva:** Design moderno e adaptável a diferentes tamanhos de tela, construído com Shadcn/ui e Tailwind CSS.
*   **Temas Claro/Escuro:** Suporte a alternância entre temas claro e escuro.

## 🛠️ Tecnologias Utilizadas

### Frontend
*   **Next.js:** Framework React para construção de aplicações web, com foco em performance e SSR/SSG.
*   **React:** Biblioteca JavaScript para construção de interfaces de usuário.
*   **TypeScript:** Superset do JavaScript que adiciona tipagem estática.
*   **Tailwind CSS:** Framework CSS utilitário para estilização rápida e responsiva.
*   **Shadcn/ui:** Componentes de UI construídos sobre Radix UI e Tailwind CSS, proporcionando um design moderno e acessível.
*   **`react-hook-form` e `zod`:** Para gerenciamento de formulários e validação de esquemas.
*   **`date-fns`:** Biblioteca para manipulação e formatação de datas.
*   **`recharts`:** Para a visualização de dados (gráficos).
*   **`sonner`:** Para notificações toast.
*   **`next-themes`:** Para suporte a temas claro/escuro.
*   **`aws-amplify`:** Biblioteca para integração com serviços AWS no frontend (Cognito).

### Backend (AWS Lambdas)
*   **AWS Lambda:** Funções serverless que executam seu código em resposta a eventos.
*   **API Gateway:** Para criar uma API RESTful para o frontend interagir com as Lambdas.
*   **AWS Cognito:** Serviço de autenticação e gerenciamento de usuários.
*   **AWS S3:** Armazenamento de objetos para upload de recibos.
*   **AWS Textract:** Serviço de machine learning para extração de texto e dados de documentos.
*   **AWS DynamoDB:** Banco de dados NoSQL de alto desempenho para armazenar as despesas.

## ⚙️ Configuração e Execução (Desenvolvimento Local)

### Pré-requisitos
*   Node.js (v18.x ou superior)
*   npm ou yarn
*   AWS CLI configurado com credenciais para sua conta AWS.
*   Conta AWS ativa.

### 1. Configuração do Backend (AWS)

#### A. Criação da Tabela DynamoDB
Crie uma tabela DynamoDB com as seguintes configurações:
*   **Nome da Tabela:** `Receipts` (ou outro nome, mas ajuste a variável de ambiente `DYNAMODB_TABLE`)
*   **Chave de Partição (Primary Key):** `receipt_id` (String)
*   **Chave de Classificação (Sort Key):** `date` (String) - *Importante para consultas eficientes com GSI*

Crie um **Global Secondary Index (GSI)**:
*   **Nome do GSI:** `userId-date-index`
*   **Chave de Partição (Primary Key) do GSI:** `userId` (String)
*   **Chave de Classificação (Sort Key) do GSI:** `date` (String)
*   **Projeção de Atributos:** `ALL` ou os atributos necessários para a busca.

#### B. Criação do Bucket S3
Crie um bucket S3 para armazenar os recibos.
*   **Nome do Bucket:** Escolha um nome único (ex: `meu-expensetracker-recibos-abc123`).

#### C. Configuração do Cognito User Pool
1.  Crie um novo **User Pool** no Cognito.
2.  Configure um **App client** para seu User Pool.
3.  Anote o **User Pool ID** e o **Client ID** do App client.

#### D. Deploy das Funções Lambda
As funções Lambda (`get-put-expense` e `receiptprocessor`) devem ser empacotadas e implantadas na AWS.

1.  **`get-put-expense`:**
    *   Esta Lambda será acionada pelo API Gateway.
    *   **Permissões:** Deve ter permissão para `dynamodb:Query`, `dynamodb:PutItem`, `dynamodb:UpdateItem`, `dynamodb:DeleteItem` na sua tabela `Receipts`.
    *   **Variáveis de Ambiente:** Defina `DYNAMODB_TABLE` com o nome da sua tabela.

2.  **`receiptprocessor`:**
    *   Esta Lambda será acionada por um evento S3.
    *   **Permissões:** Deve ter permissão para `s3:GetObject` (no bucket de recibos), `textract:AnalyzeExpense`, `dynamodb:PutItem` (na sua tabela `Receipts`).
    *   **Variáveis de Ambiente:** Defina `DYNAMODB_TABLE` com o nome da sua tabela.

#### E. Criação do API Gateway
1.  Crie uma nova **REST API**.
2.  Crie os seguintes recursos e métodos:
    *   **`/expenses`**
        *   **`GET`:** Integre com a Lambda `get-put-expense`.
        *   **`POST`:** Integre com a Lambda `get-put-expense`.
    *   **`/expenses/{receipt_id}`**
        *   **`PUT`:** Integre com a Lambda `get-put-expense`.
        *   **`DELETE`:** Integre com a Lambda `get-put-expense`.
3.  **Autorizador Cognito:** Para todas as rotas acima, adicione um autorizador Cognito usando seu User Pool.
4.  **CORS:** Habilite o CORS para todas as rotas e métodos.
5.  **Implante a API:** Implante a API em um estágio (ex: `dev`). Anote a **URL de invocação**.

#### F. Configuração de Notificação de Eventos S3
1.  No seu bucket S3, vá para **Properties** -> **Event notifications**.
2.  Crie uma nova notificação:
    *   **Events:** `All objects created` (ou `Put`).
    *   **Destination:** Selecione sua Lambda `receiptprocessor`.
    *   Opcional: Se você estiver usando um prefixo no upload (`receipts/`), adicione-o aqui.

### 2. Configuração do Frontend

1.  Clone o repositório:
    ```bash
    git clone [URL_DO_SEU_REPOSITORIO]
    cd ExpenseTracker
    ```
2.  Instale as dependências:
    ```bash
    npm install
    # ou
    yarn install
    ```
3.  Crie um arquivo `.env.local` na raiz do projeto e adicione suas credenciais da AWS e URLs da API/Cognito:
    ```
    NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXX # Seu User Pool ID do Cognito
    NEXT_PUBLIC_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXX # Seu App Client ID do Cognito
    NEXT_PUBLIC_API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev # URL de invocação da sua API Gateway
    NEXT_PUBLIC_S3_BUCKET_NAME=meu-expensetracker-recibos-abc123 # Nome do seu bucket S3

    # Credenciais AWS para upload pré-assinado (APENAS PARA DESENVOLVIMENTO LOCAL!)
    # EM PRODUÇÃO, USE ROLES E POLÍTICAS DE ACESSO MAIS SEGURAS!
    AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
    NEXT_PUBLIC_AWS_REGION=us-east-1 # Sua região AWS
    ```
    **Atenção:** As credenciais `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` no `.env.local` são estritamente para **desenvolvimento local** e para que o frontend possa gerar URLs pré-assinadas. Em um ambiente de produção, esta funcionalidade deve ser gerenciada de forma mais segura, por exemplo, através de um backend dedicado que as utilize, ou por meio de políticas de IAM que restrinjam o acesso do S3 ao frontend.

4.  Execute a aplicação em modo de desenvolvimento:
    ```bash
    npm run dev
    # ou
    yarn dev
    ```
5.  Abra seu navegador e acesse `http://localhost:3000`.

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.