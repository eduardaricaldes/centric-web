# Centric Web — Etapa 9: administração

Complemento do `BRIEFING.md`. As regras de trabalho, stack, identidade visual e
arquitetura daquele arquivo continuam valendo — leia-o antes se ainda não leu.
Aqui está só o que muda e o que entra de novo.

Trabalhe com a mesma autonomia: decida e execute, commit ao fim de cada bloco,
build e lint limpos.

---

## 0. Por que esta etapa existe

A API ganhou a Fase 6 (administração). Até ontem o RBAC era decorativo: dava para
*checar* papel, mas não para *criar* ministério, pôr gente dentro, dizer quem lidera
ou promover alguém — isso só com SQL na mão. Agora tem rota para tudo isso, e o
front não tem nenhuma tela. É o último buraco entre o sistema e a igreja conseguir
usá-lo sozinha.

A meta: **depois desta etapa, o único comando fora da tela é `make seed-admin`**, que
cria o primeiro admin e roda uma vez na vida do sistema.

---

## 1. Uma mudança que quebra o que já existe

**`POST /auth/register` agora exige `invite_token`.** Sem token, responde 403
`"Invite token is required"`. O cadastro aberto acabou: ninguém mais entra sozinho.

Isso quebra a tela de registro atual. O que fazer:

- `/register` só funciona com `?token=...` na URL. O campo de e-mail vem preenchido
  com o e-mail do convite quando ele tiver um, e o papel e o ministério **não
  aparecem na tela** — vêm dentro do convite, não são escolha de quem se cadastra.
- Sem token na URL: não mostre o formulário. Mostre uma tela explicando que o acesso
  é por convite e que é preciso pedir a quem lidera. Não deixe o formulário
  aparecer e só falhar no envio.
- A senha agora tem **mínimo de 8 caracteres** (`min_length=8`). Valide no Zod antes
  de enviar, com a mesma mensagem.
- `/auth/register` e `/auth/reset-password` têm **limite de 5 por minuto**. Trate
  **429** com uma frase decente ("Muitas tentativas. Espere um minuto e tente de
  novo."), não como erro genérico.

Outra mudança menor: **`PATCH /auth/me` agora aceita `name` além de `prefers_chords`**,
e os dois são opcionais. A tela de perfil pode deixar a pessoa corrigir o próprio nome.

---

## 2. A regra que evita o bug mais caro desta etapa

Para alguém ser líder, duas coisas precisam ser verdade em dois lugares:
`users.role = LEADER` **e** um `MinistryMember` com `role = LEADER`. Se só uma for
escrita, nasce o **meio-líder**: tem o papel global e nenhum ministério (não consegue
nada), ou lidera o ministério e continua `MEMBER` (também não consegue nada).

A API resolve isso sozinha, e é importante saber como:

- **Promover a líder é mexer no ministério, não no usuário.** Você chama
  `POST /ministries/{id}/members` (ou `PATCH .../members/{user_id}`) com
  `role: "LEADER"`, e a API chama `sync_global_role` internamente, ajustando
  `users.role` na mesma transação. Quem deixa de liderar o último ministério volta a
  `MEMBER` sozinho.
- **`PATCH /users/{id}/role` é para ADMIN**, não para líder. Use para promover alguém
  a administrador ou rebaixar.

**Nunca chame as duas rotas em sequência para "garantir".** Isso recria exatamente o
estado inconsistente que a API está evitando.

---

## 3. Endpoints novos

```
GET    /users/                      ?search= &page= &limit=   ADMIN e LEADER
                                    → {total, page, limit, items: [UserResponse]}
PATCH  /users/{id}/role             {role}  SÓ ADMIN  → UserResponse
POST   /users/{id}/reset-password   ADMIN e LEADER → {token, expires_at}

GET    /ministries/                 ADMIN e LEADER → {total, items: [{id, name}]}
POST   /ministries/                 {name, description?}  SÓ ADMIN
PATCH  /ministries/{id}             {name?, description?}  SÓ ADMIN
GET    /ministries/{id}/members     ADMIN e LEADER
                                    → [{user_id, name, role, instrument}]
POST   /ministries/{id}/members     {user_id, role, instrument?}
PATCH  /ministries/{id}/members/{user_id}   {role?, instrument?}
DELETE /ministries/{id}/members/{user_id}   → 204

POST   /invites/                    {email?, role, ministry_id?, ministry_role,
                                     instrument?}
                                    → {id, token, email, role, ministry_id,
                                       ministry_role, instrument, expires_at,
                                       created_at}
GET    /invites/                    → {total, items: [InviteResponse]}
DELETE /invites/{id}                → 204

POST   /auth/change-password        {current_password, new_password} → 204
POST   /auth/reset-password         {token, new_password} → 204
```

`InviteResponse` traz `ministry_name` e `created_by_name` já resolvidos — não precisa
cruzar nada no front para montar a lista.

**Não existe rota para apagar ministério.** É de propósito: o histórico de escala
precisa continuar de pé. Não desenhe o botão.

### Os erros que têm significado

| Situação | Resposta |
|---|---|
| Admin tentando rebaixar a si mesmo | 409 `An admin cannot demote themselves` |
| Rebaixar o último admin do sistema | 409 `Cannot remove the last admin` |
| Pessoa já é membro daquele ministério | 409 `User is already a member of this ministry` |
| Líder tentando marcar alguém como LEADER | 403 `Only ADMIN can set a member as LEADER` |
| Líder convidando fora do ministério dele, ou com papel acima de MEMBER | 403 |
| Token de convite inválido, expirado ou já usado | 403 |

Todos esses viram frase em português no `lib/errors.ts`. O 409 do "último admin" em
especial merece um texto que explique — é uma proteção, não um defeito.

### Quem convida quem

| Quem | Pode criar convite para |
|---|---|
| `ADMIN` | qualquer papel, qualquer ministério |
| `LEADER` | só `MEMBER`, e só no ministério que ele lidera |

Na tela do líder, o seletor de papel não aparece e o ministério vem travado no dele.

---

## 4. As telas

Entra uma seção **Administração** no menu lateral, **abaixo dos quatro itens atuais**,
com um rótulo pequeno separando (como o "Liderança" do protótipo). Visível só para
quem é `ADMIN` ou `LEADER` — use `canAdminister(user)` novo em `lib/permissions.ts`,
não espalhe comparação de papel pelas telas.

### 4.1 Pessoas · `/admin/users`

Tabela: nome, e-mail, papel, e as ações. Busca por nome ou e-mail com *debounce* de
400ms, paginação igual à do catálogo.

- Coluna de papel com selo colorido (ADMIN, LEADER, MEMBER).
- Ação **Promover a admin** / **Rebaixar** — só para `ADMIN`, e com confirmação, já
  que muda poder de verdade.
- Ação **Gerar link de nova senha** (`POST /users/{id}/reset-password`): abre um
  diálogo com o link montado (`<origem>/reset-password?token=...`), um botão de
  copiar, e a data de expiração. Deixe claro que o link é mostrado **uma vez só**.
- Para `LEADER`, a tabela é consulta: ele vê as pessoas e pode gerar link de senha,
  mas não mexe em papel.

**Pronta quando:** o próprio admin logado não tem botão de rebaixar a si mesmo; o 409
do último admin aparece explicado; o link de senha é copiável com um clique.

### 4.2 Ministérios · `/admin/ministries`

Lista dos ministérios. `ADMIN` cria e edita (nome e descrição); `LEADER` só vê.

Ao abrir um ministério (`/admin/ministries/:id`): a lista de membros com nome,
papel no ministério e instrumento.

- **Adicionar membro**: busca em `/users/` dentro de um painel, escolhe a pessoa,
  define papel e instrumento. Quem já é membro aparece marcado e desabilitado — o
  409 existe, mas o certo é não deixar chegar nele.
- **Editar membro**: muda papel e instrumento no mesmo lugar.
- **Remover membro**: com confirmação, lembrando que a escala passada não se apaga.
- O seletor de papel `LEADER` só aparece para `ADMIN` (403 caso contrário).

**Pronta quando:** promover alguém a líder ali reflete no papel global — recarregue e
confira que a pessoa aparece como `LEADER` também na tela de Pessoas. É a prova de
que você usou a rota certa da seção 2.

### 4.3 Convites · `/admin/invites`

O centro da etapa, porque é por aqui que a igreja entra no sistema.

- Botão **Novo convite**: e-mail (opcional), papel, ministério, papel no ministério e
  instrumento. Para `LEADER`, papel travado em `MEMBER` e ministério travado no dele.
- Ao criar, mostre o **link pronto** (`<origem>/register?token=...`) num diálogo, com
  botão de copiar e um aviso: **o token aparece só nesta tela**. A `GET /invites/`
  não devolve o token de novo, só os dados do convite.
- Lista dos convites em aberto: para quem, papel, ministério, quem criou, quando
  expira. Botão de cancelar (`DELETE`).
- Destaque visual para convite **expirado**, comparando `expires_at` com agora.

**Pronta quando:** dá para criar um convite, copiar o link, abrir numa janela anônima,
cadastrar e entrar — sem ninguém rodar comando nenhum.

### 4.4 Conta · dentro de `/profile`

Duas coisas que hoje não existem em lugar nenhum:

- **Trocar senha** (`POST /auth/change-password`): senha atual, nova, e confirmação.
  O 400 de senha atual errada tem mensagem própria.
- **Nome** editável, agora que `PATCH /auth/me` aceita.

### 4.5 Redefinir senha · `/reset-password?token=...` (pública)

Fora do login, igual ao `/register`. Nova senha e confirmação, `POST /auth/reset-password`.
Sem token na URL, explique que o link precisa ser pedido a quem administra. Trate 403
(token inválido, expirado ou usado) e 429 (limite por minuto) com frases distintas.

---

## 5. Antes de dizer que acabou

- Um `MEMBER` logado não vê a seção Administração, e digitar `/admin/users` na barra
  de endereço não abre a tela (proteja a rota, não só o menu).
- Um `LEADER` vê a seção, mas sem as ações de `ADMIN`.
- Os quatro estados (carregando, vazio, erro, sem permissão) em cada tela nova.
- Nenhum token de convite ou de reset aparece em `console.log`, em URL de navegação
  interna, ou em qualquer lugar além do diálogo que o mostra.
- `NOTAS.md` atualizado com o que você decidiu sozinho.
- Teste do fluxo inteiro em janela anônima: convite → cadastro → login → a pessoa
  aparece na lista de Pessoas com o papel certo.
