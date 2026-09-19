# Notas de execução

Decisões tomadas sem parar para perguntar, gaps da API, e o que falta. Atualizado a
cada etapa da seção 7 do BRIEFING.md.

## Decisões

- **Catálogo de músicas é ADMIN-only.** O BRIEFING original (seção 3.2, linha
  `POST /songs/ (admin/líder)`) diz que líder também pode gerenciar músicas, mas o
  código da API (`app/core/dependencies.py`, `require_admin`) só libera `ADMIN` nas
  rotas `POST/PUT/PATCH/DELETE /songs/{id}` — líder recebe 403 de verdade. Perguntado
  ao dono do projeto: confirmado que a API manda. `canManageSongs(user)` em
  `src/lib/permissions.ts` esconde os botões de criar/editar/excluir para quem não é
  ADMIN; LEADER e MEMBER veem a tabela inteira, só leitura.

- **Sem endpoint para listar pessoas ou ministérios.** A tela de escala (seção 6,
  tela 7 "Evento" > aba Escala) descreve um "painel para escalar alguém", que precisa
  de uma lista de pessoas e ministérios para escolher. A API não tem `GET /users` nem
  `GET /ministries` — só existe `POST /events/{id}/assignments` esperando `user_id` e
  `ministry_id` que o front já deve saber de antemão. Isso vai ser tratado na Etapa 5:
  o plano é aproveitar oportunisticamente os `UserSummary`/`MinistrySummary` que já
  aparecem embutidos nas respostas de assignments e pregação (nomes e ids de quem já
  foi escalado em qualquer evento) para montar um combobox, com um campo de id manual
  como reforço. Documentado aqui porque é uma limitação real da API, não um bug do
  front — regra 0 do BRIEFING ("implemente o que dá, anote o que falta").

- **`canManage(user, ministryId?)` é otimista para LEADER.** Não existe endpoint que
  devolva "de quais ministérios eu sou líder" (`ensure_ministry_manager` no backend
  checa isso via tabela `ministry_members`, inacessível ao front). Por isso qualquer
  LEADER vê as ações de gestão de escala/repertório de evento; se ele não for líder
  daquele ministério específico, a API responde 403 de verdade e a tela precisa
  aguentar isso (regra 3.1.9) — o que já é exigido em todas as telas.

## Ambiente local (não afeta o código, só o teste)

- Na minha máquina de desenvolvimento, a porta 8000 já está ocupada por outra API
  (não é a Centric). Rodei a Centric API localmente na porta 8001 só para validar o
  contrato via `curl` (registro, login form-urlencoded, `/auth/me`, 401 sem token,
  307 em `/songs` sem barra, 422 ao mandar JSON no login) — tudo bateu com a seção
  3.1 do BRIEFING. `.env` do projeto continua apontando para `http://localhost:8000`,
  que é o padrão documentado.
- A extensão do Chrome usada para automação de navegador não estava conectada nesta
  sessão, então a Etapa 0 não teve uma verificação visual/interativa real no
  navegador (login → sair → recarregar clicando de verdade). O fluxo foi validado por
  `curl` contra a API real e por `npm run build`/`npm run lint`. Também havia um
  segundo obstáculo: as portas 5173/5174 já estavam em uso por outros projetos nesta
  máquina, então o dev server subiu em 5175 — fora da lista de origens liberadas pelo
  CORS da API (`http://localhost:5173,http://localhost:3000`), então um teste real
  pelo navegador nesta máquina exigiria liberar a porta 5173 primeiro.

## O que falta (por etapa)

- Etapa 0: concluída. Fundação, auth, layout protegido.
