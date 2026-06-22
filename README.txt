PROGRAMA FLL - AVALIAÇÃO ONLINE

VERSÃO CORRIGIDA
- Firebase configurado no arquivo firebase-config.js.
- Botão Sair corrigido em todas as páginas.
- Tela principal sem exibir senhas/instruções de acesso.
- Admin padrão: usuário admin / senha FLL@2026MG.
- Painel administrativo com criação de usuários para juízes.
- Página de avaliação corrigida com as rubricas completas de Projeto de Inovação e Design do Robô.

ARQUIVOS
- index.html: login.
- avaliacao.html: formulário do juiz.
- admin.html: painel administrativo.
- login.js: login do admin e dos juízes.
- avaliacao.js: montagem e envio dos formulários.
- admin.js: painel, exportação CSV e criação de juízes.
- data.js: rubricas e admin padrão.
- firebase-config.js: configuração Firebase.
- style.css: visual estilo pontuação da robótica.

ACESSO ADMIN
Usuário: admin
Senha: FLL@2026MG

COMO CRIAR JUÍZES
1. Entre como admin.
2. Vá na área "Criar usuário para juiz".
3. Informe nome, usuário e senha.
4. O juiz entra pelo mesmo index.html usando o usuário e senha criados.

COLEÇÕES FIRESTORE USADAS
- avaliacoes_fll
- usuarios_fll

REGRAS TEMPORÁRIAS PARA TESTE
Use estas regras apenas durante testes ou evento interno:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /avaliacoes_fll/{doc} {
      allow read, write: if true;
    }
    match /usuarios_fll/{doc} {
      allow read, write: if true;
    }
  }
}

OBSERVAÇÃO IMPORTANTE
Este login usa usuário e senha salvos no Firestore para facilitar o evento.
Para uma versão mais segura, o ideal é usar Firebase Authentication.
