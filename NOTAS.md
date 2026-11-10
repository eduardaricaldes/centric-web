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

- A chave Gemini configurada no `.env` da API local não gerou nenhuma sugestão
  bem-sucedida nesta máquina (`AIServiceUnavailableError` → 503 toda vez que testei
  `POST /events/{id}/program/suggest`). Isso, na prática, testou exatamente o
  caminho que a Etapa 7 pede para não quebrar a tela — confirmado que funciona — mas
  não cheguei a ver o caminho feliz (sugestão aplicada de verdade) rodando ao vivo.
  O formato da resposta foi conferido contra `app/schemas/program.py`, não contra
  uma resposta real da IA.

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
- Etapa 6: concluída. Cadastro/edição de música com editor ChordPro único (gera
  lyrics e chordpro juntos) e pré-visualização estilo palco ao lado. Bloqueia saída
  com alteração pendente (useBlocker + beforeunload). Só ADMIN acessa a rota.
- Etapa 7: concluída. Programação com IA — briefing + duração alvo, linha do tempo
  com os blocos, tempo somado contra o alvo, alertas, "Aplicar no repertório" e
  "Descartar". IA indisponível não quebra a tela (testado ao vivo, ver nota acima).
  Botão de acesso fica no cabeçalho do evento, visível para ADMIN/LEADER.
- Etapa 8: concluída.
  - Perfil real (`/profile`) com o interruptor de `prefers_chords`, salvando via
    `PATCH /auth/me` — validado via curl.
  - Removido `PlaceholderPage`, que não era mais usado em nenhuma rota (todas as
    telas do BRIEFING existem de verdade agora).
  - Reauditei os quatro estados obrigatórios em toda tela: `SongDetail` não tinha o
    estado "sem permissão" (`ForbiddenState`), corrigido. As demais telas já tinham
    os quatro; onde uma ação específica (ex.: escalar alguém, aplicar programação)
    pode dar 403 mas a tela em si é de leitura livre, o erro aparece inline na ação,
    não como página cheia de "sem permissão" — é a leitura mais correta da regra
    3.1.9 ("esconder botão não é permissão") quando a maior parte da tela continua
    utilizável.
  - Responsivo até 1024px: troquei os layouts de duas colunas que usavam `lg:`
    (ativa em 1024px de *viewport*) para `xl:` (1280px) em `SongForm`, `Home`,
    `RosterTab` e `RepertoireBoard` — o menu lateral fixo de 264px + padding do
    conteúdo deixa menos de 1024px reais disponíveis, então duas colunas com uma
    coluna fixa de 320px cabiam apertado ou estourava exatamente no menor tamanho
    que a etapa pede para funcionar. Não tive como testar isso com o navegador de
    verdade nesta sessão (extensão do Chrome desconectada, ver nota acima) — foi
    revisão de CSS/breakpoint, não verificação visual ao vivo.
  - Nenhum texto em inglês encontrado numa varredura por `grep` em textos visíveis e
    `aria-label`s. Nenhum `fetch` fora de `src/api/`. Nenhum `any` em `types.ts`.
    Nenhum `dangerouslySetInnerHTML`. Nenhum `role === "ADMIN"` espalhado pelas
    telas — tudo passa por `lib/permissions.ts`.
  - Tamanho de fonte do modo palco: já salvo desde a Etapa 3 (`localStorage`, via
    `lib/storage.ts`), sem trabalho adicional aqui.

## Etapa 9 — administração (Fase 6 da API)

Segue o `BRIEFING-ADMIN.md`. Conferido direto contra `../centric-api/app` (rotas,
schemas e modelos), não só contra o documento.

- **Convite não é JWT — é um token opaco (`secrets.token_urlsafe(32)`), guardado só
  com hash (`token_hash`) no banco.** Não existe `GET /invites/{token}` nem qualquer
  rota pública para ler os dados de um convite antes do cadastro. Isso significa que
  o "e-mail vem preenchido" do BRIEFING-ADMIN (seção 1) não pode vir de uma consulta
  do front — a única fonte real é a própria resposta de `POST /invites/`, que já
  mostra o e-mail (quando o convite tem um) para quem está criando o convite. Por
  isso o link montado na tela de Convites (`InvitesPage`) inclui `&email=...` na URL
  quando o convite tem e-mail amarrado, e `Register.tsx` só lê esse parâmetro para
  preencher e travar o campo — nenhum dado é inventado, só passado adiante do que a
  API já devolveu no momento da criação. Convite sem e-mail (`email: null`) deixa o
  campo livre para a pessoa digitar, exatamente como a API permite (`invite.email is
  None` pula a checagem no `POST /auth/register`).

- **`GET /invites/` já filtra convite usado e expirado no servidor**
  (`app/api/invites.py`, `list_invites`: `.filter(Invite.used_at.is_(None))` e
  `.filter(Invite.expires_at > utcnow())`). O BRIEFING-ADMIN pede "destaque visual
  para convite expirado, comparando `expires_at` com agora" — implementei a
  comparação em `InvitesPage.tsx` (`isExpired`) por segurança e para não deixar o
  requisito não-atendido no código, mas hoje ela nunca deve disparar de verdade,
  porque a API não devolve convite expirado nessa lista. Documentando para quem for
  medir cobertura: não é bug do front, é como a API filtra.

- **`GET /ministries/` não traz `description`, e não existe `GET /ministries/{id}`.**
  Só `POST`/`PATCH /ministries/{id}` devolvem `MinistryDetailResponse` com a
  descrição. Sem uma consulta que traga o ministério individual, a tela de edição
  não tem como saber a descrição atual de um ministério que não foi criado/editado
  nesta sessão pelo navegador atual. Decisão: `MinistriesPage.tsx` guarda a
  descrição vista da última vez (cache do TanStack Query, chave
  `["ministry-description", id]`) e usa isso para pré-preencher o formulário de
  edição; quando não há nada guardado, o campo abre vazio **e o PATCH só manda a
  chave `description` quando o campo não está vazio** — deixar em branco não some
  com a descrição salva no banco (a API usa `exclude_unset`, então omitir a chave
  preserva o valor atual). Efeito colateral aceito: não dá para *apagar* uma
  descrição existente por esta tela (só substituir por outro texto). Não implementei
  nada mais elaborado (ex.: pré-carregar descrição de todos os ministérios ao entrar
  na lista) porque não existe rota em lote para isso sem `GET /ministries/{id}`.

- **Rebaixar administrador é um botão binário (ADMIN ⇄ MEMBRO), não um seletor de
  papel.** `PATCH /users/{id}/role` só recebe `{role}` e não conhece ministério —
  quem sincroniza `LEADER` é `sync_global_role`, chamado só pelas rotas de
  ministério (seção 2 do BRIEFING-ADMIN). Se uma pessoa for administradora **e**
  também líder de um ministério (caso raro, mas possível: promovida a admin depois
  de já liderar algo), rebaixar por `UsersPage` manda ela para `MEMBER` — o próximo
  evento que sincronizar aquele ministério (qualquer PATCH/POST/DELETE de membro
  daquele ministério) devolve o papel `LEADER` de verdade outra vez. Optei por não
  "resolver" isso adivinhando o papel certo no front (exigiria saber de quais
  ministérios a pessoa lidera, o que `GET /users/` não devolve) nem encadear uma
  segunda chamada "para garantir" — é exatamente o padrão que a seção 2 do
  BRIEFING-ADMIN manda evitar.

- **LEADER continua sem uma rota que diga "de quais ministérios eu sou líder"**
  (mesma lacuna já registrada na Etapa 5 para `canManage`). Isso afeta duas telas
  novas: o seletor de ministério em "Novo convite" (`InvitesPage`) e o botão de
  gerenciar membros em `MinistryMembersPage` — ambos ficam otimistas para qualquer
  LEADER (mostram a ação para todos os ministérios) e contam com o 403 real da API
  (`ensure_ministry_manager`) para barrar quem tentar um ministério que não lidera.
  Mensagem de erro traduzida em `lib/errors.ts` ("Ministry leader access required").

- **`AddMemberPanel` busca pessoa por `GET /users/?search=`** (a mesma rota da tela
  Pessoas), limitando a 8 resultados. Marca como desabilitado quem já é membro do
  ministério aberto, usando a lista já carregada de `GET /ministries/{id}/members`
  — a checagem de 409 existe na API, mas aqui dá para não deixar chegar nele, como
  pede a seção 4.2.

- **`Dialog` e `ConfirmDialog` são componentes novos em `src/components/`.** Não
  existia nada parecido no projeto até a Etapa 9 (todas as ações anteriores eram
  diretas, sem confirmação). A Etapa 9 é a primeira a exigir confirmação de verdade
  (promover/rebaixar admin, remover membro de ministério, cancelar convite) — regra
  explícita no BRIEFING-ADMIN ("com confirmação, já que muda poder de verdade").

- **O que falta / pendente de teste ao vivo:** como na Etapa 0, a extensão do Chrome
  não estava conectada nesta sessão — a validação foi por leitura cruzada do código
  da API (`app/api/*.py`, `app/schemas/*.py`) e por `npm run build`/`npm run lint`,
  não por clicar de verdade no navegador. O fluxo "convite → cadastro → login →
  aparece em Pessoas" (seção 5 do BRIEFING-ADMIN) não foi exercitado ponta a ponta
  contra uma API rodando. Recomendo rodar esse fluxo manualmente antes de considerar
  a etapa fechada de fato.

## Publicação

- **Descrição de ministério vem da API.** `GET /ministries/` agora traz `description`, então o cache local
  da Etapa 9 saiu, e apagar a descrição pela tela passou a funcionar.
- **`POST /auth/change-password` devolve um token novo.** A API derruba os tokens antigos ao trocar a senha,
  e o perfil guarda o novo para a sessão continuar.
- **Link de senha:** a API só libera para LEADER quando o alvo é `MEMBER` do ministério que ele lidera. Para
  o líder, o botão some nas linhas de ADMIN e LEADER, e o 403 aparece no diálogo para membro de outro
  ministério.
- **Convite:** `LEADER` não escolhe mais o papel no ministério, e papel de líder exige ministério.
- **`/events/:id/program`** agora mostra a programação aplicada (`GET /events/{id}/program`), e membros também
  têm acesso, só para leitura.

## Correções depois do teste real no navegador (06/11/2026)

Primeira rodada clicando de verdade, com API e banco temporários, como ADMIN, LEADER e MEMBER.

- **Modo palco: a música inteira cabe por ajuste de fonte e colunas.** `useFitLyrics` em
  `Stage.tsx` mede no DOM e escolhe a maior fonte até o tamanho salvo pela pessoa, tentando 2,
  1, 3 e 4 colunas, nessa ordem de preferência (duas colunas continua sendo o padrão da seção
  6). O A+ passa a ser um teto: numa música longa, ele pode não mudar nada. Mínimo de 14px. Se
  nem assim couber, a música sai das colunas e rola na vertical, o que acontece com cifra de 40
  linhas em 1024x768. A regra "sem rolagem" cede aí porque a alternativa era letra ilegível.
- **Erro de rede ou 500 em `/auth/me` não derruba mais a sessão.** `RequireAuth` mostra o erro
  com "Tentar de novo" e mantém o token. Só 401 leva ao login.
- **Salvar música navega depois de desligar a trava de saída.** Antes o `useBlocker` barrava a
  própria navegação do salvar, e a tela pedia confirmação de alterações já salvas.

## Segunda rodada como usuário (10/11/2026)

Teste ponta a ponta clicando de verdade, com API e banco temporários: música com cifra, evento,
repertório, convite → cadastro, escala, pregação, programação com IA, modo palco e celular.
Cinco correções:

- **Cifra colada de site (acordes em cima da letra) vira ChordPro.** `normalizeChordPro` em
  `lib/chordpro.ts` encaixa cada acorde na coluna em que estava, transforma `[Refrão]` e
  `[Intro] G D` em `{comment: ...}`, e é idempotente. Roda ao colar no formulário, ao salvar,
  e também na hora de exibir/transpor, então músicas antigas salvas nesse formato já
  transpõem certo sem precisar editar. Antes, o tom dizia "B (+1)" e os acordes ficavam em Bb.
- **Diretivas ChordPro.** `{comment: Verso 1}`, `{soc}` etc. viram rótulo de parte; `{title}`,
  `{artist}`, `{key}`, `{eoc}` e desconhecidas somem da tela. Vale para pré-visualização,
  detalhe e palco. A visão "Letra" agora sai de `toLyricLines(chordpro)` em vez de
  `song.lyrics`, porque a API ainda gera `lyrics` com `to_plain_lyrics` do Python, que não
  conhece diretivas nem o formato de acordes em cima — **o `chordpro.py` da API precisa
  ganhar a mesma conversão** para que `lyrics` salvo no banco fique limpo.
- **Celular.** Abaixo de 1024px o menu lateral vira gaveta, aberta por um botão na barra do
  topo, fechando ao navegar, com Esc ou tocando fora. De 1024px para cima nada muda.
- **Teclado no modo palco.** → / PageDown próxima música, ← / PageUp anterior, Esc sai —
  é o que um pedal Bluetooth de virar página manda.
- **Mudar a resposta da escala.** Depois de confirmar aparece "Não vou mais poder"; depois
  de recusar, "Consigo ir, sim". A API já aceitava a troca.
