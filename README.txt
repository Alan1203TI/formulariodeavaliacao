PROGRAMA FLL - AVALIAÇÃO ONLINE

O que vem neste pacote:
- index.html: tela de login
- avaliacao.html: formulário para juízes
- admin.html: painel administrativo
- data.js: senhas dos juízes e textos das rubricas
- firebase-config.js: configuração do Firebase
- style.css: layout

ACESSOS PADRÃO
Juízes:
- juiz1 / 1234
- juiz2 / 1234
- juiz3 / 1234
- juiz4 / 1234

Administrador:
- admin / admin123

IMPORTANTE: antes de publicar, altere as senhas no arquivo data.js.

CONFIGURAR FIREBASE
1. Acesse https://console.firebase.google.com
2. Crie um projeto.
3. Entre em Firestore Database.
4. Clique em Criar banco de dados.
5. Comece em modo de teste para validar.
6. Vá em Configurações do projeto > Seus apps.
7. Crie um app Web.
8. Copie as configurações do firebaseConfig.
9. Cole no arquivo firebase-config.js.

REGRAS TEMPORÁRIAS DO FIRESTORE PARA TESTE
Use apenas para teste local/evento curto:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /avaliacoes_fll/{doc} {
      allow read, write: if true;
    }
  }
}

PUBLICAR NO GITHUB PAGES
1. Suba todos os arquivos para um repositório no GitHub.
2. Vá em Settings > Pages.
3. Em Source, selecione Deploy from a branch.
4. Escolha main e /root.
5. Aguarde o link ser gerado.

COMO USAR
1. O juiz entra no site.
2. Faz login com usuário individual.
3. Escolhe Projeto de Inovação ou Design do Robô.
4. Informa equipe, nome e sala.
5. Marca as notas de cada linha.
6. Se marcar Excelente, precisa preencher comentário.
7. Envia a avaliação.
8. O admin entra no painel e acompanha tudo online.
9. O admin pode exportar CSV, que abre no Excel.

OBSERVAÇÃO
Este sistema usa login simples por arquivo data.js, suficiente para evento interno.
Para uma versão mais segura, o ideal é usar Firebase Authentication com contas individuais.
