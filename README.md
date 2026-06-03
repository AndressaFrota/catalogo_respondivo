# Portal D'Furlan Planejados — Guia de Configuração

> Portal interno de treinamentos e comunicação da equipe comercial.  
> Após seguir este guia **uma única vez**, todas as atualizações futuras se resumem a:  
> adicionar arquivos no Google Drive ou editar a planilha.  
> **Nenhuma linha de código será necessária.**

---

## Visão Geral da Arquitetura

```
Google Drive (arquivos)
        │
Google Sheets (metadados)
        │
Google Apps Script (API)
        │
Portal Web (HTML + JS)  ←  Vendedores acessam via link
```

---

## PASSO 1 — Criar as Pastas no Google Drive

1. Acesse [drive.google.com](https://drive.google.com)
2. Crie uma pasta raiz chamada **Portal D'Furlan**
3. Dentro dela, crie as seguintes subpastas:

| Pasta | Finalidade |
|---|---|
| `Novidades` | Comunicados, atualizações da empresa |
| `Venda e Negociação` | Treinamentos de vendas e técnicas |
| `Fornecedores` | Catálogos, vídeos e materiais de parceiros |
| `Escola D'Furlan` | Onboarding e desenvolvimento interno |

4. **Para cada pasta**, clique com botão direito → **Compartilhar** → altere para **"Qualquer pessoa com o link pode visualizar"**

### Como obter o ID de uma pasta

Abra a pasta no Drive. A URL ficará assim:

```
https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I0J
                                         ^^^^^^^^^^^^^^^^^^^^
                                         Este é o ID da pasta
```

Copie e guarde os 4 IDs (um por pasta).

---

## PASSO 2 — Criar a Planilha Google Sheets

1. Acesse [sheets.google.com](https://sheets.google.com)
2. Crie uma nova planilha
3. Renomeie para: **Portal D'Furlan**
4. Renomeie a primeira aba para: **Conteudos** (sem acento)
5. Na linha 1, insira os cabeçalhos **exatamente assim**:

```
ID | Categoria | Título | Descrição | LinkArquivo | Destaque | Ordem
```

### Exemplo de linha preenchida

| ID | Categoria | Título | Descrição | LinkArquivo | Destaque | Ordem |
|---|---|---|---|---|---|---|
| 1 | novidades | Lançamento Linha 2026 | Conheça os novos produtos | https://drive.google.com/file/d/ID/view | Sim | 1 |
| 2 | vendas | Técnica SPIN Selling | Como aplicar no dia a dia | https://drive.google.com/file/d/ID/view | Não | 2 |

### Regras importantes

- **Categoria**: use exatamente uma das opções: `novidades`, `vendas`, `fornecedores`, `escola`
- **Destaque**: escreva `Sim` para destacar o conteúdo no carrossel da home
- **Ordem**: número inteiro que define a posição de exibição (menor = primeiro)
- **LinkArquivo**: pode ser qualquer link do Google Drive, YouTube ou externo
- Deixe **LinkArquivo em branco** se o arquivo já estiver na pasta do Drive — ele será detectado automaticamente

### Como obter o ID da planilha

A URL da planilha ficará assim:

```
https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0J/edit
                                        ^^^^^^^^^^^^^^^^^^^^
                                        Este é o ID da planilha
```

---

## PASSO 3 — Configurar o Google Apps Script

1. Acesse [script.google.com](https://script.google.com)
2. Clique em **"Novo projeto"**
3. Nomeie o projeto: **Portal D'Furlan API**
4. Apague o código padrão
5. Cole **todo o conteúdo** do arquivo `apps-script.js` deste projeto
6. No topo do arquivo colado, preencha os IDs:

```javascript
const SPREADSHEET_ID = 'SEU_ID_DA_PLANILHA';
const SHEET_NAME     = 'Conteudos';

const FOLDER_IDS = {
  novidades:        'ID_DA_PASTA_NOVIDADES',
  vendas:           'ID_DA_PASTA_VENDA_E_NEGOCIACAO',
  fornecedores:     'ID_DA_PASTA_FORNECEDORES',
  escola:           'ID_DA_PASTA_ESCOLA_DFURLAN',
};
```

7. Clique em **Salvar** (ícone de disquete ou Ctrl+S)

---

## PASSO 4 — Publicar o Apps Script como API

1. No menu superior, clique em **Implantar → Nova implantação**
2. Clique no ícone de engrenagem ao lado de "Tipo" → selecione **"Aplicativo da Web"**
3. Preencha:
   - **Descrição**: Portal D'Furlan API v1
   - **Executar como**: Eu (meu e-mail)
   - **Quem tem acesso**: **Qualquer pessoa** (incluindo anônimos)
4. Clique em **Implantar**
5. Autorize as permissões quando solicitado (clique em "Avançado → Acessar ... mesmo assim")
6. Copie a **URL do aplicativo da Web** gerada — ficará assim:

```
https://script.google.com/macros/s/AKfycbXXXXXXXXXXXXXXXXXXX/exec
```

> **Guarde esta URL.** Ela é a sua API.

### Testando a API

Abra a URL no navegador. Você deve ver um JSON como:

```json
{
  "ok": true,
  "total": 5,
  "conteudos": [...],
  "destaques": [...],
  ...
}
```

Se aparecer isso, a API está funcionando. ✅

---

## PASSO 5 — Configurar o Portal

Abra o arquivo `config.js` e cole os IDs:

```javascript
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/SEU_ID/exec',  // ← Cole aqui

  FOLDER_IDS: {
    novidades:        'ID_DA_PASTA_NOVIDADES',        // ← Cole aqui
    vendas:           'ID_DA_PASTA_VENDA_E_NEGOCIACAO',
    fornecedores:     'ID_DA_PASTA_FORNECEDORES',
    escola:           'ID_DA_PASTA_ESCOLA_DFURLAN',
  },

  SPREADSHEET_ID: 'ID_DA_PLANILHA',                  // ← Cole aqui

  // Demais configurações podem permanecer como estão
};
```

Salve o arquivo.

---

## PASSO 6 — Publicar o Portal

Escolha **uma** das opções abaixo. Todas são gratuitas.

---

### Opção A — GitHub Pages (Recomendado)

**Pré-requisito**: conta gratuita em [github.com](https://github.com)

1. Crie um repositório novo (ex: `portal-dfurlan`)
2. Faça upload dos 5 arquivos:
   - `index.html`
   - `style.css`
   - `app.js`
   - `config.js`
3. Acesse **Settings → Pages**
4. Em "Source", selecione `Deploy from a branch`
5. Branch: `main` | Pasta: `/ (root)`
6. Clique em **Save**
7. Após 1-2 minutos, o portal estará em:

```
https://SEU-USUARIO.github.io/portal-dfurlan/
```

---

### Opção B — Netlify

1. Acesse [netlify.com](https://netlify.com) e crie uma conta gratuita
2. Na dashboard, arraste a **pasta com os 4 arquivos** para a área indicada ("Drag & drop your site here")
3. Em segundos, o site estará no ar com uma URL gerada automaticamente
4. Opcionalmente, renomeie o site em **Site settings → Site name**

URL final: `https://nome-escolhido.netlify.app`

---

### Opção C — Vercel

1. Acesse [vercel.com](https://vercel.com) e crie uma conta gratuita (pode usar o GitHub)
2. Clique em **"Add New… → Project"**
3. Importe o repositório GitHub criado no Passo A, **ou** use o Vercel CLI:

```bash
npm i -g vercel
cd pasta-do-portal
vercel
```

4. Siga as instruções na tela
5. URL final: `https://portal-dfurlan.vercel.app`

---

## PASSO 7 — Testar Tudo

Abra o link do portal e verifique:

- [ ] A tela de loading aparece e desaparece
- [ ] Os cards aparecem na home
- [ ] O carrossel de destaques funciona (se houver items com Destaque = Sim)
- [ ] Ao clicar em um card, o modal abre com preview do arquivo
- [ ] A busca encontra conteúdos por título e descrição
- [ ] Os filtros por tipo funcionam
- [ ] O botão de favoritar salva o item
- [ ] O dark mode funciona e é salvo ao reabrir
- [ ] No celular, o menu hambúrguer aparece e funciona

---

## Como Atualizar o Portal no Dia a Dia

### Para adicionar um vídeo ou arquivo
→ Basta colocar o arquivo na pasta correta do Drive.  
O portal detecta automaticamente em até 15 minutos (tempo do cache).  
Para forçar atualização imediata: clique no ícone de **recarregar** (↺) no canto superior direito do portal.

### Para adicionar título e descrição personalizados
→ Adicione uma linha na aba **Conteudos** da planilha com o link do arquivo.

### Para destacar um conteúdo no carrossel
→ Na planilha, coloque `Sim` na coluna **Destaque**.

### Para definir a ordem de exibição
→ Na planilha, preencha a coluna **Ordem** com números (1 = primeiro).

### Para atualizar a API após mudanças no Apps Script
→ Apps Script → Implantar → Gerenciar implantações → Editar → versão "Nova versão" → Implantar.

---

## Estrutura de Arquivos

```
portal-dfurlan/
├── index.html       ← Estrutura HTML completa (não alterar)
├── style.css        ← Design e tema (não alterar)
├── app.js           ← Lógica do portal (não alterar)
├── config.js        ← ✏️ Único arquivo que você edita
└── apps-script.js   ← Código para o Google Apps Script
```

---

## Solução de Problemas

**O portal fica na tela de loading**
→ A URL da API no `config.js` está incorreta ou o Apps Script não foi publicado corretamente. Abra a URL da API no navegador para testar.

**Os arquivos do Drive não aparecem**
→ Verifique se as pastas estão compartilhadas como "Qualquer pessoa com o link". Verifique os IDs das pastas no `config.js`.

**"Erro ao carregar dados" aparece**
→ O Apps Script pode ter expirado a autorização. Acesse o Apps Script e publique uma nova versão.

**O vídeo não abre no modal**
→ O arquivo de vídeo no Drive precisa estar compartilhado como "Qualquer pessoa com o link pode visualizar".

**A planilha não está sendo lida**
→ Certifique-se de que a aba se chama exatamente `Conteudos` (sem acento) e que os cabeçalhos estão na linha 1.

---

## Suporte Técnico

Em caso de dúvidas, o desenvolvedor que implementou este portal pode retomar a configuração com base neste README sem precisar de documentação adicional.

---

*Portal D'Furlan Planejados — Implementado com Google Drive API + Apps Script + HTML/CSS/JS puro*
