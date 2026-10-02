# English Course

Sistema de aprendizado de vocabulário em inglês com **progressão travada**: você só avança quando acerta.

🌐 **Produção:** https://english.ljr.dev.br

Do **iniciante ao fluente** (A1 → C2), com 240 palavras, 24 lições e uma frase de consolidação gerada por IA no final de cada lição.

---

## Como funciona

1. **Quiz de vocabulário** — a palavra aparece em inglês (ou em português) e você digita a tradução. Também há múltipla escolha como reforço nas primeiras tentativas.
2. **Progressão travada** — cada palavra precisa ser acertada **2 vezes consecutivas** para ser dominada. Se errar, o domínio daquela palavra volta a zero e ela reaparece.
3. **Frase de consolidação** — quando as 10 palavras da lição estão dominadas, você recebe uma frase em inglês que usa **todas elas** e precisa traduzi-la.
4. **Níveis sequenciais** — A1, A2, B1, B2, C1 e C2. Cada nível só abre quando o anterior é concluído.

### Economia de créditos de IA

Este é o ponto central da arquitetura:

- A chave da DeepSeek fica **apenas no servidor** e é usada **somente pelo administrador**.
- Quando o admin gera a frase de uma lição, ela é **salva no banco** (`sentence_cache`).
- Todos os outros usuários **reaproveitam a frase já gerada** — sem consumir API.
- Resultado: a mesma frase é paga **uma única vez**, não importa quantos alunos usem o sistema.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS v4 |
| Banco | SQL Server (via Prisma 7 + `@prisma/adapter-mssql`) |
| Autenticação | Auth.js (NextAuth v5) com **e-mail e senha** (Credentials + JWT) |
| IA | DeepSeek (`deepseek-chat`) — somente para o admin |

---

## Rodando localmente

### 1. Pré-requisitos

- Node.js 22+
- Um SQL Server acessível (local, Docker ou na VPS)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env`:

```env
DATABASE_URL="sqlserver://localhost:1433;database=english_course;user=sa;password=SuaSenha;trustServerCertificate=true;encrypt=true"
AUTH_SECRET="gere-com-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
DEEPSEEK_API_KEY="sk-..."
ADMIN_EMAIL="leandrojoserocha@hotmail.com"
ADMIN_PASSWORD="123456"
```

> `ADMIN_EMAIL` / `ADMIN_PASSWORD` definem o administrador criado pelo seed. Troque a senha depois do primeiro acesso pelo painel.

### 4. Criar o banco e popular as palavras

```bash
npm run db:migrate   # aplica as migrations
npm run db:seed      # cria o admin, os 6 níveis, 240 palavras e 24 lições
```

### 5. Subir a aplicação

```bash
npm run dev
```

Acesse http://localhost:3000 e entre com o e-mail e a senha do admin.

---

## Autenticação e usuários

O login é por **e-mail e senha** (sem cadastro público). O administrador cria os
alunos pelo painel em `/admin` → aba **Usuários**.

### Criar/atualizar usuários pela linha de comando

```bash
# Cria um admin (senha aleatória é exibida no terminal se omitida)
npm run db:user -- --email leandro@exemplo.com --password 123456 --name "Leandro" --admin

# Cria um aluno
npm run db:user -- --email aluno@exemplo.com --password senha123
```

### Painel de usuários (`/admin` → Usuários)

- Cadastrar usuário (e-mail, nome opcional, senha, papel)
- Trocar senha
- Promover/rebaixar entre `USER` e `ADMIN`
- Ativar/desativar acesso
- Excluir usuário (apaga o progresso em cascata)

> O admin não consegue rebaixar, desativar ou excluir a própria conta — isso evita perder o acesso ao painel.

---

## Deploy na VPS (Docker + subdomínio english.ljr.dev.br)

O projeto já inclui `Dockerfile` (multi-stage, imagem enxuta) e `docker-compose.yml`.

### Infraestrutura desta VPS (já existente)

| Item | Valor |
| --- | --- |
| VPS | `root@187.45.255.177:2222` |
| Rede Docker do SQL Server | `ljr-net` |
| Container do SQL Server | `sqlserver` (`mcr.microsoft.com/mssql/server:2025-latest`) |
| Database | `english_course` (já criada) |
| Porta da aplicação | `127.0.0.1:3100` |
| DNS | `english.ljr.dev.br` → `187.45.255.177` |

### 1. Descobrir a rede do container do SQL Server

```bash
docker inspect sqlserver --format '{{json .NetworkSettings.Networks}}'
```

Nesta VPS a rede é `ljr-net` (já configurada como padrão no `docker-compose.yml`).

### 2. Preparar o `.env` na VPS

```env
DATABASE_URL="sqlserver://sqlserver:1433;database=english_course;user=sa;password=SenhaDoSeuSQLServer;trustServerCertificate=true"
AUTH_SECRET="<openssl rand -base64 32>"
AUTH_URL="https://english.ljr.dev.br"
AUTH_TRUST_HOST="true"
DEEPSEEK_API_KEY="sk-..."
ADMIN_EMAIL="leandrojoserocha@hotmail.com"
ADMIN_PASSWORD="123456"
SQLSERVER_NETWORK="ljr-net"
```

### 3. Subir o container

```bash
docker compose up -d --build
```

A aplicação ficará exposta em `127.0.0.1:3100`.

### 4. Aplicar migrations e popular o banco (primeira vez)

```bash
docker compose exec web npx prisma migrate deploy
docker compose exec web npx prisma db seed
```

### 5. Configurar o subdomínio

No seu proxy reverso (Nginx, Caddy ou Traefik), aponte `english.ljr.dev.br` para `127.0.0.1:3100`.

Exemplo com **Nginx**:

```nginx
server {
    listen 443 ssl;
    server_name english.ljr.dev.br;

    ssl_certificate     /etc/letsencrypt/live/english.ljr.dev.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/english.ljr.dev.br/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. Gerar as frases (painel admin)

1. Faça login com o e-mail e a senha definidos em `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. Acesse `/admin`.
3. Selecione as lições e clique em **Gerar frases**.

As frases ficam salvas no banco e são reaproveitadas por todos os alunos.

---

## Estrutura do projeto

```
prisma/
  schema.prisma          # modelos (User, Level, Word, Lesson, SentenceCache...)
  data/words.ts          # base de palavras por nível (fonte de verdade)
  seed.ts                # popula níveis, palavras e lições
src/
  app/
    page.tsx             # landing
    login/               # login com e-mail e senha
    dashboard/           # trilha de níveis e lições
    lesson/[lessonId]/   # quiz + frase de consolidação
    admin/               # painel de geração de frases
    api/                 # quiz, sentence, admin/generate, auth
  components/            # QuizRunner, SentenceRunner, AdminPanel, AppHeader
  lib/
    progression.ts       # regras de progressão travada
    answer-check.ts      # comparação de respostas (acentos, artigos, typos)
    sentences.ts         # cache de frases
    deepseek.ts          # cliente da DeepSeek
    queries.ts           # consultas da trilha e do progresso
```

---

## Adicionando palavras

Edite [`prisma/data/words.ts`](prisma/data/words.ts) e rode:

```bash
npm run db:seed
```

O seed é idempotente — pode rodar quantas vezes quiser. Cada grupo de 10 palavras vira automaticamente uma nova lição.

---

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Aplica migrations |
| `npm run db:seed` | Popula o banco |
| `npm run db:studio` | Interface visual do banco |
