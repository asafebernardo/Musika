# Musika

App web de músicas cristãs, letras e cifras, no formato de um aplicativo de celular.

Este repositório é independente de [icer](https://github.com/asafebernardo/icer). Nada aqui chama a API, o banco ou o código daquele site.

## Stack

- React 18 e Vite na interface
- Node.js e Express na API
- Catálogo em `data/songs.json`

Cada música tem `id`, `numero`, `titulo` e `letra`. É o mesmo formato de `MusicaLetra` do hinário do ICER (`/Apps/musicas`), para a integração futura copiar os dados sem traduzir o modelo.

## Desenvolvimento

Requisitos: Node.js 22.

```bash
npm install
npm run dev:all
```

- Interface: http://127.0.0.1:5174
- API: http://127.0.0.1:3002 (`/api/health` e `/api/songs`)

## Administração

Em desenvolvimento, abra `/admin`. Em produção, publique o painel em um subdomínio próprio, por
exemplo `admin.seudominio.com`, apontando para a mesma aplicação e API. Configure
`VITE_ADMIN_HOST`/`VITE_ADMIN_URL` no build e `ADMIN_SETUP_TOKEN` no servidor. A chave de
configuração deve ter pelo menos 32 caracteres e é exigida para criar o primeiro administrador em
produção. Administradores podem visualizar a lista de contas, mas não cadastrar nem remover outras
pessoas pelo painel; essas remoções ficam restritas ao banco de dados ou à própria pessoa. Contas
de pessoa podem acessar o app e o próprio painel; somente administradores podem abrir o painel de
administração e gerenciar o catálogo. O cadastro público está disponível em `/cadastro`; cada
pessoa pode excluir a própria conta pelo painel da conta. O catálogo do app fica separado em
`/app`.

O estúdio administrativo oferece edição web em tela cheia, com seções laterais para Home, Letra,
Vozes e Cifra. O catálogo pode ser criado, editado e excluído sem abrir a interface mobile; a prévia
mobile acompanha as alterações antes de salvar.
Na seção Personalização, administradores definem os padrões globais de cor, visualização inicial,
tamanho da letra, tema e cronologia. Preferências individuais salvas no app continuam prevalecendo;
os padrões ficam em `data/app-settings.json`, arquivo local ignorado pelo Git.

O aplicativo pede login em `/login`. Para compartilhar
a sessão entre o domínio principal e o subdomínio do painel, configure `AUTH_COOKIE_DOMAIN` no
servidor, por exemplo `.seudominio.com`, e sirva ambos exclusivamente por HTTPS. Sem essa opção,
cada site mantém sua própria sessão. Senhas são armazenadas como hashes; os dados das contas ficam
em `data/users.json`, arquivo ignorado pelo Git. O painel e a autenticação requerem a API Node.js;
não ficam disponíveis na publicação estática do GitHub Pages.

`npm run dev` sobe só o Vite. `npm run dev:server` sobe só a API. As portas ficam fora das do ICER (5173 e 3001) para os dois poderem rodar ao mesmo tempo.

## Produção local

```bash
npm run build
set NODE_ENV=production
npm start
```

No PowerShell: `$env:NODE_ENV="production"; npm start`. O Node serve a API e a interface em http://127.0.0.1:3002.

## Integração futura

Quando for a hora de colocar a coletânea dentro do ICER, o encaixe previsto é a rota do hinário que já existe lá. Até lá, este app guarda e edita o próprio catálogo.
