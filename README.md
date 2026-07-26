# SysmLab - Frontend

Aplicação web para gerenciamento de análises laboratoriais desenvolvida em Angular 19 com Bootstrap 5.

## 🚀 Tecnologias

- **Angular** 19.2.0
- **TypeScript** 5.7.2
- **Bootstrap** 5.3.2
- **Font Awesome** 7.1.0
- **Chart.js** 4.4.1 (via ng2-charts)
- **RxJS** 7.8.0
- **Karma + Jasmine** (testes)

## 📋 Pré-requisitos

- Node.js 18+ ou 21+
- Angular CLI 19+
- Navegador moderno (Chrome, Firefox, Edge, Safari)

## 🔧 Instalação

```bash
# Instalar Angular CLI globalmente (se necessário)
npm install -g @angular/cli

# Instalar dependências do projeto
npm install
```

## ⚙️ Configuração

Edite o arquivo `src/config/api.config.ts` com a URL da sua API:

```typescript
export const API_CONFIG = {
  baseUrl: 'https://sua-api.vercel.app/api',
  // ou para desenvolvimento local:
  // baseUrl: 'http://localhost:3000'
};
```

Configure também os ambientes em:
- `src/environments/environment.ts` (desenvolvimento)
- `src/environments/environment.prod.ts` (produção)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  supabaseUrl: 'https://seu-projeto.supabase.co',
  supabaseKey: 'sua_chave_anon'
};
```

## 🏃 Executando

### Modo desenvolvimento
```bash
ng serve
```
Acesse `http://localhost:4200`

### Build para produção
```bash
ng build --configuration production
```
Os arquivos serão gerados em `dist/sysmlab/`

## 🧪 Testes

### Executar testes unitários
```bash
ng test
```

### Executar testes específicos
```bash
ng test --include='**/importacao-resultado*.spec.ts'
```

### Executar com cobertura
```bash
ng test --code-coverage --watch=false --browsers=ChromeHeadless
```

### Resultados de cobertura
```
Statements : 92.59%
Branches   : 58.82%
Functions  : 88.23%
Lines      : 92.59%
```

**35+ testes** implementados cobrindo:
- Componentes (lógica de UI)
- Serviços (HTTP e integrações)
- Validações de formulário
- Fluxos de importação

## 📁 Estrutura do Projeto

```
frontend/sysmlab/
├── src/
│   ├── app/
│   │   ├── acessos/                     # Módulo de autenticação
│   │   │   ├── auth/                    # Guards e serviços
│   │   │   ├── login/                   # Página de login
│   │   │   ├── cadastro-usuario/        # Cadastro de usuários
│   │   │   ├── recuperar-senha/         # Recuperação de senha
│   │   │   └── nova-senha/              # Redefinir senha
│   │   ├── acesso-negado/               # Página 403
│   │   ├── alerta-naoconformidade/      # Alertas e não conformidades
│   │   ├── amostra/                     # Gerenciamento de amostras
│   │   ├── dashboard-tv/                # Dashboard para TV
│   │   ├── dashboard-web/               # Dashboard web
│   │   ├── gerenciamento-parametros/    # Gerenciamento de parâmetros
│   │   ├── grafico-parametros/          # Gráficos de parâmetros
│   │   ├── importacao-resultado/        # Importação de planilhas
│   │   │   ├── importacao-resultado.component.ts
│   │   │   ├── importacao-resultado.component.html
│   │   │   ├── importacao-resultado.component.css
│   │   │   ├── importacao-resultado.component.spec.ts
│   │   │   ├── importacao-resultado.service.ts
│   │   │   └── importacao-resultado.service.spec.ts
│   │   ├── resultado-analise/           # Resultados de análise
│   │   │   ├── resultado-analise.component.ts
│   │   │   ├── resultado-analise.component.html
│   │   │   └── resultado-analise.component.css
│   │   ├── app.component.ts             # Componente raiz
│   │   ├── app.component.html           # Template com menu
│   │   ├── app.routes.ts                # Configuração de rotas
│   │   └── app.config.ts                # Configuração global
│   ├── config/
│   │   └── api.config.ts                # Configuração da API
│   ├── environments/
│   │   ├── environment.ts               # Ambiente dev
│   │   └── environment.prod.ts          # Ambiente prod
│   ├── index.html
│   ├── main.ts
│   └── styles.css                       # Estilos globais
├── angular.json                         # Configuração Angular
├── package.json
├── tsconfig.json
└── vercel.json                          # Deploy Vercel
```

## 🎨 Componentes Principais

### 1. Login e Autenticação
- Login com email/senha
- Recuperação de senha
- Cadastro de novos usuários
- Guards para rotas protegidas

### 2. Dashboard
- Resumo de análises
- Gráficos e estatísticas
- Alertas de não conformidade
- Versões web e TV

### 3. Amostras
- CRUD completo de amostras
- Validação de campos
- Busca e filtros

### 4. Parâmetros
- Gerenciamento de parâmetros
- Associação com matrizes e legislações
- Gráficos de distribuição

### 5. Resultados de Análise
- **Aba 1**: Inserir Novo Resultado (formulário manual)
- **Aba 2**: Importar Resultado (upload de planilha)
- Visualização em tabela
- Edição e exclusão

### 6. Importação de Dados
- Upload por drag & drop
- Suporte a CSV, XLS, XLSX
- Validação de formato e tamanho (10MB)
- Exibição de resultados com estatísticas
- Tabela de erros detalhada

## 🎯 Funcionalidades

### Sistema de Abas
As páginas de resultados possuem sistema de abas:
- **Inserir Novo Resultado**: Formulário manual
- **Importar Resultado**: Upload de planilha

### Importação de Planilhas

#### Formatos suportados
- CSV (`.csv`)
- Excel (`.xlsx`, `.xls`)
- Tamanho máximo: 10MB

#### Processo
1. Selecione o tipo (Planilha)
2. Arraste ou clique para selecionar arquivo
3. Sistema valida formato e tamanho
4. Upload e processamento automático
5. Exibição de resultados:
   - Total de linhas processadas
   - Linhas inseridas com sucesso
   - Erros de validação
   - Erros de inserção
6. Tabela com detalhes dos erros (se houver)

#### Validações
- ✅ Extensão do arquivo
- ✅ Tipo MIME
- ✅ Tamanho do arquivo
- ✅ Estrutura da planilha
- ✅ Campos obrigatórios
- ✅ Tipos de dados
- ✅ Referências no banco (amostra, parâmetro, etc.)

## 🔐 Autenticação

A aplicação usa Supabase para autenticação JWT. O token é armazenado no localStorage e enviado automaticamente em todas as requisições HTTP via interceptor.

### Fluxo de autenticação
1. Usuário faz login
2. Token JWT recebido do Supabase
3. Token armazenado no localStorage
4. Interceptor adiciona token em todas as requisições
5. Guards protegem rotas não autorizadas

## 🎨 Tema e Estilização

### Cores principais
```css
--primary: #0D47A1    /* Azul escuro */
--secondary: #3b82f6  /* Azul médio */
--success: #10b981    /* Verde */
--danger: #ef4444     /* Vermelho */
--warning: #f59e0b    /* Amarelo */
```

### Componentes Bootstrap
- Cards
- Modals
- Forms
- Tables
- Alerts
- Buttons
- Spinners
- Badges

### Ícones Font Awesome
```html
<i class="fa-solid fa-flask"></i>
<i class="fa-solid fa-file-import"></i>
<i class="fa-solid fa-chart-bar"></i>
```

## 📱 Responsividade

A aplicação é totalmente responsiva com breakpoints:
- Desktop: > 1200px
- Tablet: 768px - 1199px
- Mobile: < 768px

## 🚀 Deploy

### Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Build e deploy
vercel --prod
```

### Configurações no Vercel
1. Framework Preset: Angular
2. Build Command: `ng build --configuration production`
3. Output Directory: `dist/sysmlab/browser`
4. Node Version: 18.x ou 21.x

### Variáveis de ambiente
Configure no painel da Vercel:
- `API_URL`: URL da API backend
- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_KEY`: Chave anônima do Supabase

## 🐛 Troubleshooting

### Erro CORS
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solução**: Configure CORS na API backend para permitir origem do frontend.

### Erro de autenticação
```
401 Unauthorized
```
**Solução**: Faça login novamente. O token pode ter expirado.

### Build com erros
```
Error: Module not found
```
**Solução**: Limpe cache e reinstale dependências:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Testes falhando
```
Chrome Headless FAILED
```
**Solução**: Instale Chrome ou use ChromeHeadless:
```bash
ng test --browsers=ChromeHeadless
```

## 🔄 Atualizações

### Atualizar Angular
```bash
ng update @angular/core @angular/cli
```

### Atualizar dependências
```bash
npm update
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte a documentação da API
2. Verifique os logs do console do navegador (F12)
3. Entre em contato com a equipe de desenvolvimento

## 📄 Licença

Propriedade de CAERN - Companhia de Águas e Esgotos do Rio Grande do Norte.

## 🔗 Links Úteis

- [Angular Documentation](https://angular.dev)
- [Bootstrap Documentation](https://getbootstrap.com)
- [Font Awesome Icons](https://fontawesome.com)
- [Chart.js Documentation](https://www.chartjs.org)
- [Supabase Documentation](https://supabase.com/docs)
