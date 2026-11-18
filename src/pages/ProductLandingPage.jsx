import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAppIconImage, getAppSettings } from "@/lib/appSettings.js";
import { transposeChordLines, transposeKeyLabel } from "@/lib/chords.js";
import { getAdminUrl } from "@/lib/sites.js";
import { ACCENT_OPTIONS, setAccent, setTheme, useAccent, useTheme } from "@/lib/theme.js";

const DEMO_SONGS = [
  {
    id: 1,
    number: "001",
    title: "Horizonte de Luz",
    band: "Banda Horizonte",
    composer: "Lucas Andrade",
    album: "Sessão Acústica",
    year: "2024",
    theme: "Abertura / Início",
    baseKey: "C",
    hasAudio: true,
    duration: "03:42",
    notes: "Entrada suave com violão; modulação opcional no último refrão.",
    stanzas: [
      [
        "Quando o som começa a ecoar,",
        "Cada acorde encontra o seu lugar.",
      ],
      [
        "Nossa voz se espalha pelo ar,",
        "Na melodia que nos faz cantar.",
      ],
    ],
    chorus: [
      "A música nos move do início ao fim,",
      "Em cada nota brilha um novo tom!",
    ],
    chordsStanzas: [
      ["C                G/B              Am", "F                 Dm         G"],
      ["C                G/B              Am", "F                 G          C"],
    ],
    chordsChorus: ["F                G                Em       Am", "Dm               G                C"],
    voices: [
      { part: "men", label: "Homens", text: "Quando o som começa a ecoar," },
      { part: "women", label: "Mulheres", text: "Cada acorde encontra o seu lugar." },
      { part: "all", label: "Todos (Refrão)", text: "A música nos move do início ao fim!" },
      { part: "women", label: "Voz Aguda", text: "Em cada nota (eco suave)" },
      { part: "men", label: "Voz Grave", text: "Brilha sempre um novo tom!" },
    ],
  },
  {
    id: 2,
    number: "002",
    title: "Vento da Estrada",
    band: "Coletivo Harmonia",
    composer: "Marina Costa",
    album: "Vozes & Acordes",
    year: "2022",
    theme: "Acústico & Voz",
    baseKey: "G",
    hasAudio: true,
    duration: "04:15",
    notes: "Arranjo vocal no segundo verso; dinâmica crescendo no refrão.",
    stanzas: [
      [
        "Pelos caminhos onde o vento vai,",
        "O som do violão nunca se esvai.",
      ],
      [
        "Mesmo que a noite tente esconder,",
        "O nosso canto faz amanhecer.",
      ],
    ],
    chorus: [
      "Seguimos juntos nessa direção,",
      "Vivendo a força de cada canção!",
    ],
    chordsStanzas: [
      ["G                D/F#             Em", "C                 Am         D"],
      ["G                D/F#             Em", "C                 D          G"],
    ],
    chordsChorus: ["C                D                Bm       Em", "Am               D                G"],
    voices: [
      { part: "women", label: "Mulheres", text: "Pelos caminhos onde o vento vai," },
      { part: "men", label: "Homens", text: "O som do violão nunca se esvai." },
      { part: "all", label: "Todos (Uníssono)", text: "Seguimos juntos nessa direção," },
      { part: "all", label: "Todos (Harmonia)", text: "Vivendo a força de cada canção!" },
    ],
  },
  {
    id: 3,
    number: "003",
    title: "Noite de Estúdio",
    band: "Trio Acústico",
    composer: "Repertório Clássico",
    album: "Clássicos da Música",
    year: "2021",
    theme: "Clássicos & Sucessos",
    baseKey: "D",
    hasAudio: true,
    duration: "03:18",
    notes: "Andamento moderado; ideal para momentos acústicos e shows intimistas.",
    stanzas: [
      [
        "Sob as luzes calmas do salão,",
        "Nasce o compasso dessa canção!",
      ],
      [
        "Cada instrumento traz a sua cor,",
        "Transformando o palco em emoção!",
      ],
    ],
    chorus: [
      "Cante mais alto, deixe o som fluir,",
      "Essa melodia todos vão ouvir!",
    ],
    chordsStanzas: [
      ["D                A/C#             Bm", "Em                A7         D"],
      ["D                A/C#             Bm", "Em                A7         D"],
    ],
    chordsChorus: ["G                A7               F#m      Bm", "Em               A7               D"],
    voices: [
      { part: "all", label: "Todos", text: "Sob as luzes calmas do salão, nasce o compasso dessa canção!" },
      { part: "women", label: "Mulheres", text: "Cante mais alto," },
      { part: "men", label: "Homens", text: "Deixe o som fluir," },
      { part: "all", label: "Todos", text: "Essa melodia todos vão ouvir!" },
    ],
  },
];

const DEMO_KEYS = ["C", "D", "E", "F", "G", "A", "B"];
const SEMITONES_FROM_C = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const ALL_FEATURES = [
  {
    id: "catalogo",
    category: "catalogo",
    badge: "Busca instantânea",
    title: "Catálogo Numerado & Pesquisa por Trechos",
    description:
      "Localize qualquer música em milissegundos digitando o número oficial, título ou apenas uma frase que você lembra da letra ou do refrão.",
    highlights: ["Numeração automática padronizada", "Busca em títulos, estrofes e refrões", "Letreiro animado para títulos longos"],
  },
  {
    id: "letras",
    category: "catalogo",
    badge: "Leitura adaptável",
    title: "Letras com Cronologia Inteligente & Zoom",
    description:
      "Escolha entre ver o refrão apenas uma vez ou repeti-lo automaticamente após cada estrofe na ordem cronológica da execução, ajustando a fonte de 13px a 38px.",
    highlights: ["Modo cronológico com 1 toque", "Suporte a músicas que iniciam pelo refrão", "Ajuste fino de fonte salvo no aparelho"],
  },
  {
    id: "vozes",
    category: "musical",
    badge: "Bandas e grupos vocais",
    title: "Arranjo e Divisão de Vozes por Cores",
    description:
      "Visualize claramente as partes de Homens (azul royal), Mulheres (ciano) e Todos (uníssono), além de notas de arranjo vocal e opção de músicas exclusivas para vozes.",
    highlights: ["Marcação por palavra ou por linha", "Bloco dedicado a instruções de arranjo", "Modo 'Somente vozes' configurável"],
  },
  {
    id: "cifras",
    category: "musical",
    badge: "Harmonia precisa",
    title: "Cifras Alinhadas & Transposição de Tom",
    description:
      "Acordes posicionados exatamente sobre a sílaba correspondente. Mude o tom em semitons (-1 / +1) ou escolha diretamente na grade de tonalidades maiores e menores.",
    highlights: ["Detecção automática do tom original", "Conversão inteligente entre # e b", "Grade rápida com os 12 tons"],
  },
  {
    id: "audio",
    category: "musical",
    badge: "Referência sonora",
    title: "Player de Demonstração & Central de Prévias",
    description:
      "Ouça a gravação de referência sem sair da cifra ou da letra. Inclui barra de progresso interativa e uma página exclusiva listando todas as músicas com áudio.",
    highlights: ["Player integrado no rodapé da música", "Timeline arrastável com tempo decorrido", "Filtro administrativo de áudios pendentes"],
  },
  {
    id: "temas",
    category: "organizacao",
    badge: "Repertório e listas",
    title: "Temas de Repertório & Listas Personalizadas",
    description:
      "Navegue por categorias temáticas (Abertura, Acústico, Animadas, Baladas, Encerramento) ou crie suas próprias listas de músicas para organizar shows e ensaios.",
    highlights: ["Temas definidos pelo estúdio", "Criação de listas próprias pelo usuário", "Organização rápida de setlists e repertórios"],
  },
  {
    id: "favoritos",
    category: "organizacao",
    badge: "Acesso rápido",
    title: "Coleção de Favoritos & Ficha Técnica",
    description:
      "Guarde suas músicas mais tocadas na aba Favoritos e consulte a ficha completa de cada obra: intérprete/banda, compositor, álbum, ano, tema e observações.",
    highlights: ["Marcação instantânea com coração", "Ficha técnica vinculada ao compositor", "Respeito e preservação de direitos autorais"],
  },
  {
    id: "aparencia",
    category: "organizacao",
    badge: "12 paletas + Dark Mode",
    title: "Personalização Visual & Alto Contraste",
    description:
      "12 paletas de cores cuidadosamente calibradas (Azul Royal, Marinho, Turquesa, Verde, Índigo, Roxo, Rubi, Carmim, Terracota, Ouro, Marrom e Chumbo) nos modos Claro e Escuro.",
    highlights: ["Contraste nível AAA/AA para leitura no palco", "Modo Claro, Escuro ou Automático do sistema", "Layout adaptável para Retrato e Paisagem"],
  },
  {
    id: "pwa",
    category: "organizacao",
    badge: "Multiplataforma",
    title: "Aplicativo Instalável (PWA) & Versão Web",
    description:
      "Funciona no navegador do computador ou instalado direto na tela inicial do Android e iPhone/iPad, ocupando mínimo espaço e sem depender de aprovação em lojas.",
    highlights: ["Assistente de instalação integrado (Android/iOS)", "Experiência em tela cheia como app nativo", "Acesso simultâneo pelo celular, tablet ou PC"],
  },
  {
    id: "estudio",
    category: "admin",
    badge: "Painel Administrativo",
    title: "Estúdio Visual de Letras, Vozes e Cifras",
    description:
      "Ambiente completo para administradores criarem e editarem músicas com pincel de divisão vocal, posicionador de acordes clique-a-clique e prévia mobile ao vivo.",
    highlights: ["Editor visual sem precisar digitar códigos", "Pincel para marcar Homens, Mulheres e Todos", "Simulador em tempo real (Retrato e Paisagem)"],
  },
  {
    id: "whitelabel",
    category: "admin",
    badge: "Identidade própria",
    title: "Configuração White-Label & Controle de Menus",
    description:
      "Defina o nome do aplicativo da sua banda, artista ou empresa, envie ícones exclusivos para tema claro e escuro, escolha a paleta padrão e decida quais menus ficam ativos.",
    highlights: ["Upload de ícones personalizados (Claro/Escuro)", "Bloqueio ou ocultação de recursos indisponíveis", "Definição de visualização e fonte padrão"],
  },
  {
    id: "entrega",
    category: "admin",
    badge: "Nuvem ou Self-Hosted",
    title: "Simulador de Jornada & Exportação do Projeto",
    description:
      "Teste os 5 passos da jornada do usuário na Prévia Final e escolha entre Hospedagem Mensal em nuvem ou compilação do Arquivo Bruto (.zip) para servidor próprio.",
    highlights: ["Simulador interativo de ponta a ponta", "Sincronização imediata na nuvem gerenciada", "Exportação completa (App + Web + API Node.js)"],
  },
];

const FEATURE_CATEGORIES = [
  { id: "todos", label: "Todas as funcionalidades (12)" },
  { id: "catalogo", label: "Leitura & Catálogo" },
  { id: "musical", label: "Vozes, Cifras & Áudio" },
  { id: "organizacao", label: "Temas, Cores & PWA" },
  { id: "admin", label: "Estúdio & White-Label" },
];

const STUDIO_TABS = [
  {
    id: "editor",
    badge: "01 · Estúdio Musical",
    title: "Editores visuais para Letra, Vozes e Cifra com prévia lado a lado",
    description:
      "No painel administrativo, você edita cada música em abas organizadas. Selecione palavras com o pincel para colorir as vozes masculinas e femininas, ou clique sobre a letra para posicionar acordes automaticamente.",
    bullets: [
      "Editor de letra com separação automática de estrofes, refrão e ordem cronológica.",
      "Editor de arranjo vocal com marcação visual para Homens, Mulheres e Uníssono.",
      "Editor de cifras interativo com barra de acordes sugeridos e transposição de teste.",
      "Janela de prévia mobile em tempo real nos modos Retrato e Paisagem.",
    ],
    previewType: "editor",
  },
  {
    id: "whitelabel",
    badge: "02 · Personalização White-Label",
    title: "Deixe o aplicativo com o nome, o ícone e as cores da sua banda, carreira ou empresa",
    description:
      "O administrador controla toda a identidade e o comportamento padrão do app para a equipe ou público: desde a paleta de cores até o que acontece quando uma música ainda não possui áudio.",
    bullets: [
      "Identidade: Nome personalizado do aplicativo e ícones dedicados para fundo claro e escuro.",
      "Temas e Cores: Escolha o tema inicial (Sistema, Claro, Escuro) e quais das 12 paletas ficam liberadas.",
      "Visualização padrão: Defina se as músicas abrem em Letra, Vozes ou Cifra e o tamanho inicial da fonte.",
      "Permissões de acesso: Ative, bloqueie com cadeado ou oculte menus (Favoritos, Prévias, Temas, Instalação).",
    ],
    previewType: "whitelabel",
  },
  {
    id: "cadastros",
    badge: "03 · Gestão & Prévia Final",
    title: "Cadastros de temas e fichas técnicas, controle de acessos e simulador completo",
    description:
      "Organize temas de repertório, vincule álbuns e anos de lançamento aos compositores, acompanhe músicas sem áudio e valide toda a experiência antes de publicar.",
    bullets: [
      "Gestão centralizada de Temas de Músicas e Cadastro de Informações por compositor.",
      "Painel de Equipe e Acessos para visualizar contas cadastradas e administradores.",
      "Relatório de Pré-visualizações Pendentes para saber quais músicas ainda precisam de gravação.",
      "Prévia Final interativa: navegue pelos 5 passos (Início, Catálogo, Música, Ficha e Mais+) em Retrato, Paisagem ou Web.",
    ],
    previewType: "cadastros",
  },
];

const FICTIONAL_PLANS = [
  {
    id: "comunidade",
    name: "Essencial / Solo",
    tagline: "Para cantores solo, músicos independentes e pequenos grupos em início de organização.",
    monthlyPrice: 29,
    annualMonthlyPrice: 23,
    annualTotal: 276,
    songsLimitLabel: "Até 150 músicas no catálogo",
    membersLabel: "Até 50 membros / acessos",
    adminsLabel: "1 conta administradora",
    badge: "Entrada",
    popular: false,
    features: [
      "Aplicativo Mobile (PWA) + Versão Web responsiva",
      "Catálogo numerado com busca por título e trecho",
      "Letras com modo cronológico e ajuste de fonte",
      "Cifras com transposição instantânea nos 12 tons",
      "Coleção de Favoritos e Ficha Técnica completa",
      "Temas Claro e Escuro + 4 paletas de cores",
      "Hospedagem em nuvem gerenciada com backup diário",
    ],
    notIncluded: [
      "Divisão de vozes por cores (Homens / Mulheres)",
      "Streaming de demonstrações de áudio em nuvem",
      "Personalização White-Label (ícone e nome próprio)",
    ],
  },
  {
    id: "ministerio",
    name: "Banda & Artista Pro",
    tagline: "Ideal para bandas musicais, artistas, grupos vocais e equipes com vozes, áudios e marca própria.",
    monthlyPrice: 69,
    annualMonthlyPrice: 55,
    annualTotal: 660,
    songsLimitLabel: "Músicas ilimitadas no catálogo",
    membersLabel: "Até 300 membros simultâneos",
    adminsLabel: "Até 5 administradores no estúdio",
    badge: "Mais escolhido",
    popular: true,
    features: [
      "Tudo do plano Essencial sem limite de músicas",
      "Divisão de Vozes completa (Homens, Mulheres e Todos)",
      "Player de demonstrações de áudio (até 10 GB em nuvem)",
      "Temas de repertório + criação de listas pelos usuários",
      "White-Label completo: seu nome e seus ícones (Claro/Escuro)",
      "Todas as 12 paletas de cores liberadas e configuráveis",
      "Controle fino de menus e botões bloqueados/ocultos",
    ],
    notIncluded: [
      "Exportação do pacote compilado (.zip) para servidor próprio",
    ],
  },
  {
    id: "denominacional",
    name: "Produtora & Corporativo",
    tagline: "Para produtoras, escolas de música, grandes elencos, múltiplos projetos ou operação híbrida.",
    monthlyPrice: 149,
    annualMonthlyPrice: 119,
    annualTotal: 1428,
    songsLimitLabel: "Músicas e catálogos ilimitados",
    membersLabel: "Membros e acessos ilimitados",
    adminsLabel: "Administradores ilimitados",
    badge: "Completo + Híbrido",
    popular: false,
    features: [
      "Tudo do plano Banda & Artista Pro sem limites de acesso",
      "Armazenamento expandido para áudios de referência (50 GB)",
      "Direito à Exportação de Arquivo Bruto (.zip) a qualquer momento",
      "Operação híbrida: Nuvem gerenciada + pacote para rede local/offline",
      "Prévia Final multi-formato e relatórios de áudios pendentes",
      "Múltiplos editores simultâneos no Estúdio Administrativo",
      "Suporte prioritário e apoio na importação de repertório",
    ],
    notIncluded: [],
  },
];

const RAW_PACKAGE_PLAN = {
  id: "arquivo-bruto",
  name: "Licença Arquivo Bruto (Self-Hosted)",
  badge: "Pagamento único · Pacote independente",
  oneTimePrice: 490,
  installments: "ou 6x de R$ 89 sem juros (simulação)",
  description:
    "Prefere hospedar em servidor próprio, VPS da sua empresa ou rede local sem mensalidade? Gere o pacote compilado completo com App + Web + API Node.js + banco de músicas e áudios.",
  deliverables: [
    "Front-end compilado de produção (Aplicativo PWA + Versão Web)",
    "Servidor API Node.js + Express pronto para execução local ou em nuvem própria",
    "Base completa configurada no estúdio (songs.json, app-settings.json e pasta de áudios)",
    "Documentação passo a passo para implantação em VPS, Docker ou servidor local",
  ],
};

const COMPARISON_ROWS = [
  { label: "Aplicativo Mobile (PWA Android/iOS) + Versão Web", comunidade: "Incluso", ministerio: "Incluso", denominacional: "Incluso", bruto: "Incluso" },
  { label: "Limite de músicas cadastradas", comunidade: "Até 150", ministerio: "Ilimitado", denominacional: "Ilimitado", bruto: "Ilimitado" },
  { label: "Letras cronológicas + Ajuste de fonte (13px a 38px)", comunidade: "Sim", ministerio: "Sim", denominacional: "Sim", bruto: "Sim" },
  { label: "Cifras alinhadas + Transposição nos 12 tons", comunidade: "Sim", ministerio: "Sim", denominacional: "Sim", bruto: "Sim" },
  { label: "Arranjo e Divisão de Vozes (Homens, Mulheres, Todos)", comunidade: "—", ministerio: "Sim", denominacional: "Sim", bruto: "Sim" },
  { label: "Demonstrações de Áudio integradas com timeline", comunidade: "—", ministerio: "Até 10 GB", denominacional: "Até 50 GB", bruto: "No seu servidor" },
  { label: "Temas de músicas e listas personalizadas", comunidade: "Básico", ministerio: "Completo", denominacional: "Completo", bruto: "Completo" },
  { label: "Personalização White-Label (Nome, Ícones e 12 Paletas)", comunidade: "4 paletas", ministerio: "Completo (12)", denominacional: "Completo (12)", bruto: "Completo (12)" },
  { label: "Contas administradoras no Estúdio", comunidade: "1 admin", ministerio: "Até 5 admins", denominacional: "Ilimitadas", bruto: "Ilimitadas" },
  { label: "Hospedagem em nuvem, SSL e backups automáticos", comunidade: "Incluso", ministerio: "Incluso", denominacional: "Incluso VIP", bruto: "Servidor próprio" },
  { label: "Exportação de Arquivo Bruto compilado (.zip)", comunidade: "—", ministerio: "Opcional", denominacional: "Incluso", bruto: "Entrega principal" },
];

const FAQ_ITEMS = [
  {
    question: "Os valores e planos exibidos nesta página são reais?",
    answer:
      "Não. Todos os valores, planos e cálculos desta seção são 100% fictícios e demonstrativos, criados para simular como a plataforma pode ser apresentada comercialmente na modalidade de assinatura em nuvem (SaaS) ou exportação de pacote independente.",
  },
  {
    question: "Os integrantes ou usuários precisam baixar o app na Play Store ou App Store?",
    answer:
      "Não é necessário! O aplicativo utiliza tecnologia PWA (Progressive Web App). Pelo próprio navegador do celular (Android ou iPhone/iPad), o usuário toca em 'Baixar aplicativo' e o ícone é instalado diretamente na tela inicial, funcionando em tela cheia como um app nativo.",
  },
  {
    question: "Como funciona a divisão de vozes e a transposição de cifras?",
    answer:
      "Na página de cada música, o usuário pode alternar na barra inferior entre 'Letra', 'Vozes' e 'Cifra'. Em 'Vozes', os trechos cantados por homens, mulheres ou todos aparecem destacados por cores diferentes. Em 'Cifra', basta tocar em -1, +1 ou escolher qualquer um dos 12 tons para transpor todos os acordes instantaneamente.",
  },
  {
    question: "Qual a diferença entre a Hospedagem Mensal e o Arquivo Bruto?",
    answer:
      "Na Hospedagem Mensal, toda a infraestrutura fica na nuvem: quando o administrador edita uma cifra ou envia um áudio no estúdio, todos os celulares recebem a atualização na mesma hora. Já na modalidade Arquivo Bruto, você exporta um pacote fechado (.zip) com o sistema e as músicas para hospedar no seu próprio servidor.",
  },
];

export default function ProductLandingPage({ user }) {
  const settings = getAppSettings();
  const { appName } = settings;
  const theme = useTheme();
  const accent = useAccent();
  const iconSrc =
    getAppIconImage(settings, theme) || `${import.meta.env.BASE_URL || "/"}icon.png`;

  // Estados do Demonstrador Interativo (Hero / App Mockup)
  const [demoTab, setDemoTab] = useState("cifra"); // catalogo | letra | vozes | cifra | audio
  const [selectedSongId, setSelectedSongId] = useState(1);
  const [demoSearch, setDemoSearch] = useState("");
  const [demoChronological, setDemoChronological] = useState(true);
  const [demoFontSize, setDemoFontSize] = useState(16);
  const [demoTranspose, setDemoTranspose] = useState(0);
  const [demoFavorites, setDemoFavorites] = useState([1, 3]);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [demoProgress, setDemoProgress] = useState(38);

  // Estados da Galeria de Funcionalidades e Estúdio
  const [featureCategory, setFeatureCategory] = useState("todos");
  const [studioTab, setStudioTab] = useState("editor");

  // Estados do Simulador de Planos e Valores Fictícios
  const [billingCycle, setBillingCycle] = useState("annual"); // monthly | annual
  const [simSongsTier, setSimSongsTier] = useState("unlimited"); // 150 | 500 | unlimited
  const [simMembers, setSimMembers] = useState(120);
  const [simNeedVoices, setSimNeedVoices] = useState(true);
  const [simNeedAudio, setSimNeedAudio] = useState(true);
  const [simNeedWhiteLabel, setSimNeedWhiteLabel] = useState(true);
  const [simDeliveryMode, setSimDeliveryMode] = useState("cloud"); // cloud | hybrid | raw
  const [simulatedCheckoutPlan, setSimulatedCheckoutPlan] = useState(null);

  const activeSong = useMemo(
    () => DEMO_SONGS.find((song) => song.id === selectedSongId) || DEMO_SONGS[0],
    [selectedSongId],
  );

  const filteredDemoSongs = useMemo(() => {
    const query = demoSearch.trim().toLowerCase();
    if (!query) return DEMO_SONGS;
    return DEMO_SONGS.filter(
      (song) =>
        song.number.includes(query) ||
        song.title.toLowerCase().includes(query) ||
        song.theme.toLowerCase().includes(query) ||
        song.stanzas.flat().some((line) => line.toLowerCase().includes(query)) ||
        song.chorus.some((line) => line.toLowerCase().includes(query)),
    );
  }, [demoSearch]);

  const currentDemoKey = useMemo(() => {
    if (demoTranspose === 0) return activeSong.baseKey;
    return transposeKeyLabel(activeSong.baseKey, demoTranspose);
  }, [activeSong.baseKey, demoTranspose]);

  const transposedStanzas = useMemo(() => {
    const preferFlats = String(currentDemoKey || "").includes("b");
    return activeSong.chordsStanzas.map((lines) =>
      transposeChordLines(lines, demoTranspose, preferFlats),
    );
  }, [activeSong.chordsStanzas, demoTranspose, currentDemoKey]);

  const transposedChorus = useMemo(() => {
    const preferFlats = String(currentDemoKey || "").includes("b");
    return transposeChordLines(activeSong.chordsChorus, demoTranspose, preferFlats);
  }, [activeSong.chordsChorus, demoTranspose, currentDemoKey]);

  const visibleFeatures = useMemo(() => {
    if (featureCategory === "todos") return ALL_FEATURES;
    return ALL_FEATURES.filter((item) => item.category === featureCategory);
  }, [featureCategory]);

  // Cálculo dinâmico do Simulador de Investimento Fictício
  const simulationResult = useMemo(() => {
    if (simDeliveryMode === "raw") {
      const extraSupport = simNeedAudio || simNeedWhiteLabel ? 100 : 0;
      const totalOneTime = RAW_PACKAGE_PLAN.oneTimePrice + extraSupport;
      return {
        mode: "one-time",
        planName: RAW_PACKAGE_PLAN.name,
        badge: "Licença Única Independente",
        monthlyEquivalent: Math.round(totalOneTime / 12),
        totalPrice: totalOneTime,
        perMemberCost: (totalOneTime / 12 / Math.max(10, simMembers)).toFixed(2).replace(".", ","),
        reason:
          "Ideal para quem possui servidor próprio e deseja exportar o pacote compilado (.zip) sem assinatura mensal.",
        includedHighlights: [
          "Pacote completo App PWA + Web + API Node.js",
          "Catálogo configurado + arquivos de áudio inclusos no pacote",
          simNeedWhiteLabel ? "Identidade White-Label pré-configurada" : "Identidade padrão personalizável",
          "Sem limite de músicas ou dispositivos na sua infraestrutura",
        ],
      };
    }

    let recommended = FICTIONAL_PLANS[0]; // Comunidade
    if (
      simDeliveryMode === "hybrid" ||
      simMembers > 300 ||
      (simSongsTier === "unlimited" && simMembers > 200)
    ) {
      recommended = FICTIONAL_PLANS[2]; // Denominacional
    } else if (
      simSongsTier !== "150" ||
      simMembers > 50 ||
      simNeedVoices ||
      simNeedAudio ||
      simNeedWhiteLabel
    ) {
      recommended = FICTIONAL_PLANS[1]; // Ministério Pro
    }

    const baseMonthly =
      billingCycle === "annual" ? recommended.annualMonthlyPrice : recommended.monthlyPrice;
    const annualSavings = (recommended.monthlyPrice - recommended.annualMonthlyPrice) * 12;
    const perMember = (baseMonthly / Math.max(1, simMembers)).toFixed(2).replace(".", ",");

    return {
      mode: "subscription",
      planId: recommended.id,
      planName: `Plano ${recommended.name}`,
      badge: recommended.badge,
      monthlyEquivalent: baseMonthly,
      totalPrice: billingCycle === "annual" ? baseMonthly * 12 : baseMonthly,
      annualSavings,
      perMemberCost: perMember,
      reason: recommended.tagline,
      includedHighlights: recommended.features.slice(0, 5),
    };
  }, [
    billingCycle,
    simDeliveryMode,
    simMembers,
    simNeedAudio,
    simNeedVoices,
    simNeedWhiteLabel,
    simSongsTier,
  ]);

  const toggleDemoFavorite = (id) => {
    setDemoFavorites((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const selectDemoKey = (targetKey) => {
    const baseSemitone = SEMITONES_FROM_C[activeSong.baseKey] ?? 0;
    const targetSemitone = SEMITONES_FROM_C[targetKey] ?? 0;
    let diff = targetSemitone - baseSemitone;
    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;
    setDemoTranspose(diff);
  };

  const currentStudio = STUDIO_TABS.find((item) => item.id === studioTab) || STUDIO_TABS[0];

  return (
    <main className="h-dvh w-full overflow-y-auto overflow-x-hidden scroll-smooth bg-card text-ink">
      {/* Cabeçalho fixo com navegação rápida */}
      <header className="sticky top-0 z-30 border-b border-line/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-12">
          <Link
            to="/"
            className="inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
            aria-label={`${appName}, página inicial`}
          >
            <img src={iconSrc} alt="" className="h-10 w-10 rounded-xl object-contain shadow-sm" />
            <div>
              <span className="block text-base font-bold leading-tight tracking-tight text-ink">
                {appName}
              </span>
              <span className="block text-[11px] font-medium text-ink-soft">
                App, Web & Estúdio Musical
              </span>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Seções da apresentação"
          >
            {[
              ["#demonstracao", "Demonstração Interativa"],
              ["#funcionalidades", "Todas as Funcionalidades"],
              ["#estudio", "Estúdio & White-Label"],
              ["#planos", "Simulador & Planos"],
              ["#faq", "Dúvidas"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-full px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:bg-paper hover:text-ink"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5" aria-label="Acesso à conta">
            <Link
              to="/inicio"
              className="hidden h-9 items-center rounded-full border border-line bg-paper px-4 text-xs font-semibold text-ink transition-colors hover:bg-card sm:inline-flex"
            >
              Abrir App
            </Link>
            {user ? (
              user.role === "admin" ? (
                <a
                  href={getAdminUrl()}
                  className="inline-flex h-9 items-center rounded-full bg-pine px-4 text-xs font-semibold text-white transition-colors hover:bg-pine-dark sm:h-10 sm:px-5 sm:text-sm"
                >
                  Painel administrativo
                </a>
              ) : (
                <Link
                  to="/conta"
                  className="inline-flex h-9 items-center rounded-full bg-pine px-4 text-xs font-semibold text-white transition-colors hover:bg-pine-dark sm:h-10 sm:px-5 sm:text-sm"
                >
                  Meu painel
                </Link>
              )
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex h-9 items-center rounded-full px-3.5 text-xs font-semibold text-ink hover:bg-paper sm:h-10 sm:px-4 sm:text-sm"
                >
                  Entrar
                </Link>
                <Link
                  to="/cadastro"
                  className="inline-flex h-9 items-center rounded-full bg-pine px-4 text-xs font-semibold text-white transition-colors hover:bg-pine-dark sm:h-10 sm:px-5 sm:text-sm"
                >
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO + DEMONSTRAÇÃO INTERATIVA AO VIVO */}
      <section id="demonstracao" className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_15%,rgb(var(--pine)/0.14),transparent_45%),radial-gradient(ellipse_at_20%_80%,rgb(var(--pine)/0.08),transparent_40%),linear-gradient(to_bottom,rgb(var(--paper)/0.55),transparent)]"
        />

        <div className="mx-auto grid w-full max-w-7xl items-start gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-12 lg:py-20">
          {/* Coluna de texto e CTAs */}
          <div className="max-w-2xl">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-pine/25 bg-pine/5 px-3.5 py-1.5 text-xs font-semibold text-pine">
              <span className="h-2 w-2 rounded-full bg-pine" />
              <span>Plataforma Completa · App PWA + Web + Estúdio Admin</span>
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              A música que une.
              <span className="mt-1.5 block text-pine">
                O repertório completo na palma da mão.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">
              Reúna <strong className="font-semibold text-ink">letras cronológicas</strong>,{" "}
              <strong className="font-semibold text-ink">divisão de vozes por cores</strong>,{" "}
              <strong className="font-semibold text-ink">cifras com transposição instantânea</strong>{" "}
              e <strong className="font-semibold text-ink">demonstrações de áudio</strong> em um
              único aplicativo personalizável para sua banda, carreira solo, grupo vocal ou empresa.
            </p>

            {/* Pílulas rápidas de recursos */}
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "Letra · Vozes · Cifra",
                "Transposição nos 12 tons",
                "Player de Áudio Integrado",
                "Temas & Favoritos",
                "12 Paletas + Modo Escuro",
                "Personalização White-Label",
              ].map((pill) => (
                <span
                  key={pill}
                  className="rounded-xl border border-line bg-paper/80 px-3 py-1.5 text-xs font-medium text-ink"
                >
                  ✓ {pill}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {user ? (
                user.role === "admin" ? (
                  <a
                    href={getAdminUrl()}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-pine px-7 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pine-dark"
                  >
                    Ir para administração
                  </a>
                ) : (
                  <Link
                    to="/conta"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-pine px-7 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pine-dark"
                  >
                    Acessar meu painel
                  </Link>
                )
              ) : (
                <Link
                  to="/cadastro"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-pine px-7 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pine-dark"
                >
                  Criar minha conta gratuita
                </Link>
              )}

              <a
                href="#planos"
                className="inline-flex h-12 items-center justify-center rounded-full border border-pine/30 bg-pine/10 px-6 text-sm font-semibold text-pine transition-colors hover:bg-pine/15"
              >
                Simular planos e valores
              </a>

              <Link
                to="/inicio"
                className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-card px-6 text-sm font-semibold text-ink transition-colors hover:bg-paper"
              >
                Testar o App agora
              </Link>
            </div>

            {/* Indicadores numéricos de destaque */}
            <dl className="mt-10 grid grid-cols-2 gap-4 border-t border-line pt-6 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium text-ink-soft">Modos de leitura</dt>
                <dd className="mt-1 text-2xl font-bold text-ink">3 em 1</dd>
                <span className="text-[11px] text-ink-soft">Letra, Vozes e Cifra</span>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-soft">Transposição</dt>
                <dd className="mt-1 text-2xl font-bold text-ink">12 Tons</dd>
                <span className="text-[11px] text-ink-soft">Com # e b automáticos</span>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-soft">Identidade visual</dt>
                <dd className="mt-1 text-2xl font-bold text-ink">12 Paletas</dd>
                <span className="text-[11px] text-ink-soft">Claro, Escuro e Sistema</span>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-soft">Implantação</dt>
                <dd className="mt-1 text-2xl font-bold text-pine">2 Modos</dd>
                <span className="text-[11px] text-ink-soft">Nuvem ou Arquivo Bruto</span>
              </div>
            </dl>
          </div>

          {/* Coluna do Simulador Interativo do Aplicativo */}
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-[2.5rem] bg-pine/10 blur-2xl sm:-inset-6"
            />
            <div className="relative overflow-hidden rounded-[2rem] border border-line bg-card shadow-[0_30px_90px_-35px_rgba(15,23,42,0.38)]">
              {/* Barra superior do simulador */}
              <div className="border-b border-line bg-paper/70 px-4 py-3 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-pine" />
                    <span className="text-xs font-bold uppercase tracking-wider text-pine">
                      Simulador Interativo ao Vivo
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-ink-soft">
                    Clique nas abas abaixo para testar as funções reais
                  </span>
                </div>

                {/* Seletor de modo da demonstração */}
                <div
                  role="tablist"
                  aria-label="Funções do demonstrador"
                  className="mt-3 grid grid-cols-5 gap-1.5 rounded-2xl border border-line bg-card p-1"
                >
                  {[
                    { id: "catalogo", label: "Catálogo" },
                    { id: "letra", label: "Letra" },
                    { id: "vozes", label: "Vozes" },
                    { id: "cifra", label: "Cifra" },
                    { id: "audio", label: "Áudio/Info" },
                  ].map((tab) => {
                    const active = demoTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setDemoTab(tab.id)}
                        className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                          active
                            ? "bg-pine text-white shadow-sm"
                            : "text-ink-soft hover:bg-paper hover:text-ink"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cabeçalho simulado do App */}
              <div className="flex items-center justify-between gap-3 bg-pine px-5 py-3.5 text-white">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={iconSrc}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-xl bg-white/10 object-contain p-0.5"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold leading-tight">
                      {demoTab === "catalogo"
                        ? `${appName} · Catálogo`
                        : `${activeSong.number}. ${activeSong.title}`}
                    </p>
                    <p className="truncate text-[11px] text-white/80">
                      {demoTab === "catalogo"
                        ? "Pesquise por número, título ou trecho da letra"
                        : `${activeSong.band} · Tema: ${activeSong.theme}`}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
                    Tom: {currentDemoKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleDemoFavorite(activeSong.id)}
                    aria-label="Alternar favorito na demonstração"
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      demoFavorites.includes(activeSong.id)
                        ? "bg-white text-pine"
                        : "bg-white/15 text-white hover:bg-white/25"
                    }`}
                  >
                    ♥
                  </button>
                </div>
              </div>

              {/* Corpo dinâmico do simulador */}
              <div className="min-h-[340px] bg-card p-5 sm:p-6">
                {demoTab === "catalogo" ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3.5 py-2.5">
                      <SearchIcon />
                      <input
                        type="search"
                        value={demoSearch}
                        onChange={(event) => setDemoSearch(event.target.value)}
                        placeholder="Buscar por número (001), título ou trecho da letra..."
                        className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-soft"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
                      <span>
                        Exibindo <strong>{filteredDemoSongs.length}</strong> músicas de demonstração
                      </span>
                      <span>Favoritas marcadas: {demoFavorites.length}</span>
                    </div>

                    <div className="space-y-2.5">
                      {filteredDemoSongs.map((song) => {
                        const isSelected = song.id === activeSong.id;
                        const isFav = demoFavorites.includes(song.id);
                        return (
                          <div
                            key={song.id}
                            className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
                              isSelected
                                ? "border-pine bg-pine/5 ring-1 ring-pine/30"
                                : "border-line bg-paper/60 hover:bg-paper"
                            }`}
                          >
                            <span className="font-mono text-xs font-bold tabular-nums text-pine">
                              {song.number}
                            </span>
                            <span aria-hidden className="h-8 w-px bg-line" />
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSongId(song.id);
                                setDemoTranspose(0);
                                setDemoTab("letra");
                              }}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p className="truncate text-sm font-semibold text-ink">
                                {song.title}
                              </p>
                              <p className="truncate text-xs text-ink-soft">
                                {song.band} · {song.theme} · Tom {song.baseKey}
                              </p>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleDemoFavorite(song.id)}
                              className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                                isFav
                                  ? "bg-pine/15 text-pine"
                                  : "bg-card text-ink-soft hover:text-ink"
                              }`}
                            >
                              {isFav ? "♥ Favorita" : "♡ Favoritar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSongId(song.id);
                                setDemoTranspose(0);
                                setDemoTab("cifra");
                              }}
                              className="rounded-xl bg-pine px-3 py-1.5 text-xs font-semibold text-white hover:bg-pine-dark"
                            >
                              Abrir
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {demoTab === "letra" ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-paper/70 px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink">Tamanho da letra:</span>
                        <button
                          type="button"
                          onClick={() => setDemoFontSize((s) => Math.max(13, s - 2))}
                          className="h-7 rounded-lg border border-line bg-card px-2.5 text-xs font-bold text-ink hover:bg-paper"
                        >
                          A-
                        </button>
                        <span className="font-mono text-xs font-semibold text-pine">
                          {demoFontSize}px
                        </span>
                        <button
                          type="button"
                          onClick={() => setDemoFontSize((s) => Math.min(24, s + 2))}
                          className="h-7 rounded-lg border border-line bg-card px-2.5 text-xs font-bold text-ink hover:bg-paper"
                        >
                          A+
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDemoChronological((v) => !v)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                          demoChronological
                            ? "bg-pine text-white"
                            : "border border-line bg-card text-ink-soft"
                        }`}
                      >
                        {demoChronological ? "✓ Cronologia ativa" : "Cronologia desligada"}
                      </button>
                    </div>

                    <div
                      style={{ fontSize: `${demoFontSize}px` }}
                      className="space-y-4 rounded-2xl border border-line bg-paper/40 p-4 font-lyric leading-relaxed text-ink"
                    >
                      {activeSong.stanzas.map((stanza, index) => (
                        <div key={index} className="space-y-3">
                          <div>
                            {stanza.map((line, lineIdx) => (
                              <p key={lineIdx}>{line}</p>
                            ))}
                          </div>
                          {(demoChronological || index === 0) && (
                            <div className="rounded-xl border-l-4 border-pine bg-pine/5 py-2 pl-3.5 pr-2 font-semibold text-pine">
                              <span className="block text-[10px] font-sans uppercase tracking-wider text-ink-soft">
                                Refrão {demoChronological ? `(após ${index + 1}ª estrofe)` : ""}
                              </span>
                              {activeSong.chorus.map((cLine, cIdx) => (
                                <p key={cIdx}>{cLine}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {demoTab === "vozes" ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-paper/70 px-3.5 py-2.5 text-xs">
                      <span className="font-semibold text-ink">Legenda de divisão vocal:</span>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-voice-men">
                          <span className="h-2.5 w-2.5 rounded-full bg-voice-men" />
                          Homens
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-semibold text-voice-women">
                          <span className="h-2.5 w-2.5 rounded-full bg-voice-women" />
                          Mulheres
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                          <span className="h-2.5 w-2.5 rounded-full bg-pine" />
                          Todos (Uníssono)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {activeSong.voices.map((item, idx) => {
                        const badgeClass =
                          item.part === "men"
                            ? "border-voice-men/30 bg-voice-men/10 text-voice-men"
                            : item.part === "women"
                              ? "border-voice-women/30 bg-voice-women/10 text-voice-women"
                              : "border-pine/30 bg-pine/10 text-pine";
                        return (
                          <div
                            key={idx}
                            className={`rounded-2xl border p-3.5 ${badgeClass}`}
                          >
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              {item.label}
                            </span>
                            <p className="mt-1 font-lyric text-base font-medium text-ink">
                              {item.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-line bg-paper/60 p-3 text-xs text-ink-soft">
                      <strong className="font-semibold text-ink">Nota de arranjo:</strong>{" "}
                      {activeSong.notes}
                    </div>
                  </div>
                ) : null}

                {demoTab === "cifra" ? (
                  <div className="space-y-4">
                    {/* Barra de transposição real */}
                    <div className="space-y-2.5 rounded-2xl border border-line bg-paper/80 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">
                            Tom atual:{" "}
                            <strong className="font-mono text-sm text-pine">
                              {currentDemoKey}
                            </strong>
                          </span>
                          {demoTranspose !== 0 ? (
                            <span className="rounded-md bg-pine/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-pine">
                              {demoTranspose > 0 ? `+${demoTranspose}` : demoTranspose} st
                            </span>
                          ) : (
                            <span className="text-[11px] text-ink-soft">(Original)</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDemoTranspose((t) => t - 1)}
                            className="h-7 rounded-lg border border-line bg-card px-2.5 font-mono text-xs font-bold text-ink hover:bg-paper"
                          >
                            -1/2
                          </button>
                          <button
                            type="button"
                            onClick={() => setDemoTranspose(0)}
                            className="h-7 rounded-lg border border-line bg-card px-2.5 text-xs font-semibold text-ink-soft hover:text-ink"
                          >
                            Original ({activeSong.baseKey})
                          </button>
                          <button
                            type="button"
                            onClick={() => setDemoTranspose((t) => t + 1)}
                            className="h-7 rounded-lg border border-line bg-card px-2.5 font-mono text-xs font-bold text-ink hover:bg-paper"
                          >
                            +1/2
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {DEMO_KEYS.map((keyOption) => {
                          const isCurrent = currentDemoKey === keyOption;
                          return (
                            <button
                              key={keyOption}
                              type="button"
                              onClick={() => selectDemoKey(keyOption)}
                              className={`h-7 min-w-[2.1rem] rounded-lg px-2 font-mono text-xs font-bold transition-colors ${
                                isCurrent
                                  ? "bg-pine text-white"
                                  : "border border-line bg-card text-ink hover:bg-paper"
                              }`}
                            >
                              {keyOption}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Visualização da cifra transposta em tempo real */}
                    <div className="space-y-3 rounded-2xl border border-line bg-paper/40 p-4 font-mono text-xs leading-relaxed">
                      {activeSong.stanzas.map((stanza, sIdx) => (
                        <div key={sIdx} className="space-y-1.5">
                          {stanza.map((lyricLine, lIdx) => (
                            <div key={lIdx}>
                              <p className=" whitespace-pre font-bold text-pine">
                                {transposedStanzas[sIdx]?.[lIdx] || ""}
                              </p>
                              <p className="font-sans text-sm text-ink">{lyricLine}</p>
                            </div>
                          ))}
                        </div>
                      ))}

                      <div className="rounded-xl border-l-4 border-pine bg-pine/5 p-3">
                        <p className="mb-1 font-sans text-[10px] font-bold uppercase tracking-wider text-pine">
                          Refrão cifrado ({currentDemoKey})
                        </p>
                        {activeSong.chorus.map((chorusLine, cIdx) => (
                          <div key={cIdx} className="mt-1">
                            <p className="whitespace-pre font-bold text-pine">
                              {transposedChorus[cIdx] || ""}
                            </p>
                            <p className="font-sans text-sm font-semibold text-ink">
                              {chorusLine}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {demoTab === "audio" ? (
                  <div className="space-y-4">
                    {/* Player simulado */}
                    <div className="rounded-2xl border border-pine/25 bg-pine/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setDemoPlaying((p) => !p)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine text-white shadow-sm hover:bg-pine-dark"
                            aria-label={demoPlaying ? "Pausar demonstração" : "Ouvir demonstração"}
                          >
                            {demoPlaying ? "❚❚" : "▶"}
                          </button>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-pine">
                              Demonstração de Áudio
                            </p>
                            <p className="text-sm font-semibold text-ink">
                              {activeSong.title} — {activeSong.band}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-semibold text-ink-soft">
                          01:24 / {activeSong.duration}
                        </span>
                      </div>

                      <div className="mt-4 space-y-1.5">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={demoProgress}
                          onChange={(event) => setDemoProgress(Number(event.target.value))}
                          aria-label="Linha do tempo da demonstração"
                          className="h-2 w-full cursor-pointer accent-pine"
                        />
                        <div className="flex justify-between text-[11px] text-ink-soft">
                          <span>{demoPlaying ? "Reproduzindo prévia..." : "Toque em ▶ para simular"}</span>
                          <span>Arraste a barra para avançar/voltar</span>
                        </div>
                      </div>
                    </div>

                    {/* Ficha técnica completa */}
                    <div className="rounded-2xl border border-line bg-paper/60 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-pine">
                        Ficha Técnica da Música
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                        <div className="rounded-xl bg-card p-2.5">
                          <dt className="text-ink-soft">Banda / Intérprete</dt>
                          <dd className="mt-0.5 font-semibold text-ink">{activeSong.band}</dd>
                        </div>
                        <div className="rounded-xl bg-card p-2.5">
                          <dt className="text-ink-soft">Compositor / Ref.</dt>
                          <dd className="mt-0.5 font-semibold text-ink">{activeSong.composer}</dd>
                        </div>
                        <div className="rounded-xl bg-card p-2.5">
                          <dt className="text-ink-soft">Álbum / Coletânea</dt>
                          <dd className="mt-0.5 font-semibold text-ink">{activeSong.album}</dd>
                        </div>
                        <div className="rounded-xl bg-card p-2.5">
                          <dt className="text-ink-soft">Ano</dt>
                          <dd className="mt-0.5 font-semibold text-ink">{activeSong.year}</dd>
                        </div>
                        <div className="rounded-xl bg-card p-2.5">
                          <dt className="text-ink-soft">Tema Oficial</dt>
                          <dd className="mt-0.5 font-semibold text-pine">{activeSong.theme}</dd>
                        </div>
                        <div className="rounded-xl bg-card p-2.5">
                          <dt className="text-ink-soft">Tonalidade Base</dt>
                          <dd className="mt-0.5 font-mono font-semibold text-ink">
                            Tom {activeSong.baseKey}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Barra inferior simulada de troca rápida de música */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper/75 px-5 py-3 text-xs">
                <span className="font-medium text-ink-soft">Trocar música no simulador:</span>
                <div className="flex flex-wrap gap-1.5">
                  {DEMO_SONGS.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => {
                        setSelectedSongId(song.id);
                        setDemoTranspose(0);
                      }}
                      className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                        song.id === activeSong.id
                          ? "bg-pine text-white"
                          : "border border-line bg-card text-ink-soft hover:text-ink"
                      }`}
                    >
                      {song.number} · {song.title.split(" ")[0]}…
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: TODAS AS FUNCIONALIDADES DO APLICATIVO */}
      <section id="funcionalidades" className="border-t border-line bg-paper/45">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">
                Ecossistema musical completo
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Todas as funcionalidades em detalhes.
              </h2>
              <p className="mt-3 text-base leading-7 text-ink-soft">
                Do cantor e músico no palco ao diretor musical e ao administrador do estúdio: cada
                recurso foi desenhado para tornar ensaios, shows e apresentações fluidos, organizados e acessíveis.
              </p>
            </div>

            {/* Filtro por categoria de funcionalidade */}
            <div
              role="tablist"
              aria-label="Filtrar funcionalidades por categoria"
              className="flex flex-wrap gap-2"
            >
              {FEATURE_CATEGORIES.map((category) => {
                const active = featureCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFeatureCategory(category.id)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-pine text-white shadow-sm"
                        : "border border-line bg-card text-ink-soft hover:bg-paper hover:text-ink"
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFeatures.map((feature, index) => (
              <article
                key={feature.id}
                className="flex flex-col justify-between rounded-3xl border border-line bg-card p-6 shadow-sm transition-all hover:border-pine/40 sm:p-7"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                      {feature.badge}
                    </span>
                    <span className="font-mono text-xs font-semibold text-ink-soft">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{feature.description}</p>
                </div>

                <ul className="mt-5 space-y-2 border-t border-line pt-4">
                  {feature.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-ink">
                      <span className="mt-0.5 font-bold text-pine">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO: ESTÚDIO ADMINISTRATIVO & TESTADOR DE PALETAS AO VIVO */}
      <section id="estudio" className="border-t border-line bg-card">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">
              Painel Administrativo & Personalização
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Um estúdio completo para gerir músicas, vozes, cores e identidade.
            </h2>
            <p className="mt-3 text-base leading-7 text-ink-soft">
              Além do aplicativo para músicos e público, o {appName} inclui um painel administrativo web
              para cadastrar repertórios, estilizar arranjos vocais, personalizar a identidade da sua
              banda, carreira ou empresa e exportar o projeto.
            </p>
          </div>

          {/* Abas do Estúdio */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3" role="tablist">
            {STUDIO_TABS.map((tab) => {
              const active = studioTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStudioTab(tab.id)}
                  className={`flex flex-col items-start rounded-2xl border p-5 text-left transition-all ${
                    active
                      ? "border-pine bg-pine/5 ring-2 ring-pine/20"
                      : "border-line bg-paper/50 hover:bg-paper"
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-pine">
                    {tab.badge}
                  </span>
                  <span className="mt-2 text-base font-semibold text-ink">{tab.title}</span>
                </button>
              );
            })}
          </div>

          {/* Conteúdo detalhado da aba do Estúdio + Testador de Cores */}
          <div className="mt-6 grid gap-8 rounded-3xl border border-line bg-paper/50 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-5">
              <span className="inline-flex rounded-full bg-pine px-3.5 py-1 text-xs font-semibold text-white">
                {currentStudio.badge}
              </span>
              <h3 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {currentStudio.title}
              </h3>
              <p className="text-sm leading-7 text-ink-soft sm:text-base">
                {currentStudio.description}
              </p>
              <ul className="space-y-3">
                {currentStudio.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-3 rounded-2xl border border-line bg-card p-3.5 text-sm text-ink"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pine/15 text-xs font-bold text-pine">
                      ✓
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card Interativo: Experimente as 12 Paletas e Temas ao vivo */}
            <div className="rounded-3xl border border-line bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-pine">
                    Experimente agora nesta página
                  </p>
                  <h4 className="mt-0.5 text-base font-semibold text-ink">
                    12 Paletas de Cores & Modo Claro/Escuro
                  </h4>
                </div>
                {settings.allowAppearanceChanges ? (
                  <div className="flex rounded-xl border border-line bg-paper p-1">
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                        theme === "light" ? "bg-pine text-white" : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      ☀ Claro
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                        theme === "dark" ? "bg-pine text-white" : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      ☾ Escuro
                    </button>
                  </div>
                ) : null}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                Toque em qualquer paleta abaixo para ver toda a página e o simulador mudarem de cor
                instantaneamente, exatamente como funciona no aplicativo:
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ACCENT_OPTIONS.map((option) => {
                  const isSelected = accent === option.id;
                  const canSelect =
                    settings.allowAppearanceChanges &&
                    settings.allowedAccents.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={!canSelect}
                      onClick={() => setAccent(option.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all ${
                        isSelected
                          ? "border-pine bg-pine/10 ring-2 ring-pine/30"
                          : "border-line bg-paper/60 hover:bg-paper"
                      } ${!canSelect ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <span
                        aria-hidden
                        className="inline-flex h-5 w-8 shrink-0 overflow-hidden rounded border border-black/15"
                      >
                        <span style={{ backgroundColor: option.swatch }} className="h-full flex-1" />
                        <span
                          style={{ backgroundColor: option.secondarySwatch || option.swatch }}
                          className="h-full flex-1"
                        />
                      </span>
                      <span className="truncate text-xs font-semibold text-ink">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2.5 border-t border-line pt-4 text-center text-xs">
                <div className="rounded-xl bg-paper p-2.5">
                  <p className="font-bold text-pine">Retrato</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">Celulares em pé</p>
                </div>
                <div className="rounded-xl bg-paper p-2.5">
                  <p className="font-bold text-pine">Paisagem</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">Estante / Púlpito</p>
                </div>
                <div className="rounded-xl bg-paper p-2.5">
                  <p className="font-bold text-pine">Web Desktop</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">Projeção e Estúdio</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: SIMULADOR DE VALORES E PLANOS FICTÍCIOS */}
      <section id="planos" className="border-t border-line bg-paper/55">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-pine/25 bg-pine/10 px-3.5 py-1 text-xs font-semibold text-pine">
                <span>Simulador Comercial Interativo · Valores Fictícios</span>
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Planos e simulação de investimento para cada perfil musical.
              </h2>
              <p className="mt-3 text-base leading-7 text-ink-soft">
                Simule abaixo o cenário ideal para você, sua banda, grupo ou empresa, compare os planos
                em nuvem gerenciada ou veja a opção de pacote compilado independente.
              </p>
            </div>

            {/* Alternador Mensal / Anual */}
            <div
              role="group"
              aria-label="Ciclo de cobrança simulado"
              className="inline-flex items-center rounded-full border border-line bg-card p-1.5 shadow-sm"
            >
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-pine text-white shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Ciclo Mensal
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  billingCycle === "annual"
                    ? "bg-pine text-white shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                <span>Ciclo Anual</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    billingCycle === "annual"
                      ? "bg-white text-pine"
                      : "bg-pine/15 text-pine"
                  }`}
                >
                  -20% OFF
                </span>
              </button>
            </div>
          </div>

          {/* CALCULADORA / SIMULADOR INTERATIVO DE CENÁRIO */}
          <div className="mt-10 grid gap-6 rounded-3xl border border-pine/25 bg-card p-6 shadow-sm sm:p-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-ink">
                  Monte seu cenário e descubra o plano ideal
                </h3>
                <p className="mt-1 text-xs text-ink-soft">
                  Ajuste o número de membros, tamanho da coletânea e recursos desejados para
                  calcular a estimativa fictícia em tempo real.
                </p>
              </div>

              {/* 1. Modalidade de entrega */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  1. Modalidade de disponibilização (App + Web)
                </label>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {[
                    {
                      id: "cloud",
                      title: "Hospedagem Mensal",
                      desc: "Nuvem gerenciada pronta para usar",
                    },
                    {
                      id: "hybrid",
                      title: "Nuvem + Arquivo Bruto",
                      desc: "Assinatura + pacote .zip liberado",
                    },
                    {
                      id: "raw",
                      title: "Só Arquivo Bruto",
                      desc: "Licença única p/ servidor próprio",
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSimDeliveryMode(mode.id)}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        simDeliveryMode === mode.id
                          ? "border-pine bg-pine/10 ring-2 ring-pine/25"
                          : "border-line bg-paper/60 hover:bg-paper"
                      }`}
                    >
                      <p className="text-xs font-bold text-ink">{mode.title}</p>
                      <p className="mt-0.5 text-[11px] text-ink-soft">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Tamanho do catálogo e Membros */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    2. Tamanho estimado do catálogo
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "150", label: "Até 150" },
                      { id: "500", label: "Até 500" },
                      { id: "unlimited", label: "Ilimitado" },
                    ].map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSimSongsTier(tier.id)}
                        className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                          simSongsTier === tier.id
                            ? "border-pine bg-pine text-white"
                            : "border-line bg-paper text-ink hover:bg-card"
                        }`}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wide text-ink-soft">
                      3. Membros / dispositivos
                    </span>
                    <strong className="font-mono text-sm text-pine">
                      {simMembers >= 500 ? "500+ membros" : `${simMembers} membros`}
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={500}
                    step={10}
                    value={simMembers}
                    onChange={(event) => setSimMembers(Number(event.target.value))}
                    aria-label="Quantidade estimada de membros"
                    className="h-2 w-full cursor-pointer accent-pine"
                  />
                  <div className="flex justify-between text-[11px] text-ink-soft">
                    <span>20 (Solo / Trio)</span>
                    <span>150 (Banda / Grupo)</span>
                    <span>500+ (Produtora)</span>
                  </div>
                </div>
              </div>

              {/* 4. Recursos adicionais */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  4. Recursos essenciais para o seu projeto
                </span>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-line bg-paper/60 p-3 text-xs">
                    <input
                      type="checkbox"
                      checked={simNeedVoices}
                      onChange={(e) => setSimNeedVoices(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-pine"
                    />
                    <span>
                      <strong className="block font-semibold text-ink">Divisão de Vozes</strong>
                      <span className="text-ink-soft">Homens, Mulheres e Todos por cores</span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-line bg-paper/60 p-3 text-xs">
                    <input
                      type="checkbox"
                      checked={simNeedAudio}
                      onChange={(e) => setSimNeedAudio(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-pine"
                    />
                    <span>
                      <strong className="block font-semibold text-ink">Prévias de Áudio</strong>
                      <span className="text-ink-soft">Streaming de gravações no app</span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-line bg-paper/60 p-3 text-xs">
                    <input
                      type="checkbox"
                      checked={simNeedWhiteLabel}
                      onChange={(e) => setSimNeedWhiteLabel(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-pine"
                    />
                    <span>
                      <strong className="block font-semibold text-ink">White-Label + 12 Cores</strong>
                      <span className="text-ink-soft">Nome e ícone próprios da sua marca</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Painel de Resultado da Simulação */}
            <div className="flex flex-col justify-between rounded-3xl border border-pine/30 bg-pine/5 p-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-pine">
                    Recomendação Simulada
                  </span>
                  <span className="rounded-full bg-pine px-3 py-0.5 text-[11px] font-semibold text-white">
                    {simulationResult.badge}
                  </span>
                </div>

                <h4 className="mt-2 text-2xl font-bold text-ink">{simulationResult.planName}</h4>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {simulationResult.reason}
                </p>

                <div className="mt-5 rounded-2xl border border-line bg-card p-4">
                  {simulationResult.mode === "one-time" ? (
                    <div>
                      <p className="text-xs font-medium text-ink-soft">
                        Investimento único simulado (Pacote Compilado)
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-ink">
                          R$ {simulationResult.totalPrice}
                        </span>
                        <span className="text-xs text-ink-soft">pagamento único</span>
                      </div>
                      <p className="mt-1 text-xs text-pine">
                        Equivale a ~R$ {simulationResult.perMemberCost}/mês por membro no 1º ano
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-ink-soft">
                        Valor simulado ({billingCycle === "annual" ? "no plano anual" : "no plano mensal"})
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-ink">
                          R$ {simulationResult.monthlyEquivalent}
                        </span>
                        <span className="text-xs text-ink-soft">/ mês</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-pine">
                          Apenas R$ {simulationResult.perMemberCost} por membro/mês
                        </span>
                        {billingCycle === "annual" && simulationResult.annualSavings > 0 ? (
                          <span className="rounded-md bg-pine/10 px-2 py-0.5 font-semibold text-pine">
                            Economia de R$ {simulationResult.annualSavings}/ano
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                <ul className="mt-4 space-y-2">
                  {simulationResult.includedHighlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-ink">
                      <span className="font-bold text-pine">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    setSimulatedCheckoutPlan({
                      name: simulationResult.planName,
                      priceLabel:
                        simulationResult.mode === "one-time"
                          ? `R$ ${simulationResult.totalPrice} (Licença única)`
                          : `R$ ${simulationResult.monthlyEquivalent}/mês (${
                              billingCycle === "annual" ? "faturado anualmente" : "mensal"
                            })`,
                      members: simMembers,
                      delivery:
                        simDeliveryMode === "raw"
                          ? "Arquivo Bruto (.zip)"
                          : simDeliveryMode === "hybrid"
                            ? "Híbrido (Nuvem + Arquivo Bruto)"
                            : "Hospedagem Mensal em Nuvem",
                    })
                  }
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-pine px-6 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-pine-dark sm:text-sm"
                >
                  Simular contratação deste cenário
                </button>
                <p className="text-center text-[11px] text-ink-soft">
                  Simulação demonstrativa sem cobrança real.
                </p>
              </div>
            </div>
          </div>

          {/* CARDS DOS 3 PLANOS DE ASSINATURA FICTÍCIOS */}
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {FICTIONAL_PLANS.map((plan) => {
              const displayPrice =
                billingCycle === "annual" ? plan.annualMonthlyPrice : plan.monthlyPrice;
              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl border bg-card p-6 shadow-sm sm:p-8 ${
                    plan.popular
                      ? "border-pine ring-2 ring-pine/30"
                      : "border-line"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-bold text-ink">{plan.name}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          plan.popular
                            ? "bg-pine text-white"
                            : "bg-paper text-ink-soft"
                        }`}
                      >
                        {plan.badge}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">{plan.tagline}</p>

                    <div className="mt-5 border-y border-line py-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-semibold text-ink-soft">R$</span>
                        <span className="text-4xl font-bold tracking-tight text-ink">
                          {displayPrice}
                        </span>
                        <span className="text-xs text-ink-soft">/mês*</span>
                      </div>
                      <p className="mt-1 text-xs text-ink-soft">
                        {billingCycle === "annual"
                          ? `Faturado anualmente (R$ ${plan.annualTotal}/ano · 2 meses grátis)`
                          : "Cobrança mensal flexível sem fidelidade (valor fictício)"}
                      </p>
                    </div>

                    <div className="mt-4 space-y-1.5 rounded-2xl bg-paper/70 p-3 text-xs">
                      <p className="font-semibold text-ink">• {plan.songsLimitLabel}</p>
                      <p className="font-semibold text-ink">• {plan.membersLabel}</p>
                      <p className="font-semibold text-pine">• {plan.adminsLabel}</p>
                    </div>

                    <ul className="mt-5 space-y-2.5 text-xs">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-ink">
                          <span className="mt-0.5 font-bold text-pine">✓</span>
                          <span className="leading-relaxed">{feat}</span>
                        </li>
                      ))}
                      {plan.notIncluded.map((missing) => (
                        <li key={missing} className="flex items-start gap-2.5 text-ink-soft/75">
                          <span className="mt-0.5">✕</span>
                          <span className="leading-relaxed line-through">{missing}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSimulatedCheckoutPlan({
                        name: `Plano ${plan.name}`,
                        priceLabel: `R$ ${displayPrice}/mês (${
                          billingCycle === "annual" ? "anual" : "mensal"
                        })`,
                        members: plan.membersLabel,
                        delivery: "Hospedagem em Nuvem Gerenciada (App + Web)",
                      })
                    }
                    className={`mt-7 inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors ${
                      plan.popular
                        ? "bg-pine text-white hover:bg-pine-dark"
                        : "border border-line bg-paper text-ink hover:bg-card"
                    }`}
                  >
                    Simular {plan.name}
                  </button>
                </article>
              );
            })}
          </div>

          {/* CARD DESTAQUE: MODALIDADE ARQUIVO BRUTO (SELF-HOSTED) */}
          <div className="mt-8 rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
              <div>
                <span className="inline-flex rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                  {RAW_PACKAGE_PLAN.badge}
                </span>
                <h3 className="mt-3 text-2xl font-semibold text-ink">{RAW_PACKAGE_PLAN.name}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {RAW_PACKAGE_PLAN.description}
                </p>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {RAW_PACKAGE_PLAN.deliverables.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 rounded-xl border border-line bg-paper/60 p-3 text-xs text-ink"
                    >
                      <span className="font-bold text-pine">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-paper p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Licença Única Simulada
                </p>
                <p className="mt-2 text-4xl font-bold text-ink">
                  R$ {RAW_PACKAGE_PLAN.oneTimePrice}
                </p>
                <p className="mt-1 text-xs text-ink-soft">{RAW_PACKAGE_PLAN.installments}</p>
                <button
                  type="button"
                  onClick={() =>
                    setSimulatedCheckoutPlan({
                      name: RAW_PACKAGE_PLAN.name,
                      priceLabel: `R$ ${RAW_PACKAGE_PLAN.oneTimePrice} (Pagamento único)`,
                      members: "Ilimitado no seu servidor",
                      delivery: "Pacote compilado (.zip) App + Web + API Node.js",
                    })
                  }
                  className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-pine px-5 text-sm font-semibold text-white hover:bg-pine-dark"
                >
                  Simular pacote Arquivo Bruto
                </button>
              </div>
            </div>
          </div>

          {/* Resumo da Simulação Selecionada (Feedback interativo quando clica em qualquer plano) */}
          {simulatedCheckoutPlan ? (
            <div
              role="region"
              aria-label="Resumo da simulação de plano"
              className="mt-8 rounded-3xl border-2 border-pine bg-card p-6 shadow-lg sm:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pine px-3 py-1 text-xs font-semibold text-white">
                    ✓ Proposta Fictícia Gerada
                  </span>
                  <h4 className="mt-3 text-2xl font-bold text-ink">
                    Resumo da Simulação: {simulatedCheckoutPlan.name}
                  </h4>
                  <p className="mt-1 text-sm text-ink-soft">
                    Esta é uma simulação demonstrativa. Na prática, você já pode criar sua conta
                    gratuitamente e usar todos os recursos do aplicativo agora mesmo!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulatedCheckoutPlan(null)}
                  className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink-soft hover:bg-paper hover:text-ink"
                >
                  Fechar resumo ✕
                </button>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-paper p-4">
                  <dt className="text-xs text-ink-soft">Valor Simulado</dt>
                  <dd className="mt-1 text-base font-bold text-pine">
                    {simulatedCheckoutPlan.priceLabel}
                  </dd>
                </div>
                <div className="rounded-2xl bg-paper p-4">
                  <dt className="text-xs text-ink-soft">Capacidade / Alcance</dt>
                  <dd className="mt-1 text-base font-bold text-ink">
                    {typeof simulatedCheckoutPlan.members === "number"
                      ? `Até ${simulatedCheckoutPlan.members} membros`
                      : simulatedCheckoutPlan.members}
                  </dd>
                </div>
                <div className="rounded-2xl bg-paper p-4">
                  <dt className="text-xs text-ink-soft">Formato de Entrega</dt>
                  <dd className="mt-1 text-base font-bold text-ink">
                    {simulatedCheckoutPlan.delivery}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to={user ? "/app" : "/cadastro"}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-pine px-6 text-sm font-semibold text-white hover:bg-pine-dark"
                >
                  {user ? "Abrir catálogo do aplicativo" : "Criar conta grátis e testar agora"}
                </Link>
                <Link
                  to="/inicio"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-paper px-6 text-sm font-semibold text-ink hover:bg-card"
                >
                  Ir para tela de instalação (PWA / Web)
                </Link>
              </div>
            </div>
          ) : null}

          {/* TABELA COMPARATIVA DE RECURSOS */}
          <div className="mt-12 overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
            <div className="border-b border-line px-6 py-5">
              <h3 className="text-lg font-semibold text-ink">
                Comparativo detalhado entre os planos (Simulação)
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                Veja como cada funcionalidade do {appName} se distribui nos planos demonstrativos.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper/75 text-xs uppercase tracking-wider text-ink-soft">
                    <th className="py-3.5 pl-6 pr-4 font-semibold">Funcionalidade</th>
                    <th className="px-4 py-3.5 font-semibold">Essencial / Solo</th>
                    <th className="px-4 py-3.5 font-bold text-pine">Banda & Artista Pro</th>
                    <th className="px-4 py-3.5 font-semibold">Produtora</th>
                    <th className="py-3.5 pl-4 pr-6 font-semibold">Arquivo Bruto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.label} className="hover:bg-paper/40">
                      <td className="py-3.5 pl-6 pr-4 font-medium text-ink">{row.label}</td>
                      <td className="px-4 py-3.5 text-ink-soft">{row.comunidade}</td>
                      <td className="px-4 py-3.5 font-semibold text-pine">{row.ministerio}</td>
                      <td className="px-4 py-3.5 text-ink">{row.denominacional}</td>
                      <td className="py-3.5 pl-4 pr-6 text-ink-soft">{row.bruto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: PERGUNTAS FREQUENTES (FAQ) */}
      <section id="faq" className="border-t border-line bg-card">
        <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">
              Perguntas Frequentes
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              Tire suas dúvidas sobre o {appName}
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FAQ_ITEMS.map((item) => (
              <article
                key={item.question}
                className="rounded-2xl border border-line bg-paper/50 p-6"
              >
                <h3 className="text-base font-semibold text-ink">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL E RODAPÉ */}
      <section className="border-t border-line bg-pine text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-5 py-12 sm:px-8 lg:flex-row lg:items-center lg:px-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Pronto para organizar seu repertório musical com excelência?
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/85 sm:text-base">
              Acesse agora o catálogo completo, experimente a transposição de cifras, a divisão de
              vozes e instale o {appName} no seu dispositivo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <Link
                to="/app"
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-pine shadow-sm transition-opacity hover:opacity-95"
              >
                Abrir o Aplicativo
              </Link>
            ) : (
              <>
                <Link
                  to="/cadastro"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-pine shadow-sm transition-opacity hover:opacity-95"
                >
                  Criar conta gratuita
                </Link>
                <Link
                  to="/login"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/20"
                >
                  Entrar na minha conta
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div className="flex items-center gap-2.5">
            <img src={iconSrc} alt="" className="h-6 w-6 rounded-md object-contain" />
            <p>
              <strong className="font-semibold text-ink">{appName}</strong> — Letras, vozes, cifras
              e áudios para bandas, cantores e projetos musicais. *(Valores e planos meramente ilustrativos)*
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/inicio" className="font-medium hover:text-ink">
              Instalar App / Web
            </Link>
            {!user ? (
              <>
                <Link to="/login" className="font-medium hover:text-ink">
                  Entrar
                </Link>
                <Link to="/cadastro" className="font-medium hover:text-ink">
                  Criar conta
                </Link>
              </>
            ) : user.role === "admin" ? (
              <a href={getAdminUrl()} className="font-medium hover:text-ink">
                Painel administrativo
              </a>
            ) : (
              <Link to="/conta" className="font-medium hover:text-ink">
                Minha conta
              </Link>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4 shrink-0 text-ink-soft"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
