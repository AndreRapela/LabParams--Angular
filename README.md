# SYSmLab Web

Interface Angular do SYSmLab, voltada à gestão de amostras e resultados laboratoriais, monitoramento por limites legais, alertas e rastreabilidade.

## Requisitos

- Node.js 20–24
- API SYSmLab em execução
- Projeto Supabase configurado

## Desenvolvimento

```bash
npm ci
npm start
```

Abra `http://localhost:4200`.

As URLs da API e do Supabase ficam em `src/environments/environment.ts` e `src/environments/environment.prod.ts`. O navegador deve receber somente a chave **Publishable** do Supabase, nunca a Secret/Service Role.

## Build e deploy

```bash
npm run build
npm run vercel-build
```

O build de produção é gerado em `dist/sysmlab/browser`. O `vercel.json` inclui o fallback necessário para as rotas da SPA.

## Principais telas

- Dashboard Web e painel de TV.
- Cadastro e acompanhamento de amostras.
- Resultados numéricos e qualitativos com limites por legislação/contexto.
- Importação de CSV/XLSX.
- Alertas de não conformidade.
- Administração de parâmetros e usuários por perfil.
- Trilha de auditoria para gestores.

## Perfis

- `Usuário`: consulta de dashboards e catálogos.
- `Analista`: operação de amostras, resultados, importação e alertas.
- `Gestor`: administração completa, arquivamento, usuários e auditoria.

As rotas são protegidas no frontend e as permissões são novamente verificadas pela API.

## Qualidade

```bash
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
npm audit --omit=dev
```

A documentação de arquitetura, segurança, operação e prontidão de produto fica no repositório da API, em `docs/`.
