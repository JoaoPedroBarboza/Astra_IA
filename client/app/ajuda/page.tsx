import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import {
  AccessibilityIcon,
  AudioLinesIcon,
  BrainIcon,
  ChevronDownIcon,
  HelpIcon,
  HistoryIcon,
  InfoIcon,
  KeyboardIcon,
  LifeBuoyIcon,
  LightbulbIcon,
  LockIcon,
  MessageIcon,
  MicIcon,
  PhoneOffIcon,
  RocketIcon,
  ScanEyeIcon,
  ScreenShareIcon,
  SlidersIcon,
  SparklesIcon,
  UserIcon,
  VideoIcon,
} from "@/components/icons";
import { formatarCreditos, formatarPreco, PLANOS_A_VENDA, tempoEstimado } from "@/lib/planos";

/**
 * Central de ajuda: guia de uso para quem usa a Astra, sem termos técnicos. É pública
 * (dá para ler antes de entrar) e os números dos planos vêm de lib/planos.ts, então
 * nunca ficam diferentes do que o app aplica.
 */

export const metadata: Metadata = {
  title: "Central de ajuda",
  description: "Como usar a Astra: voz, texto, câmera e tela, histórico, memória, créditos e acessibilidade.",
};

type Topico = { id: string; titulo: string; resumo: string; icone: ReactNode };

const TOPICOS: Topico[] = [
  { id: "primeiros-passos", titulo: "Primeiros passos", resumo: "Criar conta, entrar e liberar o microfone.", icone: <RocketIcon size={18} /> },
  { id: "voz", titulo: "Conversar por voz", resumo: "Iniciar, falar, interromper e encerrar.", icone: <MicIcon size={18} /> },
  { id: "texto", titulo: "Conversar por texto", resumo: "Escrever para a Astra durante a sessão.", icone: <MessageIcon size={18} /> },
  { id: "visao", titulo: "Câmera e tela", resumo: "Mostrar à Astra o que você está vendo.", icone: <ScanEyeIcon size={18} /> },
  { id: "historico", titulo: "Histórico de conversas", resumo: "Rever, continuar, renomear e apagar.", icone: <HistoryIcon size={18} /> },
  { id: "memoria", titulo: "Memória da Astra", resumo: "O que ela lembra de você entre conversas.", icone: <BrainIcon size={18} /> },
  { id: "planos", titulo: "Créditos e planos", resumo: "Saldo, renovação e limites de cada plano.", icone: <SparklesIcon size={18} /> },
  { id: "conta", titulo: "Conta e dispositivos", resumo: "Perfil, senha, microfone e volume.", icone: <UserIcon size={18} /> },
  { id: "acessibilidade", titulo: "Acessibilidade", resumo: "Teclado, legendas, leitor de tela e mais.", icone: <AccessibilityIcon size={18} /> },
  { id: "privacidade", titulo: "Privacidade", resumo: "O que fica salvo e como se proteger.", icone: <LockIcon size={18} /> },
  { id: "problemas", titulo: "Problemas comuns", resumo: "Soluções rápidas para o que pode dar errado.", icone: <LifeBuoyIcon size={18} /> },
];

const topico = (id: string) => TOPICOS.find((t) => t.id === id)!;

export default function Ajuda() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-panel focus:px-4 focus:py-2 focus:text-sm focus:text-fg"
      >
        Pular para o conteúdo
      </a>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] overflow-hidden">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute left-1/2 top-0 h-[32rem] w-[56rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,rgb(124_140_255/0.16),transparent_62%)]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="Astra IA, ir para o console" className="rounded-lg">
            <Wordmark size={26} />
          </Link>
          <span className="hidden text-subtle sm:inline">/</span>
          <span className="hidden text-sm font-medium text-fg sm:inline">Central de ajuda</span>
          <Link
            href="/"
            className="btn-primary ml-auto flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold"
          >
            <AudioLinesIcon size={15} />
            Abrir a Astra
          </Link>
        </div>
      </header>

      <main id="conteudo" className="relative mx-auto w-full max-w-6xl flex-1 px-4 pb-20 sm:px-6">
        <section className="pb-10 pt-14 text-center sm:pt-20">
          <span className="ring-gradient mx-auto mb-5 flex w-fit items-center gap-2 rounded-full bg-white/4 px-3.5 py-1.5 text-xs font-medium text-fg">
            <HelpIcon size={14} className="text-accent" />
            Central de ajuda
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-5xl">
            Como usar a <span className="ai-gradient-text">Astra</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted">
            A Astra é uma assistente que conversa com você por voz em tempo real, entende o que você
            escreve e enxerga sua câmera ou sua tela. Aqui está tudo o que você precisa para{" "}
            <span className="whitespace-nowrap">usá-la bem.</span>
          </p>
        </section>

        <nav aria-label="Tópicos da ajuda">
          {/* No celular, duas colunas só com o título: a lista inteira cabe em pouco espaço. */}
          <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {TOPICOS.map((t) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  className="panel group flex h-full items-center gap-2.5 p-3 transition-colors hover:border-line-strong hover:bg-white/4 sm:items-start sm:gap-3 sm:p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white/4 text-accent sm:h-9 sm:w-9 sm:rounded-xl">
                    {t.icone}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium leading-snug text-fg sm:text-sm">{t.titulo}</span>
                    <span className="mt-0.5 hidden text-xs leading-relaxed text-muted sm:block">{t.resumo}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-16 lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="Nesta página" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-3 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
                Nesta página
              </p>
              <ul className="space-y-0.5 border-l border-line">
                {TOPICOS.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-muted transition-colors hover:border-accent hover:text-fg"
                    >
                      {t.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <div className="min-w-0 space-y-16">
            <Secao topico={topico("primeiros-passos")}>
              <Passos
                itens={[
                  <>
                    Na tela de entrada, escolha <Ui>Criar conta</Ui> e informe seu nome (é como a Astra vai te
                    chamar), seu e-mail e uma senha.
                  </>,
                  <>
                    Enviamos um <b>código de 6 dígitos</b> para o seu e-mail. Digite-o para confirmar a conta. Se ele
                    não chegar, confira a caixa de spam ou use <Ui>Reenviar código</Ui>.
                  </>,
                  <>
                    Prefere não criar senha? Use <Ui>Continuar com Google</Ui>.
                  </>,
                  <>
                    Na primeira conversa, o navegador vai pedir permissão para usar o microfone. Clique em{" "}
                    <b>Permitir</b> — sem isso a Astra não consegue te ouvir.
                  </>,
                ]}
              />
              <Dica>
                Esqueceu a senha? Na tela de entrada, clique em <Ui>Esqueci minha senha</Ui>: você recebe um código
                por e-mail e escolhe uma senha nova.
              </Dica>
            </Secao>

            <Secao topico={topico("voz")}>
              <Passos
                itens={[
                  <>
                    Clique em <Ui>Iniciar sessão</Ui>. Em alguns segundos a Astra entra e te cumprimenta.
                  </>,
                  <>
                    Fale normalmente, como numa ligação. Não é preciso apertar nenhum botão para falar.
                  </>,
                  <>
                    Acompanhe no centro da tela o que ela está fazendo: <b>Ouvindo</b>, <b>Pensando</b> ou{" "}
                    <b>Falando</b>. O orbe também reage à voz.
                  </>,
                  <>Quer interromper? É só começar a falar enquanto ela responde.</>,
                  <>
                    Para terminar, use o botão vermelho <Ui>Encerrar sessão</Ui> na barra de controles.
                  </>,
                ]}
              />

              <Dica tom="info">
                Pergunte sobre <b>assuntos atuais</b>, como notícias, cotações, clima ou resultados de jogos, e a
                Astra pesquisa na internet antes de responder. Ela avisa que vai pesquisar, e a resposta leva alguns
                segundos a mais.
              </Dica>

              <h3 className="mb-3 mt-8 text-sm font-semibold text-fg">A barra de controles</h3>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                <Controle icone={<MicIcon size={16} />} nome="Microfone">
                  Silencia ou ativa o seu microfone. Silenciado, a Astra não te ouve.
                </Controle>
                <Controle icone={<VideoIcon size={16} />} nome="Câmera">
                  Liga a câmera para a Astra ver o que está à sua frente.
                </Controle>
                <Controle icone={<ScreenShareIcon size={16} />} nome="Compartilhar a tela">
                  Mostra uma janela, aba ou a tela inteira para a Astra.
                </Controle>
                <Controle icone={<SlidersIcon size={16} />} nome="Dispositivos e áudio">
                  Escolhe microfone e câmera e ajusta o volume da Astra.
                </Controle>
                <Controle icone={<PhoneOffIcon size={16} />} nome="Encerrar sessão" perigo>
                  Termina a conversa. Ela fica salva no seu histórico.
                </Controle>
              </ul>

              <Dica>
                Use <b>fones de ouvido</b>: sem eles, a Astra pode ouvir a própria voz pelo alto-falante e se
                interromper. Um lugar silencioso também ajuda.
              </Dica>
            </Secao>

            <Secao topico={topico("texto")}>
              <p>
                Durante uma sessão, você também pode escrever. Use a caixa <Ui>Escreva uma mensagem para a Astra…</Ui>{" "}
                no painel <b>Conversa</b>, à direita (no celular, abaixo do orbe).
              </p>
              <ul className="mt-4 space-y-2.5">
                <Item>
                  <Tecla>Enter</Tecla> envia a mensagem; <Tecla>Shift</Tecla> + <Tecla>Enter</Tecla> começa uma nova
                  linha.
                </Item>
                <Item>A Astra responde por voz, e a resposta também aparece escrita no painel.</Item>
                <Item>
                  As mensagens que você digitou aparecem com a marca <Ui>texto</Ui>, para diferenciar do que foi
                  falado.
                </Item>
                <Item>A caixa fica disponível assim que a Astra entra na sessão.</Item>
              </ul>
              <Dica>
                Escrever é ótimo para nomes, números, e-mails e endereços, que precisam estar exatos — e para quando
                você está num lugar barulhento ou não pode falar.
              </Dica>
            </Secao>

            <Secao topico={topico("visao")}>
              <p>
                A Astra pode enxergar o que você mostra a ela. Na barra de controles, toque em <Ui>Ligar câmera</Ui>{" "}
                ou em <Ui>Compartilhar a tela</Ui> e peça ajuda com o que aparece.
              </p>
              <ul className="mt-4 space-y-2.5">
                <Item>
                  <b>Uma coisa de cada vez:</b> ao ligar a câmera, o compartilhamento de tela é desligado, e vice-versa.
                </Item>
                <Item>
                  O painel <b>Visão computacional</b> mostra exatamente o que a Astra está vendo.
                </Item>
                <Item>
                  Ao compartilhar a tela, o navegador pergunta o que mostrar. Prefira uma <b>janela ou aba</b> em vez
                  da tela inteira, para mostrar só o necessário.
                </Item>
              </ul>
              <Exemplos
                itens={[
                  "Olha minha tela: o que essa planilha está mostrando?",
                  "Me ajuda a preencher este formulário.",
                  "Que objeto é esse que estou segurando?",
                  "Revisa esse texto que está aberto aqui.",
                ]}
              />
              <Dica>
                A Astra só vê enquanto a câmera ou a tela estão ligadas. Desligue quando não precisar: além de mais
                privacidade, você economiza créditos.
              </Dica>
            </Secao>

            <Secao topico={topico("historico")}>
              <p>
                Toda conversa fica salva. No computador, o histórico está no menu lateral, organizado por data (Hoje,
                Ontem, Últimos 7 dias…). No celular, toque no ícone de relógio no topo da tela.
              </p>
              <ul className="mt-4 space-y-2.5">
                <Item>
                  <b>Rever:</b> clique numa conversa para ler tudo o que foi dito e escrito, separado por sessão.
                </Item>
                <Item>
                  <b>Continuar:</b> com uma conversa aberta, clique em <Ui>Continuar conversa</Ui>. A Astra retoma o
                  assunto de onde vocês pararam.
                </Item>
                <Item>
                  <b>Começar do zero:</b> use <Ui>Nova conversa</Ui>, no topo do menu.
                </Item>
                <Item>
                  <b>Renomear ou apagar:</b> passe o mouse sobre a conversa (no celular, abra a conversa) e use o
                  lápis ou a lixeira. Apagar é definitivo.
                </Item>
                <Item>
                  Cada conversa ganha um <b>título automático</b> alguns segundos depois de a primeira sessão terminar.
                </Item>
              </ul>
              <Dica tom="info">
                Durante uma sessão ao vivo não é possível trocar de conversa. Encerre a sessão primeiro.
              </Dica>
            </Secao>

            <Secao topico={topico("memoria")}>
              <p>
                Além do histórico, a Astra guarda as <b>informações importantes</b> que você compartilha — como seu
                trabalho, suas preferências e seus projetos — e usa isso nas próximas conversas, inclusive nas novas.
              </p>
              <ul className="mt-4 space-y-2.5">
                <Item>
                  Quer saber o que ela sabe sobre você? Pergunte: <Ui>O que você lembra sobre mim?</Ui>
                </Item>
                <Item>
                  <b>Histórico</b> é o registro completo das conversas; <b>memória</b> são os fatos que a Astra
                  aprendeu sobre você.
                </Item>
                <Item>A memória é individual: a Astra usa as suas lembranças apenas nas suas conversas.</Item>
              </ul>
            </Secao>

            <Secao topico={topico("planos")}>
              <p>
                Cada conversa usa <b>créditos</b> do seu plano, de acordo com o quanto a Astra fala, ouve, vê e
                pesquisa na internet. Seu
                saldo aparece no menu lateral, em <b>Seu plano</b>, e na tela inicial, com uma estimativa de quantos
                minutos de conversa ainda restam.
              </p>
              <ul className="mt-4 space-y-2.5">
                <Item>
                  Os créditos <b>renovam todo mês, no dia 1º</b>.
                </Item>
                <Item>
                  Cada plano tem um <b>tempo máximo por sessão</b>. Quando ele chega, a Astra avisa e encerra — e
                  você pode começar outra sessão em seguida.
                </Item>
                <Item>
                  Se os créditos do mês acabarem, a Astra avisa e encerra a sessão. Eles voltam na renovação.
                </Item>
                <Item>
                  Para ver o consumo do mês, abra <Ui>Minha conta</Ui> › <Ui>Plano e uso</Ui>.
                </Item>
              </ul>

              <ul className="mt-6 grid gap-3 md:grid-cols-3">
                {PLANOS_A_VENDA.map((p) => (
                  <li key={p.id} className={`panel flex flex-col p-5 ${p.destaque ? "ring-gradient" : ""}`}>
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
                      {p.categoria}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-fg">{p.nome}</p>
                    <p className="mt-0.5 text-sm text-muted">{p.resumo}</p>
                    <p className="mt-4 text-2xl font-semibold tracking-tight text-fg">
                      {p.precoMensalBRL ? (
                        <>
                          {formatarPreco(p.precoMensalBRL)}
                          <span className="text-sm font-normal text-muted">/mês</span>
                        </>
                      ) : (
                        "Grátis"
                      )}
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-fg/90">
                      {p.creditosMensais !== null && (
                        <Item>
                          {formatarCreditos(p.creditosMensais)} créditos por mês ({tempoEstimado(p.creditosMensais)}{" "}
                          de conversa)
                        </Item>
                      )}
                      {p.duracaoMaxMin !== null && <Item>Sessões de até {p.duracaoMaxMin} minutos</Item>}
                    </ul>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-subtle">
                Os minutos são uma estimativa: conversas com a câmera ou a tela ligadas consomem mais. A contratação
                online dos planos pagos ainda não está disponível; por enquanto, a troca de plano é feita pelo
                administrador do sistema.
              </p>
            </Secao>

            <Secao topico={topico("conta")}>
              <p>
                Clique no seu nome, no canto inferior do menu lateral (no celular, nas suas iniciais, no topo), para
                abrir{" "}
                <b>Minha conta</b>:
              </p>
              <ul className="mt-4 space-y-2.5">
                <Item>
                  <b>Perfil:</b> mude o nome pelo qual a Astra te chama.
                </Item>
                <Item>
                  <b>Plano e uso:</b> seu plano, seus créditos e as sessões do mês.
                </Item>
                <Item>
                  <b>Segurança:</b> troque a senha e veja os aparelhos conectados à sua conta — dá para desconectar
                  qualquer um deles.
                </Item>
                <Item>
                  <b>Sistemas corporativos:</b> integrações com ferramentas da sua empresa, que serão liberadas em
                  breve.
                </Item>
              </ul>
              <p className="mt-6">
                Em <Ui>Dispositivos e áudio</Ui> (no menu lateral ou na barra de controles) você escolhe qual
                microfone e qual câmera usar e ajusta o <b>volume da Astra</b>.
              </p>
            </Secao>

            <Secao topico={topico("acessibilidade")}>
              <p>A Astra foi pensada para funcionar de mais de um jeito. Use o que for melhor para você:</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Cartao titulo="Legendas em tempo real">
                  Tudo o que a Astra fala aparece escrito no painel Conversa enquanto ela fala. Quem tem dificuldade
                  para ouvir pode acompanhar pela leitura.
                </Cartao>
                <Cartao titulo="Conversar sem falar">
                  A caixa de texto funciona durante toda a sessão: dá para conversar só escrevendo e ler as respostas.
                </Cartao>
                <Cartao titulo="Uso pelo teclado">
                  Todas as funções podem ser acessadas sem mouse. Os atalhos estão logo abaixo.
                </Cartao>
                <Cartao titulo="Leitores de tela">
                  Os botões têm nomes descritivos, e as novas falas da conversa são anunciadas automaticamente.
                </Cartao>
                <Cartao titulo="Menos movimento">
                  Se o seu sistema estiver configurado para reduzir movimento, as animações e transições das telas
                  são desligadas. Só o orbe central continua se movendo.
                </Cartao>
                <Cartao titulo="Zoom e telas pequenas">
                  A interface se ajusta ao zoom do navegador e funciona no celular.
                </Cartao>
              </div>

              <h3 className="mb-3 mt-8 flex items-center gap-2 text-sm font-semibold text-fg">
                <KeyboardIcon size={16} className="text-muted" />
                Atalhos de teclado
              </h3>
              <div className="panel overflow-hidden">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Atalhos de teclado</caption>
                  <tbody className="divide-y divide-line">
                    <Atalho teclas={["Tab"]}>Ir para o próximo botão ou campo</Atalho>
                    <Atalho teclas={["Shift", "Tab"]}>Voltar para o anterior</Atalho>
                    <Atalho teclas={["Enter"]} ou={["Espaço"]}>Acionar o botão selecionado</Atalho>
                    <Atalho teclas={["Enter"]}>Enviar a mensagem escrita</Atalho>
                    <Atalho teclas={["Shift", "Enter"]}>Nova linha na mensagem</Atalho>
                    <Atalho teclas={["Esc"]}>Fechar janelas e painéis</Atalho>
                  </tbody>
                </table>
              </div>
              <Dica>
                Se a Astra responder antes de você terminar de falar, faça frases mais contínuas, sem pausas longas —
                ou escreva a mensagem, sem pressa.
              </Dica>
            </Secao>

            <Secao topico={topico("privacidade")}>
              <ul className="space-y-2.5">
                <Item>Suas conversas ficam salvas na sua conta, e você pode apagar qualquer uma delas no histórico.</Item>
                <Item>A conexão com a Astra é criptografada.</Item>
                <Item>
                  <b>Não compartilhe senhas, dados bancários ou documentos sigilosos</b>, nem por voz, nem por texto,
                  nem pela câmera ou tela.
                </Item>
                <Item>
                  Em computadores compartilhados, saia da conta ao terminar (ícone ao lado do seu nome). Em{" "}
                  <Ui>Minha conta</Ui> › <Ui>Segurança</Ui> você desconecta aparelhos à distância.
                </Item>
              </ul>
            </Secao>

            <Secao topico={topico("problemas")}>
              <div className="space-y-2.5">
                <Pergunta titulo="A Astra não me ouve">
                  <ul className="space-y-2">
                    <Item>Veja se o microfone não está silenciado na barra de controles.</Item>
                    <Item>
                      Confira se o navegador tem permissão para usar o microfone (no ícone de cadeado, ao lado do
                      endereço do site).
                    </Item>
                    <Item>
                      Em <Ui>Dispositivos e áudio</Ui>, escolha o microfone certo.
                    </Item>
                  </ul>
                </Pergunta>
                <Pergunta titulo="Não consigo ouvir a Astra">
                  Confira o volume do seu aparelho e o <b>volume da Astra</b> em <Ui>Dispositivos e áudio</Ui>. Se
                  estiver de fone, veja se ele está conectado. Enquanto isso, as respostas aparecem escritas no painel
                  Conversa.
                </Pergunta>
                <Pergunta titulo="A conexão está demorando">
                  A primeira conversa depois de um tempo sem uso pode levar alguns segundos a mais para começar. Se
                  aparecer <b>Agente indisponível</b>, encerre e inicie a sessão de novo.
                </Pergunta>
                <Pergunta titulo="A Astra se interrompe ou repete o que ela mesma disse">
                  Ela provavelmente está ouvindo a própria voz pelo alto-falante. Use fones de ouvido ou baixe o
                  volume.
                </Pergunta>
                <Pergunta titulo="A sessão terminou sozinha">
                  Pode ter chegado ao tempo máximo do seu plano ou ao fim dos créditos do mês — nesses casos a Astra
                  avisa antes. Também pode ter sido a internet: durante a sessão, o indicador <b>Rede</b>, no alto do
                  palco, mostra a qualidade da conexão.
                </Pergunta>
                <Pergunta titulo="Não consigo escrever na caixa de mensagem">
                  Ela só fica disponível com uma sessão ativa e depois que a Astra entra. Clique em{" "}
                  <Ui>Iniciar sessão</Ui> e aguarde o cumprimento.
                </Pergunta>
                <Pergunta titulo="A câmera ou a tela não aparecem">
                  Permita o acesso quando o navegador perguntar. Lembre-se de que só uma das duas funciona por vez.
                </Pergunta>
                <Pergunta titulo="Não recebi o código por e-mail">
                  Confira a caixa de spam e as promoções. Se não estiver lá, use <Ui>Reenviar código</Ui> depois que
                  a contagem terminar.
                </Pergunta>
                <Pergunta titulo="Uma conversa não aparece no histórico">
                  Só aparecem conversas em que você falou ou escreveu algo. Logo depois de encerrar, o título pode
                  levar alguns segundos para surgir.
                </Pergunta>
                <Pergunta titulo="Meus créditos acabaram">
                  Eles renovam no dia 1º do próximo mês. Para ter mais créditos antes disso, fale com o administrador
                  sobre um plano maior.
                </Pergunta>
              </div>
            </Secao>

            <section className="panel relative overflow-hidden p-6 text-center sm:p-10">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_50%_0%,rgb(124_140_255/0.14),transparent)]"
              />
              <div className="relative">
                <h2 className="text-xl font-semibold tracking-tight text-fg">Pronto para conversar?</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                  Se algo não funcionou como esperado mesmo depois das dicas acima, fale com o administrador do
                  sistema na sua empresa.
                </p>
                <Link
                  href="/"
                  className="btn-primary mx-auto mt-6 flex h-11 w-fit items-center gap-2 rounded-xl px-6 text-sm font-semibold"
                >
                  <AudioLinesIcon size={16} />
                  Abrir a Astra
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Secao({ topico, children }: { topico: Topico; children: ReactNode }) {
  return (
    <section id={topico.id} aria-labelledby={`${topico.id}-titulo`} className="scroll-mt-24">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white/4 text-accent">
          {topico.icone}
        </span>
        <div>
          <h2 id={`${topico.id}-titulo`} className="text-xl font-semibold tracking-tight text-fg">
            {topico.titulo}
          </h2>
          <p className="text-sm text-muted">{topico.resumo}</p>
        </div>
      </div>
      <div className="text-[15px] leading-relaxed text-fg/85 [&_b]:font-semibold [&_b]:text-fg">{children}</div>
    </section>
  );
}

function Passos({ itens }: { itens: ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {itens.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-white/5 font-mono text-[11px] font-medium text-fg">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Item({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
      <span>{children}</span>
    </li>
  );
}

/** Nome de algo que aparece na tela (botão, campo, aba). */
function Ui({ children }: { children: ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-md border border-line bg-white/5 px-1.5 py-0.5 text-[0.9em] font-medium text-fg">
      {children}
    </span>
  );
}

function Tecla({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-7 items-center justify-center rounded-md border border-line-strong bg-white/6 px-1.5 py-0.5 font-mono text-[0.8em] text-fg shadow-[inset_0_-1px_0_rgb(255_255_255/0.08)]">
      {children}
    </kbd>
  );
}

function Dica({ tom = "dica", children }: { tom?: "dica" | "info"; children: ReactNode }) {
  return (
    <div className="mt-6 flex gap-3 rounded-xl border border-accent/20 bg-accent/6 px-4 py-3.5 text-sm leading-relaxed">
      {tom === "dica" ? (
        <LightbulbIcon size={17} className="mt-0.5 shrink-0 text-accent" />
      ) : (
        <InfoIcon size={17} className="mt-0.5 shrink-0 text-accent" />
      )}
      <p>
        <span className="sr-only">{tom === "dica" ? "Dica: " : "Observação: "}</span>
        {children}
      </p>
    </div>
  );
}

function Controle({
  icone,
  nome,
  perigo,
  children,
}: {
  icone: ReactNode;
  nome: string;
  perigo?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-line bg-white/2 p-3.5">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          perigo ? "bg-bad/90 text-white" : "border border-line bg-white/6 text-fg"
        }`}
      >
        {icone}
      </span>
      <span className="min-w-0 text-sm">
        <span className="block font-medium text-fg">{nome}</span>
        <span className="mt-0.5 block leading-relaxed text-muted">{children}</span>
      </span>
    </li>
  );
}

function Exemplos({ itens }: { itens: string[] }) {
  return (
    <div className="mt-6">
      <p className="mb-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
        Experimente pedir
      </p>
      <ul className="flex flex-wrap gap-2">
        {itens.map((t) => (
          <li key={t} className="rounded-full border border-line bg-white/3 px-3 py-1.5 text-xs text-fg/85">
            “{t}”
          </li>
        ))}
      </ul>
    </div>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white/2 p-4">
      <h3 className="text-sm font-semibold text-fg">{titulo}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function Atalho({ teclas, ou, children }: { teclas: string[]; ou?: string[]; children: ReactNode }) {
  const combinacao = (lista: string[]) =>
    lista.map((t, i) => (
      <span key={t} className="inline-flex items-center gap-1">
        {i > 0 && <span className="text-subtle">+</span>}
        <Tecla>{t}</Tecla>
      </span>
    ));
  return (
    <tr>
      <th scope="row" className="w-48 whitespace-nowrap px-4 py-3 font-normal">
        <span className="inline-flex flex-wrap items-center gap-1">
          {combinacao(teclas)}
          {ou && (
            <>
              <span className="px-1 text-xs text-subtle">ou</span>
              {combinacao(ou)}
            </>
          )}
        </span>
      </th>
      <td className="px-4 py-3 text-muted">{children}</td>
    </tr>
  );
}

function Pergunta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-line bg-white/2 transition-colors open:border-line-strong open:bg-white/3">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{titulo}</span>
        <ChevronDownIcon size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 text-sm leading-relaxed text-fg/80">{children}</div>
    </details>
  );
}
