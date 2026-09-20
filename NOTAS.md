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

- **~~Sem endpoint para listar pessoas ou ministérios~~ — resolvido pela API.**
  Quando a Etapa 0 começou a API não tinha `GET /ministries` nem forma de listar
  pessoas por ministério; documentei aqui que a Etapa 5 ia precisar improvisar. No
  commit `c41b300` (19/09) a API ganhou `GET /ministries/` e
  `GET /ministries/{id}/members` (ambos ADMIN/LEADER, devolvem `user_id`, `name`,
  `role` — LEADER/MEMBER — e `instrument`, sem e-mail). `src/api/ministries.ts` já
  existe com os dois. O painel de "escalar alguém" da Etapa 5 usa isso direto: lista
  ministérios, escolhe um, lista os membros, escolhe a pessoa. Não precisa mais do
  plano de improviso com `UserSummary` espalhado.

- **`canManage(user, ministryId?)` pode ficar mais preciso agora.** Com
  `GET /ministries/{id}/members` dá pra checar de verdade se o usuário atual é
  `role: "LEADER"` naquele ministério (em vez de só confiar que todo LEADER vê a
  ação). Ainda assim, a tela precisa aguentar 403 de verdade (regra 3.1.9) —
  decisão de quanto refinar isso fica para a Etapa 5, quando a tela de escala for
  escrita.

- **`duration_min` em música e `total_duration_min` em repertório.** Descobertos ao
  reler a API na Etapa 2 (não estavam na primeira leitura da Etapa 0 — a API evoluiu
  entre uma sessão e outra, commit `c41b300`). `Song.duration_min` é opcional
  (inteiro, minutos). `GET /playlist/{id}` e `GET /events/{id}` agora somam
  `total_duration_min` no repertório — útil para a Etapa 9 (Programação com IA)
  comparar tempo somado contra a duração alvo sem o front precisar somar na mão.
  `types.ts` já reflete os dois campos.

- **`EventWarning` ganhou um segundo formato.** Além de `USER_MULTIPLE_MINISTRIES`
  (`user_id` + `ministry_ids`), agora existe `SONG_RECENTLY_USED` (`song_id`,
  quando a mesma música volta a tocar em menos de 28 dias, janela de
  `services/programs.py`). `EventWarning` em `types.ts` já trata os três campos
  específicos como opcionais — sempre mostrar pelo `message`.

- **Escala e Pregação saíram da Etapa 4 e foram para a Etapa 5.** A tela "Evento"
  (seção 6, tela 7) tem três abas — Repertório, Escala, Pregação — mas a seção 7 só
  agenda "repertório com arrastar e soltar" na Etapa 4; Escala fica explícita na
  Etapa 5, e Pregação não tem etapa dona. Juntei Pregação com Escala na Etapa 5
  porque as duas precisam da mesma solução para escolher uma pessoa. Etapa 4
  entregou Repertório completo; as outras duas abas ficaram "ainda vai ser
  construída" até a Etapa 5 chegar.

- **Como "escalar alguém" e "definir pregador" escolhem uma pessoa, sem `GET /users`.**
  A ideia registrada aqui na Etapa 4 (juntar os membros de todos os ministérios numa
  lista única) acabou não sendo necessária: a Etapa 5 usa um seletor em cascata —
  escolhe o ministério (`GET /ministries/`), depois a pessoa dentro dele
  (`GET /ministries/{id}/members`) — que é mais fiel ao domínio (você escala alguém
  *para* um ministério) e mais simples de implementar. `src/features/events/useMinistries.ts`
  tem os dois hooks, reusados por `RosterTab` (escala) e `PreachingTab` (pregador).
  Limitação que continua real: quem não é membro de nenhum ministério não aparece em
  nenhum seletor — não tem como escalar essa pessoa ou marcá-la como pregadora pelo
  front hoje.

- **Não existe `POST /ministries/` nem forma de adicionar membro a um ministério pela
  API.** Só há as duas rotas de leitura. Ministérios e suas pessoas são cadastrados
  fora do alcance deste front (banco de dados direto, script de seed, ou uma
  ferramenta interna que não foi construída aqui). Testei a Etapa 5 inserindo dados
  de teste direto no Postgres local — isso não é algo que o front deveria fazer em
  produção, é só uma limitação de ambiente de teste que documento para quem for medir
  cobertura: o CRUD de ministérios/membros não está no escopo do BRIEFING nem da API
  atual.

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
- Etapa 4: concluída. Lista de eventos com filtros, formulário de evento, repertório
  com arrastar/soltar (dnd-kit, otimista com reversão em erro), busca para adicionar
  música. Escala e Pregação ficam para a Etapa 5 (ver decisão acima).
- Etapa 5: concluída. Escala (agrupada por ministério, painel de escalar com seletor
  em cascata ministério→pessoa), Pregação (mesmo padrão de seletor), Início real
  (próximo evento em destaque, repertório dele, "minha escala" com
  confirmar/recusar). Validado via curl com dados de teste no Postgres local (ver
  nota sobre `POST /ministries/` acima).
