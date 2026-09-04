MEU ESTUDO ORGANIZADO — como publicar no GitHub Pages
========================================================

Você não precisa instalar nada nem usar terminal. Siga estes passos:

1. Extraia (descompacte) o arquivo ZIP no seu computador.
   Você vai ver uma pasta com arquivos como "index.html", "styles.css", "app.js" etc.

2. Abra, no navegador, o repositório do GitHub onde o site vai morar
   (ex.: https://github.com/miihzteir/Meu-Estudo-Organizado).

3. Clique em "Add file" → "Upload files".

4. Arraste TODOS os arquivos e pastas que estavam dentro do ZIP
   (não arraste a pasta em si — entre nela e arraste o conteúdo).
   Confirme que o arquivo "index.html" ficará na raiz do repositório
   (não dentro de uma subpasta).

5. Role até o final da página e clique em "Commit changes".

6. Aguarde 1 ou 2 minutos para o GitHub Pages publicar. Depois acesse:
   https://miihzteir.github.io/Meu-Estudo-Organizado/

Pronto! O app já deve abrir com o visual roxo/lilás, o menu lateral,
os ícones e tudo funcionando — inclusive sem internet, depois da
primeira visita (ele funciona como PWA e pode ser "instalado").

--------------------------------------------------------------
ONDE COLAR AS REGRAS DO FIREBASE (opcional, só se for usar login)
--------------------------------------------------------------

O app funciona 100% sem login (os dados ficam salvos no próprio
aparelho). Se você quiser habilitar o login com Google e a
sincronização na nuvem, faça isto no Console do Firebase
(https://console.firebase.google.com), no projeto
"meuestudoorganizado-46535":

1. Abra "Firestore Database" → aba "Regras" → apague o conteúdo
   e cole o conteúdo do arquivo "firestore.rules" (está no ZIP)
   → clique em "Publicar".

2. Abra "Storage" → aba "Regras" → apague o conteúdo e cole o
   conteúdo do arquivo "storage.rules" (está no ZIP)
   → clique em "Publicar".

3. Ainda no Console do Firebase, vá em "Authentication" →
   "Sign-in method" → habilite "Google" (se ainda não estiver
   habilitado).

4. Por fim, confirme o domínio do site: em "Authentication" →
   aba "Settings" → "Authorized domains" → clique em
   "Add domain" → digite:
      miihzteir.github.io
   → salve.

Sem esse último passo, o botão "Entrar com Google" não vai
funcionar no site publicado (vai funcionar normalmente em
qualquer aparelho sem login, só a sincronização na nuvem depende
disso).

Qualquer dúvida, os textos dentro do próprio app (em
Configurações → Como usar) explicam o passo a passo de uso.
