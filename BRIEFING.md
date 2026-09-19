# Centric Web — briefing de execução

Este arquivo é o prompt de trabalho. Leia inteiro antes de escrever a primeira linha.
Ele é auto-suficiente: tudo que você precisa saber sobre a API, o visual e a ordem de
execução está aqui. Não é preciso perguntar nada para começar.

Pasta do front: `centric-web/` (esta).
Pasta da API, só para consulta: `../centric-api/` — **nunca edite nada lá dentro.**

---

## 0. Como trabalhar

**Você tem autonomia. Decida e execute.** Não pare a cada passo para pedir aprovação.

Pode fazer sem perguntar:
- criar, editar e apagar arquivos dentro de `centric-web/`;
- instalar as dependências listadas na seção 2;
- rodar `npm run dev`, `npm run build`, `npm run lint`;
- criar commits locais.

Pare e pergunte só nestes casos:
- este briefing contradiz o que a API realmente faz (a API manda; anote e pergunte);
- precisa de dependência que não está na lista;
- `git push`, deploy, ou qualquer mudança em `../centric-api`.

Ao terminar cada etapa da seção 7:
1. `npm run build` e `npm run lint` passando, sem erro e sem warning novo;
2. um commit com mensagem curta em português (`feat: catálogo de músicas com busca`);
3. uma linha dizendo o que ficou pronto e qual é a próxima etapa.

Regras de escrita:
- Texto de interface em **português do Brasil**. Nomes de variáveis, funções, arquivos e
  commits de código em **inglês**, igual à API.
- Datas no formato brasileiro (20/09/2026), nunca ISO na tela.
- Nunca invente dado que a API não devolve. Se faltar campo para uma tela, implemente o que
  dá, e anote o que falta em `NOTAS.md` na raiz do projeto.
- Nunca renderize letra ou cifra como HTML. É texto do usuário, vai como texto.

---

## 1. O que é o Centric

Ferramenta da Comunidade North para organizar o culto: catálogo de músicas com letra e cifra,
repertório do evento, escala de músicos e pregadores, e um rascunho de programação gerado por IA.

O uso que importa mais é **domingo de manhã, alguém com um notebook ou tablet lendo a letra
enquanto canta**. A tela de palco é a razão de o projeto existir; tudo se subordina a ela.

Quem usa:

| Papel | O que faz |
|---|---|
| `ADMIN` | tudo |
| `LEADER` | cria eventos, escala pessoas e monta repertório **do ministério que lidera** |
| `MEMBER` | consulta músicas, letras, cifras, repertório e a própria escala; confirma presença |

Além do papel global existe papel por ministério (`LEADER`/`MEMBER` em Louvor, Mídia, Pregação).

---

## 2. Stack — já decidida, não reabra

- **React 18 + Vite + TypeScript**
- **React Router** (rotas)
- **TanStack Query** (cache, loading, erro, retry)
- **Tailwind CSS** (estilo)
- **React Hook Form + Zod** (formulários e validação)
- **@dnd-kit/core + @dnd-kit/sortable** (arrastar o repertório — precisa funcionar com toque)
- **date-fns** com locale pt-BR (datas)

Nada de Next.js: o app inteiro fica atrás de login e não precisa de SEO nem SSR.
Nada de biblioteca de componentes prontos: os componentes são nossos, em `src/components`.

A API roda em `http://localhost:8000` e o CORS dela já libera `http://localhost:5173`,
que é a porta padrão do Vite. Use `VITE_API_URL` no `.env`, com esse valor como padrão.

---

## 3. A API

Base: `VITE_API_URL`. Tudo que não é `/auth/login`, `/auth/register` e `/health/db` exige
o header `Authorization: Bearer <token>`.

### 3.1 As nove regras que quebram o front se forem ignoradas

1. **O login não é JSON.** `POST /auth/login` usa `application/x-www-form-urlencoded`, e o
   campo do e-mail chama-se `username`:
   `username=eduarda@x.org&password=1234`. Mandar JSON devolve 422.
   O `POST /auth/register`, esse sim, é JSON.

2. **Barra final nas coleções.** `/songs/`, `/playlist/`, `/events/`,
   `/playlist/{id}/songs/` — **com** barra. Sem ela o FastAPI responde 307 e o header
   `Authorization` pode se perder no redirecionamento, virando um 401 sem motivo aparente.
   Já `/auth/me`, `/me/assignments` e `/assignments/{id}` são **sem** barra final.

3. **`prefers_chords` decide o que a pessoa vê.** É um booleano no usuário. Quem tem `true`
   recebe a música em cifra por padrão; quem tem `false` recebe letra limpa. O parâmetro
   `?view=lyrics|chords` força a visão em qualquer rota que aceite. Precisa existir um
   interruptor "sou músico / quero ver a cifra" no perfil, salvando com `PATCH /auth/me`.

4. **Listagem devolve UMA visão; o detalhe devolve as duas.**
   `GET /songs/` e `GET /events/{id}` mandam ou `lyrics` ou `chordpro`, nunca os dois.
   `GET /songs/{id}` manda os dois campos.

5. **Transponha no navegador, não no servidor.** Existe `?transpose=-11..11` (só junto com
   `view=chords`), mas usar isso no palco significa uma requisição por meio tom — e a tela de
   palco precisa funcionar com a internet ruim da igreja. Faça assim: peça **uma vez**
   `?view=chords`, guarde o ChordPro cru, e no navegador:
   - tirar os `[...]` dá a letra limpa;
   - trocar a nota dentro dos `[...]` dá a transposição.
   A regra exata está em `../centric-api/app/services/chordpro.py` — replique o comportamento
   (sustenido por padrão; acorde escrito com bemol continua bemol; baixo depois da barra, como
   `[D/F#]`, transpõe também). Escreva isso em `src/lib/chordpro.ts` **com teste unitário**.

6. **Busca sem resultado devolve `total: 0` e lista vazia** — não é mais 404. Mas
   `GET /songs/{id}` inexistente continua 404. Trate os dois diferente.

7. **Música repetida na playlist devolve 409.** Marque no seletor as que já estão no
   repertório em vez de deixar o erro acontecer.

8. **`PUT /playlist/{id}/songs/reorder` exige todos os ids**, na ordem final, sem faltar nem
   sobrar nenhum. Faltou um, é 400.

9. **Esconder botão não é permissão.** A API responde 403 de verdade. Esconder é conforto
   visual; a tela precisa aguentar o 403 com uma mensagem decente.

### 3.2 Endpoints

```
POST   /auth/register            JSON {name, email, password, prefers_chords?} → 201
POST   /auth/login               form-urlencoded {username, password} → {access_token, token_type, role}
GET    /auth/me                  → {id, name, email, role, prefers_chords}
PATCH  /auth/me                  JSON {prefers_chords} → usuário atualizado

GET    /songs/                   ?search= &artist= &page= &limit= &view= &transpose=
POST   /songs/                   (admin/líder)
GET    /songs/{id}               ?view= &transpose=   → traz lyrics E chordpro
PUT    /songs/{id}               exige título e letra
PATCH  /songs/{id}               parcial — prefira este para editar
DELETE /songs/{id}

GET    /events/                  ?from= &to= &type= &status= &page= &limit=
POST   /events/                  (admin/líder)
GET    /events/{id}              ?view=  → evento + assignments + preaching + playlist + warnings
PUT    /events/{id}
DELETE /events/{id}
POST   /events/{id}/assignments  escalar alguém
GET    /events/{id}/preaching
PUT    /events/{id}/preaching

PATCH  /assignments/{id}         trocar pessoa/função
DELETE /assignments/{id}
POST   /assignments/{id}/respond JSON {status: "CONFIRMADO" | "RECUSADO"} — o próprio escalado
GET    /me/assignments           "onde eu estou escalado"

GET    /playlist/                ?search= &page= &limit=
POST   /playlist/
GET    /playlist/{id}
PUT    /playlist/{id}            parcial
DELETE /playlist/{id}
GET    /playlist/{id}/songs/
POST   /playlist/{id}/songs/     {song_id, position?} — sem position vai para o fim
PATCH  /playlist/{id}/songs/{item_id}   {position}
PUT    /playlist/{id}/songs/reorder     {item_ids: [...]}
DELETE /playlist/{id}/songs/{item_id}

POST   /events/{id}/program/suggest  {briefing, duracao_alvo_min} → rascunho da IA
POST   /events/{id}/program/apply    {suggestion_id, programacao?} → grava na playlist
```

### 3.3 Os valores fixos

```
UserRole          ADMIN | LEADER | MEMBER
EventType         CULTO | ENSAIO | CONFRATERNIZACAO | ACAO_MISSIONARIA | EVENTO_ESPECIAL | OUTRO
EventStatus       RASCUNHO | PUBLICADO
AssignmentStatus  CONVIDADO | CONFIRMADO | RECUSADO
ProgramBlock      tipo: MUSICA | MOMENTO | PREGACAO; MUSICA exige song_id,
                  MOMENTO e PREGACAO exigem titulo; ordem começa em 1 e é sequencial
```

`GET /events/{id}` devolve também `warnings`, uma lista. Hoje só existe o código
`USER_MULTIPLE_MINISTRIES` (mesma pessoa em dois ministérios no mesmo evento). Mostre o aviso
pelo `message`, mas trate a lista como aberta — vão aparecer outros códigos.

Os tipos TypeScript de tudo isso ficam em `src/api/types.ts`, escritos à mão a partir desta
seção. Confira contra `http://localhost:8000/docs` antes de começar.

---

## 4. Identidade visual

É a identidade da Comunidade North: azul da marca, base clara e quente, e um âmbar que marca
só o que é música — cifra, tom, e o que pede atenção. O palco é quase preto, azulado.

```
--north        #2A4795   azul da marca: botão principal, item ativo, links
--north-deep   #1C3068   hover do azul
--north-tint   #ECEFF9   fundo de item ativo e de selo de tom
--navy         #0B1226   palco, blocos de destaque, hero
--ink          #101423   texto principal
--ivory        #F6F4EF   fundo da aplicação
--surface      #FFFFFF   cartões
--line         #E4E0D6   bordas
--muted        #5F5D57   texto secundário
--amber        #E8A863   acento: cifra, tom, aviso (sobre fundo escuro)
--amber-ink    #9C5A22   o mesmo acento em texto sobre fundo claro
--green        #2E6F4E   confirmado        --green-tint  #E7F1EA
--red          #A33A32   recusado          --red-tint    #F8EAE8
```

Tipografia (Google Fonts):
- **Fraunces** — títulos, números de posição, e a letra no modo palco. Peso 600, tracking
  levemente negativo nos títulos grandes.
- **Karla** — todo o resto da interface.
- **IBM Plex Mono** — cifra e o editor ChordPro. Monoespaçada é obrigatório: é o que mantém o
  acorde em cima da sílaba certa.

Forma:
- Cantos: 10–12px em botões e campos, 16px em cartões.
- Altura mínima de clique: 44px.
- Menu lateral fixo de 264px, branco, com a marca em cima e o usuário embaixo.
- Cartões brancos sobre o marfim, borda de 1px, sem sombra — sombra só no item sendo arrastado.
- O ícone da marca é uma chama branca sobre um quadrado azul de 40px, canto 11px.
- Ícones: SVG traçado, 1.8 de espessura, `currentColor`. Nunca emoji.

Contraste: o âmbar `#E8A863` só serve como texto sobre o navy. Em fundo claro use `#9C5A22`.

Tema escuro não é enfeite, é requisito de palco: a tela de palco é escura sempre,
independentemente do tema do sistema.

---

## 5. Arquitetura

```
src/
  api/          client.ts (fetch + token + 401), auth.ts, songs.ts, events.ts,
                assignments.ts, playlists.ts, programs.ts, types.ts
  features/
    auth/       login, registro
    songs/      catálogo, detalhe, formulário
    stage/      modo palco
    events/     lista, evento, repertório, escala
    program/    sugestão da IA
    profile/    perfil e prefers_chords
  components/   Button, Input, Select, Card, EmptyState, ErrorState, Skeleton, Badge,
                StatusPill, Sidebar, PageHeader
  lib/          chordpro.ts, dates.ts, errors.ts, storage.ts, permissions.ts
  routes/       router.tsx, ProtectedRoute.tsx
```

Regras de arquitetura que economizam retrabalho:

- **`fetch` só existe dentro de `src/api/`.** Nenhuma tela chama `fetch` direto; cada uma usa
  uma função com nome (`listSongs`, `addSongToPlaylist`). A API vai mudar, e quando mudar só
  essa pasta muda.
- **Permissão numa função só**: `canManage(user, ministryId?)` em `lib/permissions.ts`, nunca
  `user.role === "ADMIN"` espalhado pelas telas.
- **401 em qualquer resposta** limpa o token, manda para o login e guarda a rota de origem
  para voltar depois.
- **Erros traduzidos num lugar só**: `lib/errors.ts` mapeia status + rota para frase em
  português. A API responde em inglês (`Song not found`, `Ministry leader access required`);
  o usuário nunca vê isso.
- Busca e página vão para a **URL** (`?search=ousado&page=2`), para sobreviver ao voltar.
- Token em `localStorage`, lido e escrito só por `lib/storage.ts`.

---

## 6. As telas

Nove telas. Para cada uma, o que ela faz e quando está pronta.

**1. Login** — e-mail e senha, regra 3.1.1. Pronta quando: senha errada dá mensagem em
português; API fora do ar dá "Não consegui falar com o servidor" com botão de tentar de novo;
o botão bloqueia durante o envio; recarregar a página mantém a sessão.

**2. Criar conta** — nome, e-mail, senha e o interruptor "quero ver a cifra"
(`prefers_chords`). Todo mundo entra como `MEMBER`. Pronta quando: e-mail repetido (400) dá
"Este e-mail já está cadastrado", e depois de criar já entra direto, sem voltar ao login.

**3. Início** — cabeçalho com a data de hoje; bloco escuro do **próximo evento** (data, hora,
tipo, status, quantas músicas, quantos confirmaram) com botões "Abrir evento" e "Modo palco";
embaixo, em duas colunas: o repertório do próximo evento à esquerda e **minha escala**
(`GET /me/assignments`) à direita, com os botões Confirmar / Não posso nos itens `CONVIDADO`.
Pronta quando: sem evento futuro, mostra um vazio digno; confirmar presença atualiza na hora.

**4. Músicas** — tabela (título, artista, tom, cifra sim/não, categoria, atualizada, editar),
busca por título e artista com *debounce* de 400ms, paginação. Pronta quando: busca vazia
mostra "Nenhuma música encontrada" e não erro; a busca sobrevive ao voltar da música.

**5. Modo palco** — a tela mais importante. Fundo `--navy`, ocupa a janela inteira.
- Topo: sair, nome do evento, "3 de 5", A− / A+, indicador de tela acesa (Wake Lock; onde não
  existir, ignore em silêncio).
- Título, artista e **controle de tom**: − / tom atual / +, com "TOM ORIGINAL" ou "+2 SEMITONS"
  embaixo. Tudo calculado no navegador.
- Alternador **Letra / Cifra**. O padrão vem de `prefers_chords`.
- A letra em **duas colunas**, a música inteira na tela, sem rolar. Em cifra: linha de acordes
  em âmbar e monoespaçada sobre a linha da letra. Em letra: Fraunces, maior.
- **Sem rolagem automática.** Foi decisão de projeto e continua valendo.
- Rodapé: anterior / próxima e os atalhos das músicas do culto.
- Pronta quando: depois que o evento carregou, trocar de música, trocar de visão e transpor
  **não faz nenhuma requisição**; dá para ler a dois metros no tamanho máximo; a última música
  não quebra o "próxima"; o tamanho de fonte escolhido fica salvo.

**6. Eventos** — lista com filtros de período, tipo e status; selo de RASCUNHO/PUBLICADO.
Pronta quando: dá para achar o próximo domingo sem procurar.

**7. Evento** — cabeçalho com título, selos e data, botões "Editar" e "Modo palco", e três
abas: **Repertório**, **Escala**, **Pregação**.
- *Repertório*: lista arrastável (dnd-kit, funcionando com toque), posição, tom, selo de cifra,
  remover; ao soltar chama `reorder` com todos os ids; à direita, painel de busca para
  adicionar, com as que já estão marcadas como "Já no culto".
- *Escala*: pessoas agrupadas por ministério, com função e selo de status em cor; os `warnings`
  do evento aparecem em destaque no topo; painel para escalar alguém.
- *Pregação*: tema, referência bíblica e pregador.
- Pronta quando: a ordem muda na tela na hora e só depois confirma com o servidor — e volta
  atrás se o servidor recusar.

**8. Nova música / editar** — título, artista, tom original, categoria e o editor **ChordPro**
em monoespaçada, com o acorde entre colchetes na sílaba em que entra. Ao lado, pré-visualização
ao vivo de como fica no palco, com alternador Letra/Cifra. Editar usa `PATCH`.
Pronta quando: o campo da letra é grande e confortável (uma letra tem 40 linhas); sair com
alteração pendente pergunta antes; a pré-visualização acompanha o que está sendo digitado.

**9. Programação com IA** — briefing em texto livre e duração alvo; o rascunho vem em blocos
(música, momento, pregação) numa linha do tempo, com o tempo somado contra a duração alvo, o
resumo da IA e os alertas. Dois botões: **Aplicar no repertório** e **Descartar**. O rascunho
fica marcado como "NÃO APLICADO" até ser aplicado.
Pronta quando: a IA falhando não quebra a tela — mostra o erro e o culto continua editável à
mão; nada entra na playlist sem o clique de aplicar.

**Em todas as telas, quatro estados obrigatórios**: carregando (esqueleto com a forma do
conteúdo), vazio, erro (com saída), e sem permissão. Uma tela sem os quatro não está pronta.

---

## 7. Ordem de execução

Cada etapa termina com algo que roda. Não avance com a anterior quebrada.

**Etapa 0 — fundação.** Vite + TS + Tailwind com os tokens da seção 4; fontes; `src/api/client.ts`
com token e tratamento de 401; `types.ts`; login, registro, rota protegida, menu lateral,
`lib/permissions.ts`, `lib/dates.ts`, `lib/errors.ts`, e os componentes base.
*Pronto quando:* entro, saio, recarrego e continuo dentro.

**Etapa 1 — chordpro.** `src/lib/chordpro.ts` com `toPlainLyrics`, `transposeChordPro` e
`transposeTone`, mais teste unitário (Vitest) cobrindo sustenido, bemol, acorde com baixo e
texto sem acorde. É a peça que a etapa 3 depende; faça agora, isolada.

**Etapa 2 — músicas.** Catálogo com busca e paginação + tela da música com Letra/Cifra e
transposição.

**Etapa 3 — modo palco.** A tela do domingo, com tudo derivado de uma requisição só.

**Etapa 4 — eventos.** Lista, evento, repertório com arrastar e soltar.

**Etapa 5 — escala.** Escala do evento, minha escala e confirmação de presença.

**Etapa 6 — cadastro.** Editor ChordPro com pré-visualização.

**Etapa 7 — programação com IA.**

**Etapa 8 — acabamento.** Perfil com `prefers_chords`, os quatro estados revisados em toda
tela, mensagens em português, tamanho de fonte salvo, responsivo até 1024px de largura.

Se o tempo acabar na etapa 3, o projeto já entregou valor real: dá para achar a música e
cantar no domingo.

---

## 8. Antes de dizer que acabou

- `npm run build` e `npm run lint` limpos.
- Nenhum `fetch` fora de `src/api/`.
- Nenhum texto em inglês visível na interface.
- Nenhuma data em formato ISO na tela.
- Nenhum `any` solto em `src/api/types.ts`.
- Os testes do `chordpro.ts` passando.
- Modo palco: com a aba de rede aberta, trocar de música / visão / tom não gera requisição.
- `NOTAS.md` atualizado com o que faltou na API e as decisões que você tomou sozinho.

---

## 9. Armadilhas conhecidas

- Mandar JSON no login (regra 3.1.1). É o erro número um.
- Esquecer a barra final e levar 307 + 401 (regra 3.1.2).
- Transpor chamando a API a cada meio tom (regra 3.1.5).
- Tratar busca vazia como erro (regra 3.1.6).
- Renderizar letra com `dangerouslySetInnerHTML`. Nunca.
- Usar fonte proporcional na cifra: o acorde sai de cima da sílaba e a tela perde a função.
- Arrastar que só funciona com mouse: metade da equipe usa tablet.
- Espalhar `role === "ADMIN"` pelas telas em vez de usar `canManage`.
