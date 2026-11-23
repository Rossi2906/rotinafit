# RotinaFit

App web de academia para quem precisa de uma rotina de treinos pronta e personalizada. Funciona **offline**, sem cadastro e sem dependências. Para usar os vídeos embutidos, abra com o arquivo `Iniciar.bat`; abrir o `index.html` direto também funciona, mas os vídeos são abertos no YouTube.

## O que faz

- **Monta uma rotina** a partir de 5 respostas: objetivo, nível, dias por semana, local de treino e observações.
- **Divisões inteligentes**: Full Body (2–3 dias), Upper/Lower (4–5 dias) ou Push/Pull/Legs (6 dias).
- **Respeita o equipamento**: academia completa, casa com halteres ou somente peso corporal.
- **Séries e descansos** ajustados ao objetivo (emagrecimento, hipertrofia, força ou condicionamento) e ao nível.
- **Biblioteca com 50+ exercícios**, com busca (ignora acentos), filtros e instruções passo a passo.
- **Vídeos reais do YouTube** para cada exercício, com player incorporado quando há internet e instruções detalhadas, link e botão para copiar quando não há.
- **Playlist de treino**: adicione exercícios pela biblioteca, reordene com as setas, ajuste séries/repetições/descanso e inicie um treino só com a sua seleção.
- **Modo treino**: marcação de séries, progresso em tempo real e cronômetro de descanso com aviso sonoro.
- **Progresso**: treinos concluídos, minutos, sequência de dias, gráfico semanal e histórico.
- Tudo salvo no `localStorage` do navegador.

## Como usar

1. Dê duplo clique em **Iniciar.bat** (Windows). Ele abre o app em `http://localhost:8080` e habilita o player de vídeo. Se preferir, rode `node servidor.js`, `npx serve .` ou `python -m http.server 8080` na pasta do projeto.
2. Toque em **Montar minha rotina**, responda o formulário e gere o plano.
3. Em **Exercícios**, toque no cartão de um exercício para assistir ao vídeo e ler as instruções. Use o botão **+** para colocá-lo na playlist. Sem internet — ou se tiver aberto o `index.html` direto — o app mostra um aviso, mantém as instruções e oferece o botão **Abrir no YouTube**.
4. Em **Minha playlist**, ajuste as séries, repetições e descanso, reordene com as setas e toque em **Iniciar treino**.
5. Marque as séries, use o cronômetro e finalize para registrar no progresso.

> Se você abrir `index.html` com duplo clique, todo o app funciona normalmente, mas o YouTube bloqueia o player embutido por não receber o endereço da página (erro 153). Nesse caso, use **Iniciar.bat** ou o botão **Abrir no YouTube**.

## No celular

O layout é responsivo e funciona no Chrome (Android) e no Safari (iPhone). O caminho mais simples é usar o computador como servidor na mesma Wi-Fi:

1. No computador, dê duplo clique em **Iniciar.bat**. O terminal mostrará os endereços, por exemplo `http://192.168.1.23:8080`. Se não aparecer, rode `ipconfig` e use o **IPv4** da sua placa de rede.
2. Conecte o celular na **mesma rede Wi-Fi** do computador (evite rede de convidados).
3. No celular, abra o navegador e digite o endereço com o IP — **não use `localhost`**, pois no celular isso aponta para o próprio celular.
4. Se o Windows Firewall perguntar, permita o acesso na **rede privada**.

Para assistir aos vídeos embutidos, o celular também precisa de internet. Sem internet, o app mantém as instruções e mostra o botão **Abrir no YouTube**.

> Cada dispositivo salva seus dados no próprio navegador: a rotina criada no computador não aparece automaticamente no celular. Para acessar de qualquer lugar, publique a pasta em GitHub Pages, Netlify ou Vercel e use o endereço público no lugar do IP. Se o celular não conectar mesmo na mesma Wi-Fi, verifique se a rede bloqueia a comunicação entre dispositivos (isolamento de cliente/AP).

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
