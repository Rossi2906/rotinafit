# RotinaFit

App web de academia para quem precisa de uma rotina de treinos pronta e personalizada. Funciona **offline** (via service worker), sem cadastro e sem dependências. Pode ser instalado na tela inicial do celular como **PWA**. Para usar os vídeos embutidos, abra com o arquivo `Iniciar.bat` ou pelo endereço publicado; abrir o `index.html` direto também funciona, mas os vídeos são abertos no YouTube.

## O que faz

- **Monta uma rotina** a partir de 5 respostas: objetivo, nível, dias por semana, local de treino e observações.
- **Divisões inteligentes**: Full Body (2–3 dias), Upper/Lower (4–5 dias) ou Push/Pull/Legs (6 dias).
- **Respeita o equipamento**: academia completa, casa com halteres ou somente peso corporal.
- **Séries e descansos** ajustados ao objetivo (emagrecimento, hipertrofia, força ou condicionamento) e ao nível.
- **Biblioteca com 50+ exercícios**, com busca (ignora acentos), filtros e instruções passo a passo.
- **Vídeos reais do YouTube** para cada exercício, com player incorporado quando há internet e instruções detalhadas, link e botão para copiar quando não há.
- **Playlist de treino**: adicione exercícios pela biblioteca, reordene com as setas, ajuste séries/repetições/descanso e inicie um treino só com a sua seleção.
- **Edição da rotina**: troque, remova ou adicione exercícios em qualquer dia do plano gerado.
- **Modo treino**: marcação de séries, registro de carga (kg) e repetições por série, progresso em tempo real e cronômetro de descanso com aviso **sonoro e/ou vibração** (configurável).
- **Progresso**: treinos concluídos, minutos, sequência de dias, maior carga, gráfico semanal, evolução de carga por exercício e histórico.
- **Backup**: exporte e importe rotina, playlist, histórico e preferências em um arquivo JSON.
- **Offline e PWA**: service worker guarda o app para uso sem internet; manifest + ícone permitem instalar na tela inicial.
- Tudo salvo no `localStorage` do navegador.

## Como usar

1. Dê duplo clique em **Iniciar.bat** (Windows). Ele abre o app em `http://localhost:8080` e habilita o player de vídeo. Se preferir, rode `node servidor.js`, `npx serve .` ou `python -m http.server 8080` na pasta do projeto.
2. Toque em **Montar minha rotina**, responda o formulário e gere o plano.
3. Em **Exercícios**, toque no cartão de um exercício para assistir ao vídeo e ler as instruções. Use o botão **+** para colocá-lo na playlist. Sem internet — ou se tiver aberto o `index.html` direto — o app mostra um aviso, mantém as instruções e oferece o botão **Abrir no YouTube**.
4. Em **Minha rotina**, use os ícones de cada exercício para trocar ou remover, ou o botão **Adicionar exercício** em cada dia.
5. Em **Minha playlist**, ajuste as séries, repetições e descanso, reordene com as setas e toque em **Iniciar treino**.
6. No treino, marque cada série e preencha **kg** e **repetições** para registrar a carga. Use o cronômetro e escolha aviso por som, vibração ou ambos.
7. Em **Progresso**, acompanhe a evolução de carga por exercício. Use **Exportar backup** para salvar um arquivo e **Importar backup** para restaurá-lo em outro dispositivo.

> Se você abrir `index.html` com duplo clique, todo o app funciona normalmente, mas o YouTube bloqueia o player embutido por não receber o endereço da página (erro 153). Nesse caso, use **Iniciar.bat** ou o botão **Abrir no YouTube**. O service worker e a instalação como app exigem um endereço HTTP/HTTPS (não funcionam em `file://`).

## No celular

O layout é responsivo e funciona no Chrome (Android) e no Safari (iPhone). O caminho mais simples é usar o computador como servidor na mesma Wi-Fi:

1. No computador, dê duplo clique em **Iniciar.bat**. O terminal mostrará os endereços, por exemplo `http://192.168.1.23:8080`. Se não aparecer, rode `ipconfig` e use o **IPv4** da sua placa de rede.
2. Conecte o celular na **mesma rede Wi-Fi** do computador (evite rede de convidados).
3. No celular, abra o navegador e digite o endereço com o IP — **não use `localhost`**, pois no celular isso aponta para o próprio celular.
4. Se o Windows Firewall perguntar, permita o acesso na **rede privada**.

Para assistir aos vídeos embutidos, o celular também precisa de internet. Sem internet, o app mantém as instruções e mostra o botão **Abrir no YouTube**.

> Cada dispositivo salva seus dados no próprio navegador: a rotina criada no computador não aparece automaticamente no celular. Use **Exportar backup** no computador e **Importar backup** no celular. O site publicado em `https://rotinafit-one.vercel.app` funciona de qualquer lugar. Se o celular não conectar na mesma Wi-Fi, verifique se a rede bloqueia a comunicação entre dispositivos (isolamento de cliente/AP).

### Instalar como app (PWA)

No Chrome do Android: abra o site, toque no menu ⋮ e escolha **Instalar app** / **Adicionar à tela inicial**. No iPhone: abra no Safari, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**. Quando o navegador oferecer, o botão **Instalar app** também aparece no app. Depois de instalado, ele abre em tela cheia e continua funcionando offline.

### Funciona offline

Ao abrir o site uma primeira vez com internet, o service worker (`sw.js`) guarda a interface, os estilos, os scripts e o ícone. Depois disso, o app abre e funciona mesmo no modo avião. Os vídeos do YouTube continuam exigindo internet; sem conexão, o app mostra as instruções e o link para abrir depois. Para garantir que tudo foi guardado, deixe a página carregar completamente uma vez antes de ficar offline.

## Estrutura

```
.
├── Iniciar.bat         # atalho para iniciar o servidor local no Windows
├── servidor.js         # servidor local opcional, sem dependências
├── index.html          # interface (telas, formulário, playlist e modais)
├── css/styles.css      # layout, tema escuro, player de vídeo e responsividade
├── js/data.js          # exercícios, IDs dos vídeos, divisões e regras de séries
├── js/app.js           # geração da rotina, playlist, treino, vídeos e persistência
└── README.md
```

## Observações

Os vídeos são carregados do YouTube (via `youtube-nocookie.com`) e exigem internet; o restante do aplicativo funciona normalmente offline. O indicador no topo mostra o estado da conexão e o player volta automaticamente quando a internet retorna. O YouTube exige que a página tenha um endereço HTTP para embutir vídeos — por isso o app abre o YouTube em vez de mostrar o player quando você usa `file://`. Os vídeos e instruções são apenas educativos — não substituem a orientação de um profissional. As rotinas são sugestões gerais para pessoas saudáveis. Se você tem lesões, dores ou condições de saúde, procure um profissional de educação física ou médico antes de começar.
