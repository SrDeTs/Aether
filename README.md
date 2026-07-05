# JellyMusic 🎵

**JellyMusic** é um reprodutor de música web moderno, elegante e altamente responsivo projetado especificamente para se conectar e transmitir áudio diretamente do seu servidor pessoal **Jellyfin**. 

Desenvolvido com foco na estética visual e em interações fluidas, o JellyMusic oferece uma interface impecável baseada em design de vidro (glassmorphism), animações de transição suaves e paletas de cores dinâmicas para proporcionar a melhor experiência de audição para a sua biblioteca de áudio.

---

## ✨ Funcionalidades Principais

*   **Conexão Jellyfin Direta:** Conecte-se com segurança ao seu servidor pessoal usando o endereço do servidor e suas credenciais (Usuário/Senha). Seus dados de login são armazenados de forma segura e localmente.
*   **Reprodutor de Áudio Completo:** Controles clássicos de reprodução (reproduzir, pausar, pular, retroceder, controle de volume, barra de progresso interativa e modo de repetição/embaralhamento).
*   **Fila de Reprodução Dinâmica:** Gerencie as faixas que serão tocadas a seguir, adicione músicas à fila ou limpe-a com facilidade.
*   **Navegação Organizada:** Navegue facilmente por suas músicas organizadas por:
    *   **Álbuns:** Visualização em grade elegante das capas dos álbuns.
    *   **Artistas:** Descubra e explore músicas agrupadas por criador.
    *   **Faixas:** Lista completa de todas as músicas disponíveis.
    *   **Músicas Recentes / Histórico:** Acesso rápido às últimas músicas reproduzidas.
*   **Busca em Tempo Real:** Encontre rapidamente músicas, álbuns ou artistas usando a barra de busca dinâmica integrada.
*   **Personalização & Temas Dinâmicos:** 
    *   Escolha paletas de cores customizadas e gradientes nas configurações.
    *   O aplicativo extrai e adapta as cores do tema do player em tempo real com base nas paletas de cores selecionadas.
*   **Experiência Visual Imersiva:** Totalmente animado com `framer-motion`, oferecendo transições de tela agradáveis e micro-interações táteis nos botões e controles.

---

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído utilizando um ecossistema moderno e de alto desempenho:

*   **Vite** & **React 19:** Inicialização ultrarrápida e renderização eficiente baseada em componentes funcionais e hooks customizados.
*   **TypeScript:** Segurança estática de tipos e melhor produtividade no desenvolvimento.
*   **Tailwind CSS v4:** Estilização utilitária de última geração com suporte nativo a variáveis CSS e temas otimizados.
*   **Framer Motion:** Animações fluidas de entrada, saída, transições de rotas e gestos interativos.
*   **Radix UI / Shadcn UI:** Componentes de interface acessíveis, robustos e customizados sem sombras pesadas ou poluição visual.
*   **Lucide React:** Coleção consistente de ícones vetoriais modernos.
*   **Convex / Convex Auth:** Sincronização em tempo real e infraestrutura segura de backend/autenticação.
*   **Sonner:** Mensagens de feedback (toasts) elegantes e não intrusivas.

---

## 📁 Estrutura do Projeto

```text
├── src/
│   ├── assets/             # Arquivos de mídia e logotipos estáticos
│   ├── components/         # Componentes de interface reutilizáveis (UI)
│   ├── convex/             # Funções de backend, esquemas e autenticação do Convex
│   ├── hooks/              # Hooks customizados para controle do Jellyfin, Player e Configurações
│   │   ├── use-auth.ts     # Hook para controle de sessão/autenticação Convex
│   │   ├── use-jellyfin.tsx# Cliente de integração com a API do Jellyfin
│   │   ├── use-player.tsx  # Estado global do reprodutor de áudio e fila
│   │   └── use-settings.tsx# Preferências de interface e cores do usuário
│   ├── pages/              # Telas e visualizações do aplicativo
│   │   ├── Landing.tsx     # Tela inicial com chamada para conectar
│   │   ├── Connect.tsx     # Tela de login e configuração do servidor Jellyfin
│   │   ├── Player.tsx      # Interface principal do reprodutor (Biblioteca + Controles)
│   │   └── Auth.tsx        # Gerenciamento de credenciais e registro do Convex
│   ├── index.css           # Estilização global e variáveis de tema com Tailwind CSS v4
│   ├── main.tsx            # Ponto de entrada do React com provedores globais e roteamento
│   └── types/              # Definições de tipos TypeScript do sistema
├── package.json            # Scripts e dependências do projeto
└── tsconfig.json           # Configuração do TypeScript
```

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos

Certifique-se de ter instalado em sua máquina:
*   [Node.js](https://nodejs.org/) (v18 ou superior)
*   [Bun](https://bun.sh/) ou `npm` como gerenciador de pacotes

### Passo a Passo

1.  **Clonar o repositório:**
    ```bash
    git clone <url-do-repositorio>
    cd jellymusic
    ```

2.  **Instalar as dependências:**
    ```bash
    bun install
    # ou usando npm:
    npm install
    ```

3.  **Configurar as Variáveis de Ambiente:**
    Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:
    ```bash
    cp .env.example .env
    ```
    Preencha a URL de conexão do Convex no seu arquivo `.env`:
    ```env
    VITE_CONVEX_URL=https://sua-url-do-convex.convex.cloud
    ```

4.  **Iniciar o servidor de desenvolvimento:**
    ```bash
    bun run dev
    # ou usando npm:
    npm run dev
    ```
    Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver o aplicativo em funcionamento.

5.  **Compilar para produção:**
    ```bash
    bun run build
    # ou usando npm:
    npm run build
    ```

---

## 🔒 Segurança & Privacidade

O JellyMusic se conecta **diretamente** ao endereço do servidor Jellyfin fornecido por você através de chamadas HTTPS/WSS seguras da API do Jellyfin. Nenhum dado de áudio ou informações de credenciais são enviados para servidores de terceiros ou armazenados fora do seu ambiente e do seu banco de dados privado do Convex.
