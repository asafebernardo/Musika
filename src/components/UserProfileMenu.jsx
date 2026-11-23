import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth.jsx";
import { getAppSettings } from "@/lib/appSettings.js";

export const USER_ACCOUNT_SECTIONS = [
  {
    id: "perfil",
    label: "Meu Perfil e Contato",
    description: "Nome, sobrenome, foto de perfil, e-mail e telefone",
    icon: UserIcon,
  },
  {
    id: "plano",
    label: "Plano Pago Atual",
    description: "Detalhes da assinatura, limites e troca de plano",
    icon: PlanCrownIcon,
  },
  {
    id: "faturas",
    label: "Faturas e Recibos",
    description: "Histórico de cobranças, 2ª via e comprovantes",
    icon: InvoiceIcon,
  },
  {
    id: "dados-pagamento",
    label: "Dados de Pagamento",
    description: "CPF/CNPJ, titular e endereço de faturamento",
    icon: BillingDocIcon,
  },
  {
    id: "forma-pagamento",
    label: "Forma de Pagamento",
    description: "Cartões de crédito, PIX e boleto bancário",
    icon: CreditCardIcon,
  },
];

const AVAILABLE_PLANS = [
  {
    id: "comunidade",
    name: "Plano Essencial / Solo",
    badge: "Entrada",
    monthlyPrice: 29,
    annualMonthlyPrice: 23,
    songsLimit: "Até 150 músicas",
    membersLimit: "Até 50 membros",
    adminsLimit: "1 administrador",
    features: [
      "App Mobile (PWA) + Versão Web",
      "Catálogo numerado e letras cronológicas",
      "Cifras com transposição em 12 tons",
      "Temas Claro/Escuro e 4 paletas",
    ],
  },
  {
    id: "ministerio",
    name: "Plano Banda & Artista Pro",
    badge: "Mais escolhido",
    monthlyPrice: 69,
    annualMonthlyPrice: 55,
    songsLimit: "Músicas ilimitadas",
    membersLimit: "Até 300 membros",
    adminsLimit: "Até 5 administradores",
    features: [
      "Tudo do plano Essencial sem limites de músicas",
      "Divisão de vozes por cores (Homens, Mulheres e Todos)",
      "Player de demonstrações de áudio (10 GB em nuvem)",
      "White-Label completo (Nome, ícones e 12 paletas)",
    ],
  },
  {
    id: "denominacional",
    name: "Plano Produtora & Corporativo",
    badge: "Completo + Híbrido",
    monthlyPrice: 149,
    annualMonthlyPrice: 119,
    songsLimit: "Músicas ilimitadas",
    membersLimit: "Membros ilimitados",
    adminsLimit: "Administradores ilimitados",
    features: [
      "Acesso ilimitado + 50 GB para áudios de referência",
      "Exportação de Arquivo Bruto (.zip) liberada",
      "Operação híbrida (Nuvem + pacote para servidor local)",
      "Suporte prioritário e múltiplos editores simultâneos",
    ],
  },
  {
    id: "arquivo-bruto",
    name: "Licença Arquivo Bruto (Self-Hosted)",
    badge: "Pagamento único",
    monthlyPrice: 490,
    annualMonthlyPrice: 490,
    oneTime: true,
    songsLimit: "Ilimitado no seu servidor",
    membersLimit: "Ilimitado no seu servidor",
    adminsLimit: "Ilimitado",
    features: [
      "Pacote compilado (.zip) com App + Web + API Node.js",
      "Banco completo de músicas, cifras e áudios",
      "Sem mensalidade — hospedagem em infraestrutura própria",
    ],
  },
];

function getDefaultSubscription() {
  return {
    planId: "ministerio",
    planName: "Plano Banda & Artista Pro",
    billingCycle: "annual",
    price: 55,
    status: "Ativo",
    nextBillingDate: "15/12/2026",
    startedAt: "15/01/2026",
  };
}

function getDefaultBillingDetails(user) {
  const fullName = [user?.name, user?.lastName].filter(Boolean).join(" ") || "Administrador";
  return {
    documentType: "CPF",
    documentNumber: "123.456.789-00",
    holderName: fullName,
    billingEmail: user?.email || "",
    billingPhone: user?.phone || "(11) 99876-5432",
    zipCode: "01310-100",
    street: "Av. Paulista",
    number: "1000",
    complement: "Sala 42",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  };
}

function getDefaultPaymentMethod(user) {
  const fullName = ([user?.name, user?.lastName].filter(Boolean).join(" ") || "TITULAR").toUpperCase();
  return {
    preferredType: "credit_card",
    pixKeyEmail: user?.email || "",
    boletoDaysBefore: 7,
    cards: [
      {
        id: "card-default-1",
        brand: "Mastercard",
        last4: "4829",
        holderName: fullName,
        expiry: "08/29",
        isDefault: true,
      },
    ],
  };
}

function getDefaultInvoices() {
  return [
    {
      id: "FAT-2026-011",
      competence: "Novembro / 2026",
      dueDate: "15/11/2026",
      paidAt: "15/11/2026",
      planName: "Plano Banda & Artista Pro (Anual)",
      method: "Cartão •••• 4829",
      amount: 55.0,
      status: "paid",
    },
    {
      id: "FAT-2026-010",
      competence: "Outubro / 2026",
      dueDate: "15/10/2026",
      paidAt: "15/10/2026",
      planName: "Plano Banda & Artista Pro (Anual)",
      method: "Cartão •••• 4829",
      amount: 55.0,
      status: "paid",
    },
    {
      id: "FAT-2026-009",
      competence: "Setembro / 2026",
      dueDate: "15/09/2026",
      paidAt: "14/09/2026",
      planName: "Plano Banda & Artista Pro (Anual)",
      method: "PIX",
      amount: 55.0,
      status: "paid",
    },
  ];
}

function readLocalAccountCache(userId) {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(`musika_user_profile_${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalAccountCache(userId, data) {
  if (!userId) return;
  try {
    localStorage.setItem(`musika_user_profile_${userId}`, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

export default function UserProfileMenu({
  user: propUser,
  onLogout,
  externalOpenSection = null,
  onExternalSectionHandled,
  inline = false,
  activeTab: controlledActiveTab = null,
  onTabChange,
}) {
  const { user: authUser, updateAccount } = useAuth();
  const user = propUser || authUser;
  const { appName } = getAppSettings();

  const localCache = useMemo(() => readLocalAccountCache(user?.id), [user?.id]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const menuContainerRef = useRef(null);

  // Estado dos dados mesclados (API + cache local + padrões)
  const effectiveName = user?.name || localCache.name || "";
  const effectiveLastName = user?.lastName ?? localCache.lastName ?? "";
  const effectiveAvatar = user?.avatarUrl ?? localCache.avatarUrl ?? "";
  const effectiveEmail = user?.email || localCache.email || "";
  const effectivePhone = user?.phone ?? localCache.phone ?? "";
  const effectiveSubscription =
    user?.subscription || localCache.subscription || getDefaultSubscription();
  const effectiveBilling =
    user?.billingDetails || localCache.billingDetails || getDefaultBillingDetails(user);
  const effectivePaymentMethod =
    user?.paymentMethod || localCache.paymentMethod || getDefaultPaymentMethod(user);
  const effectiveInvoices =
    user?.invoices || localCache.invoices || getDefaultInvoices();

  // Estados de formulário
  const [profileForm, setProfileForm] = useState({
    name: effectiveName,
    lastName: effectiveLastName,
    avatarUrl: effectiveAvatar,
    email: effectiveEmail,
    phone: effectivePhone,
  });
  const [subscriptionState, setSubscriptionState] = useState(effectiveSubscription);
  const [billingForm, setBillingForm] = useState(effectiveBilling);
  const [paymentState, setPaymentState] = useState(effectivePaymentMethod);
  const [invoicesState, setInvoicesState] = useState(effectiveInvoices);

  const [newCardForm, setNewCardForm] = useState({
    number: "",
    holderName: "",
    expiry: "",
    cvv: "",
  });
  const [showAddCard, setShowAddCard] = useState(false);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  // Sincroniza quando o usuário muda
  useEffect(() => {
    setProfileForm({
      name: effectiveName,
      lastName: effectiveLastName,
      avatarUrl: effectiveAvatar,
      email: effectiveEmail,
      phone: effectivePhone,
    });
    setSubscriptionState(effectiveSubscription);
    setBillingForm(effectiveBilling);
    setPaymentState(effectivePaymentMethod);
    setInvoicesState(effectiveInvoices);
  }, [
    effectiveName,
    effectiveLastName,
    effectiveAvatar,
    effectiveEmail,
    effectivePhone,
  ]);

  // Permite abrir uma aba externamente (ex: botões rápidos no painel da conta)
  useEffect(() => {
    if (externalOpenSection) {
      setActiveModalTab(externalOpenSection);
      setFeedback({ type: "", text: "" });
      if (onExternalSectionHandled) onExternalSectionHandled();
    }
  }, [externalOpenSection, onExternalSectionHandled]);

  useEffect(() => {
    if (inline && controlledActiveTab) {
      setFeedback({ type: "", text: "" });
      setSelectedInvoice(null);
    }
  }, [inline, controlledActiveTab]);

  // Fecha a caixa de opções ao clicar fora ou apertar Escape
  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  // Fecha o modal com Escape
  useEffect(() => {
    if (!activeModalTab) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (selectedInvoice) {
          setSelectedInvoice(null);
        } else {
          setActiveModalTab(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModalTab, selectedInvoice]);

  if (!user) return null;

  const fullName = [profileForm.name || user.name, profileForm.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const initials = [profileForm.name || user.name, profileForm.lastName]
    .filter(Boolean)
    .map((part) => part.trim().slice(0, 1).toUpperCase())
    .join("")
    .slice(0, 2) || "U";

  const openSectionFromMenu = (sectionId) => {
    setMenuOpen(false);
    setFeedback({ type: "", text: "" });
    setSelectedInvoice(null);
    setActiveModalTab(sectionId);
  };

  const persistUpdates = async (payload, successMessage) => {
    setSaving(true);
    setFeedback({ type: "", text: "" });
    const nextCache = {
      ...readLocalAccountCache(user.id),
      ...payload,
    };
    writeLocalAccountCache(user.id, nextCache);

    try {
      await updateAccount(payload);
      setFeedback({ type: "success", text: successMessage });
    } catch (error) {
      if (error?.message === "email_em_uso") {
        setFeedback({ type: "error", text: "Este endereço de e-mail já está em uso por outra conta." });
      } else if (error?.message === "email_invalido") {
        setFeedback({ type: "error", text: "Informe um endereço de e-mail válido." });
      } else if (error?.message === "nome_invalido") {
        setFeedback({ type: "error", text: "Informe um nome válido (até 80 caracteres)." });
      } else {
        setFeedback({ type: "success", text: `${successMessage} (salvo neste dispositivo)` });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", text: "Selecione um arquivo de imagem válido (PNG, JPG ou WebP)." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 256;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.86);
          setProfileForm((curr) => ({ ...curr, avatarUrl: compressed }));
          setFeedback({ type: "info", text: "Foto carregada. Clique em 'Salvar dados do perfil' para confirmar." });
        }
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!profileForm.name.trim()) {
      setFeedback({ type: "error", text: "O campo Nome é obrigatório." });
      return;
    }
    await persistUpdates(
      {
        name: profileForm.name.trim(),
        lastName: profileForm.lastName.trim(),
        avatarUrl: profileForm.avatarUrl,
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
      },
      "Dados do perfil atualizados com sucesso!",
    );
  };

  const handleSelectPlan = async (plan, cycle = subscriptionState.billingCycle) => {
    const nextPrice = plan.oneTime
      ? plan.monthlyPrice
      : cycle === "annual"
        ? plan.annualMonthlyPrice
        : plan.monthlyPrice;

    const updatedSub = {
      planId: plan.id,
      planName: plan.name,
      billingCycle: plan.oneTime ? "one-time" : cycle,
      price: nextPrice,
      status: "Ativo",
      nextBillingDate: plan.oneTime ? "Licença vitalícia" : "15/12/2026",
      startedAt: subscriptionState.startedAt || "15/01/2026",
    };

    const newInvoice = {
      id: `FAT-2026-${String(invoicesState.length + 12).padStart(3, "0")}`,
      competence: "Novembro / 2026 (Alteração de Plano)",
      dueDate: "25/11/2026",
      paidAt: "17/11/2026",
      planName: `${plan.name} (${plan.oneTime ? "Licença Única" : cycle === "annual" ? "Anual" : "Mensal"})`,
      method:
        paymentState.preferredType === "pix"
          ? "PIX"
          : paymentState.preferredType === "boleto"
            ? "Boleto Bancário"
            : `Cartão •••• ${paymentState.cards?.[0]?.last4 || "4829"}`,
      amount: nextPrice,
      status: "paid",
    };

    const updatedInvoices = [newInvoice, ...invoicesState];
    setSubscriptionState(updatedSub);
    setInvoicesState(updatedInvoices);

    await persistUpdates(
      {
        subscription: updatedSub,
        invoices: updatedInvoices,
      },
      `Plano atualizado para ${plan.name}!`,
    );
  };

  const handleSaveBillingDetails = async (event) => {
    event.preventDefault();
    await persistUpdates(
      {
        billingDetails: billingForm,
      },
      "Cadastro de dados de pagamento salvo com sucesso!",
    );
  };

  const handleSavePaymentMethod = async (nextPaymentState, message = "Forma de pagamento atualizada com sucesso!") => {
    setPaymentState(nextPaymentState);
    await persistUpdates(
      {
        paymentMethod: nextPaymentState,
      },
      message,
    );
  };

  const handleAddCard = async (event) => {
    event.preventDefault();
    const digits = newCardForm.number.replace(/\D/g, "");
    if (digits.length < 12) {
      setFeedback({ type: "error", text: "Informe um número de cartão válido." });
      return;
    }
    if (!newCardForm.holderName.trim()) {
      setFeedback({ type: "error", text: "Informe o nome impresso no cartão." });
      return;
    }
    const last4 = digits.slice(-4);
    const brand = digits.startsWith("4")
      ? "Visa"
      : digits.startsWith("5")
        ? "Mastercard"
        : digits.startsWith("6")
          ? "Elo"
          : "Cartão";

    const newCard = {
      id: `card-${Date.now()}`,
      brand,
      last4,
      holderName: newCardForm.holderName.trim().toUpperCase(),
      expiry: newCardForm.expiry.trim() || "12/30",
      isDefault: (paymentState.cards || []).length === 0,
    };

    const nextCards = [...(paymentState.cards || []), newCard];
    const nextState = {
      ...paymentState,
      preferredType: "credit_card",
      cards: nextCards,
    };

    setNewCardForm({ number: "", holderName: "", expiry: "", cvv: "" });
    setShowAddCard(false);
    await handleSavePaymentMethod(nextState, `Cartão ${brand} final ${last4} cadastrado com sucesso!`);
  };

  const handleSetDefaultCard = async (cardId) => {
    const nextCards = (paymentState.cards || []).map((card) => ({
      ...card,
      isDefault: card.id === cardId,
    }));
    await handleSavePaymentMethod(
      { ...paymentState, preferredType: "credit_card", cards: nextCards },
      "Cartão principal atualizado!",
    );
  };

  const handleRemoveCard = async (cardId) => {
    const remaining = (paymentState.cards || []).filter((card) => card.id !== cardId);
    if (remaining.length > 0 && !remaining.some((c) => c.isDefault)) {
      remaining[0].isDefault = true;
    }
    await handleSavePaymentMethod(
      { ...paymentState, cards: remaining },
      "Cartão removido da sua conta.",
    );
  };

  const handlePayPendingInvoice = async (invoiceId) => {
    const updatedInvoices = invoicesState.map((inv) =>
      inv.id === invoiceId
        ? { ...inv, status: "paid", paidAt: new Date().toLocaleDateString("pt-BR") }
        : inv,
    );
    setInvoicesState(updatedInvoices);
    await persistUpdates({ invoices: updatedInvoices }, `Fatura ${invoiceId} quitada com sucesso!`);
  };

  const handleGenerateSampleInvoice = async () => {
    const nextNumber = invoicesState.length + 12;
    const newInvoice = {
      id: `FAT-2026-${String(nextNumber).padStart(3, "0")}`,
      competence: "Dezembro / 2026 (Próxima renovação)",
      dueDate: "15/12/2026",
      paidAt: "—",
      planName: subscriptionState.planName,
      method:
        paymentState.preferredType === "pix"
          ? "PIX"
          : paymentState.preferredType === "boleto"
            ? "Boleto Bancário"
            : `Cartão •••• ${paymentState.cards?.find((c) => c.isDefault)?.last4 || "4829"}`,
      amount: subscriptionState.price || 55,
      status: "pending",
    };
    const updatedInvoices = [newInvoice, ...invoicesState];
    setInvoicesState(updatedInvoices);
    await persistUpdates({ invoices: updatedInvoices }, "Nova fatura gerada na lista.");
  };

  const currentTab = inline ? controlledActiveTab || activeModalTab || "perfil" : activeModalTab;
  const selectTab = (tabId) => {
    setActiveModalTab(tabId);
    setFeedback({ type: "", text: "" });
    setSelectedInvoice(null);
    if (onTabChange) onTabChange(tabId);
  };

  const tabContent = (
    <>
                {feedback.text ? (
                  <div
                    role="status"
                    className={`mb-5 rounded-[3px] border px-3.5 py-2.5 text-[12px] font-medium ${
                      feedback.type === "error"
                        ? "border-danger/30 bg-danger-soft text-danger"
                        : "border-pine/25 bg-pine/10 text-pine"
                    }`}
                  >
                    {feedback.text}
                  </div>
                ) : null}

                {/* 1. ABA MEU PERFIL E CONTATO */}
                {currentTab === "perfil" ? (
                  <form onSubmit={handleSaveProfile} className="divide-y divide-line/80">
                    <div className="pb-5">
                      <h3 className="text-[15px] font-semibold text-ink">
                        Dados do Meu Usuário
                      </h3>
                      <p className="mt-1 text-[12px] text-ink-soft">
                        Configure seu nome, sobrenome, foto de perfil, e-mail de acesso e telefone de contato.
                      </p>
                    </div>

                    {/* Foto de Perfil */}
                    <div className="flex flex-wrap items-center gap-5 py-6">
                      {profileForm.avatarUrl ? (
                        <img
                          src={profileForm.avatarUrl}
                          alt={fullName}
                          className="h-16 w-16 shrink-0 rounded-full border border-line object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-pine text-xl font-bold text-white">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-[13px] font-semibold text-ink">Foto de perfil</p>
                        <p className="text-[12px] text-ink-soft">
                          Envie uma imagem do seu computador ou celular (JPG, PNG ou WebP).
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <label className={`inline-flex cursor-pointer items-center rounded-[3px] bg-pine text-[12px] font-semibold text-white hover:bg-pine-dark ${inline ? "h-10 px-4" : "h-8 px-3"}`}>
                            <span>Alterar foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarUpload}
                              className="sr-only"
                            />
                          </label>
                          {profileForm.avatarUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setProfileForm((curr) => ({ ...curr, avatarUrl: "" }))
                              }
                              className={`inline-flex items-center rounded-[3px] border border-line bg-card text-[12px] font-medium text-ink hover:bg-paper ${inline ? "h-10 px-4" : "h-8 px-3"}`}
                            >
                              Remover foto
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Campos Nome, Sobrenome, Email, Contato */}
                    <div className="grid gap-x-5 gap-y-4 py-6 sm:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-[12px] font-semibold text-ink">Nome *</span>
                        <input
                          type="text"
                          required
                          maxLength={80}
                          value={profileForm.name}
                          onChange={(e) =>
                            setProfileForm((curr) => ({ ...curr, name: e.target.value }))
                          }
                          placeholder="Seu primeiro nome"
                          className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-[12px] font-semibold text-ink">Sobrenome</span>
                        <input
                          type="text"
                          maxLength={80}
                          value={profileForm.lastName}
                          onChange={(e) =>
                            setProfileForm((curr) => ({ ...curr, lastName: e.target.value }))
                          }
                          placeholder="Seu sobrenome"
                          className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-[12px] font-semibold text-ink">E-mail *</span>
                        <input
                          type="email"
                          required
                          maxLength={254}
                          value={profileForm.email}
                          onChange={(e) =>
                            setProfileForm((curr) => ({ ...curr, email: e.target.value }))
                          }
                          placeholder="seuemail@exemplo.com"
                          className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-[12px] font-semibold text-ink">
                          Contato (Telefone / WhatsApp)
                        </span>
                        <input
                          type="tel"
                          maxLength={40}
                          value={profileForm.phone}
                          onChange={(e) =>
                            setProfileForm((curr) => ({ ...curr, phone: e.target.value }))
                          }
                          placeholder="(11) 99999-9999"
                          className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-5">
                      <button
                        type="submit"
                        disabled={saving}
                        className={`inline-flex items-center rounded-[3px] bg-pine text-[12px] font-semibold text-white hover:bg-pine-dark disabled:opacity-60 ${inline ? "h-10 px-6" : "h-9 px-5"}`}
                      >
                        {saving ? "Salvando…" : "Salvar dados do perfil"}
                      </button>
                    </div>
                  </form>
                ) : null}

                {/* 2. ABA PLANO PAGO ATUAL */}
                {currentTab === "plano" ? (
                  <div className="divide-y divide-line/80">
                    <div className="pb-5">
                      <h3 className="text-[15px] font-semibold text-ink">Plano Pago Atual</h3>
                      <p className="mt-1 text-[12px] text-ink-soft">
                        Consulte os detalhes da sua assinatura ativa, ciclo de cobrança e altere de plano quando desejar.
                      </p>
                    </div>

                    {/* Resumo do Plano Atual */}
                    <div className="py-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-[2px] bg-pine px-2 py-0.5 text-[11px] font-semibold text-white">
                              {subscriptionState.status || "Ativo"}
                            </span>
                            <span className="text-[12px] font-medium text-ink-soft">
                              Desde {subscriptionState.startedAt || "15/01/2026"}
                            </span>
                          </div>
                          <h4 className="mt-1.5 text-lg font-bold text-ink">
                            {subscriptionState.planName}
                          </h4>
                          <p className="mt-1 text-[12px] text-ink-soft">
                            Próxima renovação / status:{" "}
                            <strong className="font-semibold text-ink">
                              {subscriptionState.nextBillingDate}
                            </strong>
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-bold text-pine">
                            R$ {Number(subscriptionState.price || 55).toFixed(2).replace(".", ",")}
                            {subscriptionState.billingCycle === "one-time" ? "" : "/mês"}
                          </p>
                          <p className="text-[12px] text-ink-soft">
                            {subscriptionState.billingCycle === "annual"
                              ? "Ciclo Anual (com desconto)"
                              : subscriptionState.billingCycle === "one-time"
                                ? "Licença de pagamento único"
                                : "Ciclo Mensal"}
                          </p>
                        </div>
                      </div>

                      {/* Seletor de Ciclo Mensal / Anual */}
                      {subscriptionState.billingCycle !== "one-time" ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
                          <span className="text-[12px] font-medium text-ink">
                            Ciclo de faturamento da assinatura:
                          </span>
                          <div className="inline-flex rounded-[3px] border border-line bg-card p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                const currentPlan =
                                  AVAILABLE_PLANS.find((p) => p.id === subscriptionState.planId) ||
                                  AVAILABLE_PLANS[1];
                                handleSelectPlan(currentPlan, "monthly");
                              }}
                              className={`rounded-[2px] px-3 py-1 text-[12px] font-semibold ${
                                subscriptionState.billingCycle === "monthly"
                                  ? "bg-pine text-white"
                                  : "text-ink-soft hover:text-ink"
                              }`}
                            >
                              Mensal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const currentPlan =
                                  AVAILABLE_PLANS.find((p) => p.id === subscriptionState.planId) ||
                                  AVAILABLE_PLANS[1];
                                handleSelectPlan(currentPlan, "annual");
                              }}
                              className={`rounded-[2px] px-3 py-1 text-[12px] font-semibold ${
                                subscriptionState.billingCycle === "annual"
                                  ? "bg-pine text-white"
                                  : "text-ink-soft hover:text-ink"
                              }`}
                            >
                              Anual (-20%)
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Opções de Planos para Troca */}
                    <div className="space-y-4 pt-6">
                      <h4 className="text-[12px] font-semibold text-ink">
                        Planos disponíveis para sua conta
                      </h4>
                      <div className="divide-y divide-line/80 border-t border-line/80">
                        {AVAILABLE_PLANS.map((plan) => {
                          const isCurrent = subscriptionState.planId === plan.id;
                          const displayPrice = plan.oneTime
                            ? plan.monthlyPrice
                            : subscriptionState.billingCycle === "annual"
                              ? plan.annualMonthlyPrice
                              : plan.monthlyPrice;
                          return (
                            <div
                              key={plan.id}
                              className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[14px] font-bold text-ink">{plan.name}</span>
                                  <span className="rounded-[2px] border border-pine/30 bg-pine/5 px-2 py-0.5 text-[10px] font-semibold text-pine">
                                    {plan.badge}
                                  </span>
                                  <span className="text-[13px] font-bold text-pine">
                                    R$ {displayPrice},00
                                    <span className="text-[11px] font-normal text-ink-soft">
                                      {plan.oneTime ? " (único)" : "/mês"}
                                    </span>
                                  </span>
                                </div>
                                <p className="mt-1 text-[12px] font-medium text-ink-soft">
                                  {plan.songsLimit} · {plan.membersLimit}
                                </p>
                                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-soft">
                                  {plan.features.map((feat) => (
                                    <li key={feat} className="flex items-center gap-1.5">
                                      <span className="text-pine">✓</span>
                                      <span>{feat}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <button
                                type="button"
                                disabled={isCurrent || saving}
                                onClick={() => handleSelectPlan(plan)}
                                className={`h-8 shrink-0 rounded-[3px] px-3.5 text-[12px] font-semibold transition-colors ${
                                  isCurrent
                                    ? "cursor-default border border-pine/30 bg-pine/10 text-pine"
                                    : "bg-pine text-white hover:bg-pine-dark"
                                }`}
                              >
                                {isCurrent ? "Plano atual" : "Selecionar plano"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* 3. ABA FATURAS E RECIBOS */}
                {currentTab === "faturas" ? (
                  <div className="divide-y divide-line/80">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
                      <div>
                        <h3 className="text-[15px] font-semibold text-ink">
                          Histórico de Faturas e Recibos
                        </h3>
                        <p className="mt-1 text-[12px] text-ink-soft">
                          Consulte faturas pagas, recibos fiscais e eventuais cobranças em aberto.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateSampleInvoice}
                        className="inline-flex h-8 items-center rounded-[3px] border border-line bg-card px-3 text-[12px] font-semibold text-ink hover:bg-paper"
                      >
                        + Adiantar próxima fatura
                      </button>
                    </div>

                    {/* Visualizador de Recibo Selecionado */}
                    {selectedInvoice ? (
                      <div className="space-y-4 py-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-semibold text-pine">
                              Demonstrativo de Fatura / Recibo
                            </p>
                            <h4 className="text-[15px] font-bold text-ink">
                              Fatura #{selectedInvoice.id} — {selectedInvoice.competence}
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(null)}
                            className="h-8 rounded-[3px] border border-line bg-card px-2.5 text-[12px] font-medium text-ink hover:bg-paper"
                          >
                            Fechar demonstrativo
                          </button>
                        </div>

                        <div className="grid gap-3 text-[12px] sm:grid-cols-2">
                          <div>
                            <p className="text-ink-soft">Titular / Pagador:</p>
                            <p className="font-semibold text-ink">
                              {billingForm.holderName || fullName}
                            </p>
                            <p className="text-ink-soft">
                              {billingForm.documentType}: {billingForm.documentNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-ink-soft">Serviço contratado:</p>
                            <p className="font-semibold text-ink">{selectedInvoice.planName}</p>
                            <p className="text-ink-soft">
                              Forma de pagamento: {selectedInvoice.method}
                            </p>
                          </div>
                          <div>
                            <p className="text-ink-soft">Data de vencimento:</p>
                            <p className="font-semibold text-ink">{selectedInvoice.dueDate}</p>
                          </div>
                          <div>
                            <p className="text-ink-soft">Status / Data de quitação:</p>
                            <p className="font-semibold text-pine">
                              {selectedInvoice.status === "paid"
                                ? `Paga em ${selectedInvoice.paidAt}`
                                : "Aguardando pagamento"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <span className="text-[13px] font-bold text-ink">
                            Valor Total: R${" "}
                            {Number(selectedInvoice.amount).toFixed(2).replace(".", ",")}
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedInvoice.status !== "paid" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  handlePayPendingInvoice(selectedInvoice.id);
                                  setSelectedInvoice((curr) =>
                                    curr ? { ...curr, status: "paid", paidAt: "Hoje" } : null,
                                  );
                                }}
                                className="inline-flex h-8 items-center rounded-[3px] bg-pine px-3.5 text-[12px] font-semibold text-white hover:bg-pine-dark"
                              >
                                Confirmar pagamento agora
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="inline-flex h-8 items-center rounded-[3px] border border-line bg-card px-3 text-[12px] font-semibold text-ink hover:bg-paper"
                            >
                              Imprimir / Salvar PDF
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Tabela/Lista de Faturas */}
                    <div>
                      <ul className="divide-y divide-line/80">
                        {invoicesState.map((invoice) => {
                          const isPaid = invoice.status === "paid";
                          return (
                            <li
                              key={invoice.id}
                              className="flex flex-wrap items-center justify-between gap-4 py-3.5 transition-colors hover:bg-card/40"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[12px] font-bold text-ink">
                                    {invoice.id}
                                  </span>
                                  <span
                                    className={`rounded-[2px] px-2 py-0.5 text-[10px] font-semibold ${
                                      isPaid
                                        ? "bg-pine/10 text-pine"
                                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                    }`}
                                  >
                                    {isPaid ? "Paga" : "Em aberto"}
                                  </span>
                                  <span className="text-[12px] font-semibold text-ink">
                                    {invoice.competence}
                                  </span>
                                </div>
                                <p className="mt-1 text-[12px] text-ink-soft">
                                  {invoice.planName} · Vencimento: {invoice.dueDate} ·{" "}
                                  {invoice.method}
                                </p>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <span className="text-[13px] font-bold text-ink">
                                  R$ {Number(invoice.amount).toFixed(2).replace(".", ",")}
                                </span>
                                {!isPaid ? (
                                  <button
                                    type="button"
                                    onClick={() => handlePayPendingInvoice(invoice.id)}
                                    className="h-8 rounded-[3px] bg-pine px-3 text-[12px] font-semibold text-white hover:bg-pine-dark"
                                  >
                                    Pagar
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoice(invoice)}
                                  className="h-8 rounded-[3px] border border-line bg-card px-3 text-[12px] font-medium text-ink hover:bg-paper"
                                >
                                  Ver fatura
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ) : null}

                {/* 4. ABA CADASTRO DE DADOS DE PAGAMENTO (FATURAMENTO) */}
                {currentTab === "dados-pagamento" ? (
                  <form onSubmit={handleSaveBillingDetails} className="divide-y divide-line/80">
                    <div className="pb-5">
                      <h3 className="text-[15px] font-semibold text-ink">
                        Cadastro de Dados de Pagamento e Faturamento
                      </h3>
                      <p className="mt-1 text-[12px] text-ink-soft">
                        Estes dados constarão nas suas faturas, recibos e notas de assinatura.
                      </p>
                    </div>

                    <div className="space-y-4 py-6">
                      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-3">
                        <label className="block space-y-1.5">
                          <span className="text-[12px] font-semibold text-ink">Tipo de Documento</span>
                          <select
                            value={billingForm.documentType}
                            onChange={(e) =>
                              setBillingForm((curr) => ({ ...curr, documentType: e.target.value }))
                            }
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          >
                            <option value="CPF">Pessoa Física (CPF)</option>
                            <option value="CNPJ">Empresa / Banda / PJ (CNPJ)</option>
                          </select>
                        </label>

                        <label className="block space-y-1.5 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-ink">
                            Número do {billingForm.documentType} *
                          </span>
                          <input
                            type="text"
                            required
                            value={billingForm.documentNumber}
                            onChange={(e) =>
                              setBillingForm((curr) => ({
                                ...curr,
                                documentNumber: e.target.value,
                              }))
                            }
                            placeholder={
                              billingForm.documentType === "CNPJ"
                                ? "00.000.000/0001-00"
                                : "000.000.000-00"
                            }
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </label>
                      </div>

                      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                        <label className="block space-y-1.5 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-ink">
                            Nome Completo do Titular ou Razão Social *
                          </span>
                          <input
                            type="text"
                            required
                            value={billingForm.holderName}
                            onChange={(e) =>
                              setBillingForm((curr) => ({ ...curr, holderName: e.target.value }))
                            }
                            placeholder="Nome do responsável ou razão social da instituição"
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </label>

                        <label className="block space-y-1.5">
                          <span className="text-[12px] font-semibold text-ink">
                            E-mail para Faturas *
                          </span>
                          <input
                            type="email"
                            required
                            value={billingForm.billingEmail}
                            onChange={(e) =>
                              setBillingForm((curr) => ({ ...curr, billingEmail: e.target.value }))
                            }
                            placeholder="financeiro@empresa.com.br"
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </label>

                        <label className="block space-y-1.5">
                          <span className="text-[12px] font-semibold text-ink">
                            Telefone Financeiro
                          </span>
                          <input
                            type="tel"
                            value={billingForm.billingPhone}
                            onChange={(e) =>
                              setBillingForm((curr) => ({ ...curr, billingPhone: e.target.value }))
                            }
                            placeholder="(11) 99999-9999"
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="py-6">
                      <h4 className="mb-3 text-[12px] font-semibold text-ink">
                        Endereço de Cobrança
                      </h4>
                      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-6">
                        <label className="block space-y-1.5 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-ink">CEP</span>
                          <input
                            type="text"
                            value={billingForm.zipCode}
                            onChange={(e) =>
                              setBillingForm((curr) => ({ ...curr, zipCode: e.target.value }))
                            }
                            placeholder="00000-000"
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </label>

                        <label className="block space-y-1.5 sm:col-span-4">
                          <span className="text-[12px] font-semibold text-ink">Logradouro / Rua</span>
                          <input
                            type="text"
                            value={billingForm.street}
                            onChange={(e) =>
                              setBillingForm((curr) => ({ ...curr, street: e.target.value }))
                            }
                            placeholder="Rua, Avenida, Alameda..."
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </label>

                        <label className="block space-y-1.5 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-ink">Número</span>
                          <input
                            type="text"
                            value={billingForm.number}
                            onChange={(e) =>
                              setBillingForm((curr) => ({ ...curr, number: e.target.value }))
                            }
                            placeholder="123"
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </label>

                        <label className="block space-y-1.5 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-ink">Complemento</span>
                          <input
                            type="text"
                            value={billingForm.complement}
                            onChange={(e) =>
                              setBillingForm((curr) => ({ ...curr, complement: e.target.value }))
                            }
                            placeholder="Bloco, Sala..."
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </label>

                        <label className="block space-y-1.5 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-ink">Bairro</span>
                          <input
                            type="text"
                            value={billingForm.neighborhood}
                            onChange={(e) =>
                              setBillingForm((curr) => ({
                                ...curr,
                                neighborhood: e.target.value,
                              }))
                            }
                            placeholder="Centro"
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </label>

                        <label className="block space-y-1.5 sm:col-span-4">
                          <span className="text-[12px] font-semibold text-ink">Cidade</span>
                          <input
                            type="text"
                            value={billingForm.city}
                            onChange={(e) =>
                              setBillingForm((curr) => ({ ...curr, city: e.target.value }))
                            }
                            placeholder="São Paulo"
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </label>

                        <label className="block space-y-1.5 sm:col-span-2">
                          <span className="text-[12px] font-semibold text-ink">Estado (UF)</span>
                          <input
                            type="text"
                            maxLength={2}
                            value={billingForm.state}
                            onChange={(e) =>
                              setBillingForm((curr) => ({
                                ...curr,
                                state: e.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="SP"
                            className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-5">
                      <button
                        type="submit"
                        disabled={saving}
                        className={`inline-flex items-center rounded-[3px] bg-pine text-[12px] font-semibold text-white hover:bg-pine-dark disabled:opacity-60 ${inline ? "h-10 px-6" : "h-9 px-5"}`}
                      >
                        {saving ? "Salvando…" : "Salvar dados de pagamento"}
                      </button>
                    </div>
                  </form>
                ) : null}

                {/* 5. ABA FORMA DE PAGAMENTO */}
                {currentTab === "forma-pagamento" ? (
                  <div className="divide-y divide-line/80">
                    <div className="pb-5">
                      <h3 className="text-[15px] font-semibold text-ink">Forma de Pagamento</h3>
                      <p className="mt-1 text-[12px] text-ink-soft">
                        Escolha como prefere pagar sua assinatura e gerencie seus cartões de crédito salvos.
                      </p>
                    </div>

                    {/* Escolha da Modalidade Principal */}
                    <div
                      role="radiogroup"
                      aria-label="Modalidade de pagamento"
                      className="grid gap-3 py-6 sm:grid-cols-3"
                    >
                      {[
                        {
                          id: "credit_card",
                          title: "Cartão de Crédito",
                          subtitle: "Renovação automática sem interrupções",
                        },
                        {
                          id: "pix",
                          title: "PIX",
                          subtitle: "QR Code e Copia e Cola instantâneo",
                        },
                        {
                          id: "boleto",
                          title: "Boleto Bancário",
                          subtitle: "Enviado por e-mail antes do vencimento",
                        },
                      ].map((method) => {
                        const selected = paymentState.preferredType === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() =>
                              handleSavePaymentMethod(
                                { ...paymentState, preferredType: method.id },
                                `Forma de pagamento alterada para ${method.title}!`,
                              )
                            }
                            className={`flex flex-col items-start rounded-[3px] border px-3.5 py-3 text-left transition-colors ${
                              selected
                                ? "border-pine bg-pine/5"
                                : "border-line bg-card hover:bg-paper"
                            }`}
                          >
                            <div className="flex w-full items-center justify-between">
                              <span className="text-[13px] font-bold text-ink">{method.title}</span>
                              {selected ? (
                                <span className="h-2 w-2 rounded-full bg-pine" />
                              ) : null}
                            </div>
                            <p className="mt-1 text-[11px] text-ink-soft">{method.subtitle}</p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Seção de Cartões de Crédito */}
                    <div className="space-y-4 py-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-[13px] font-semibold text-ink">
                            Cartões de Crédito Cadastrados
                          </h4>
                          <p className="text-[12px] text-ink-soft">
                            Gerencie os cartões vinculados para cobrança recorrente.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddCard((prev) => !prev)}
                          className={`inline-flex items-center rounded-[3px] bg-pine text-[12px] font-semibold text-white hover:bg-pine-dark ${inline ? "h-10 px-4" : "h-8 px-3"}`}
                        >
                          {showAddCard ? "Cancelar novo cartão" : "+ Adicionar cartão"}
                        </button>
                      </div>

                      {showAddCard ? (
                        <form
                          onSubmit={handleAddCard}
                          className="space-y-4 border-t border-line/80 pt-4"
                        >
                          <p className="text-[12px] font-semibold text-pine">
                            Novo Cartão de Crédito
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block space-y-1 sm:col-span-2">
                              <span className="text-[12px] font-medium text-ink">
                                Número do Cartão *
                              </span>
                              <input
                                type="text"
                                required
                                maxLength={19}
                                value={newCardForm.number}
                                onChange={(e) =>
                                  setNewCardForm((curr) => ({ ...curr, number: e.target.value }))
                                }
                                placeholder="0000 0000 0000 0000"
                                className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                              />
                            </label>

                            <label className="block space-y-1 sm:col-span-2">
                              <span className="text-[12px] font-medium text-ink">
                                Nome Impresso no Cartão *
                              </span>
                              <input
                                type="text"
                                required
                                value={newCardForm.holderName}
                                onChange={(e) =>
                                  setNewCardForm((curr) => ({
                                    ...curr,
                                    holderName: e.target.value,
                                  }))
                                }
                                placeholder="NOME COMO ESTÁ NO CARTÃO"
                                className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] uppercase text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                              />
                            </label>

                            <label className="block space-y-1">
                              <span className="text-[12px] font-medium text-ink">Validade (MM/AA) *</span>
                              <input
                                type="text"
                                required
                                maxLength={5}
                                value={newCardForm.expiry}
                                onChange={(e) =>
                                  setNewCardForm((curr) => ({ ...curr, expiry: e.target.value }))
                                }
                                placeholder="08/29"
                                className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                              />
                            </label>

                            <label className="block space-y-1">
                              <span className="text-[12px] font-medium text-ink">CVV *</span>
                              <input
                                type="password"
                                required
                                maxLength={4}
                                value={newCardForm.cvv}
                                onChange={(e) =>
                                  setNewCardForm((curr) => ({ ...curr, cvv: e.target.value }))
                                }
                                placeholder="123"
                                className="h-9 w-full rounded-[3px] border border-line bg-card px-3 text-[13px] text-ink outline-none focus:border-pine focus:ring-1 focus:ring-pine"
                              />
                            </label>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="submit"
                              className={`inline-flex items-center rounded-[3px] bg-pine text-[12px] font-semibold text-white hover:bg-pine-dark ${inline ? "h-10 px-5" : "h-9 px-4"}`}
                            >
                              Salvar cartão
                            </button>
                          </div>
                        </form>
                      ) : null}

                      {(paymentState.cards || []).length > 0 ? (
                        <ul className="divide-y divide-line/80 border-t border-line/80">
                          {paymentState.cards.map((card) => (
                            <li
                              key={card.id}
                              className="flex flex-wrap items-center justify-between gap-3 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex h-8 w-11 items-center justify-center rounded-[3px] border border-line bg-card text-[11px] font-bold text-pine">
                                  {card.brand}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-semibold text-ink">
                                      {card.brand} •••• {card.last4}
                                    </p>
                                    {card.isDefault ? (
                                      <span className="rounded-[2px] bg-pine/10 px-2 py-0.5 text-[10px] font-semibold text-pine">
                                        Principal
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-[11px] text-ink-soft">
                                    {card.holderName} · Validade {card.expiry}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {!card.isDefault ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSetDefaultCard(card.id)}
                                    className="h-8 rounded-[3px] border border-line px-2.5 text-[12px] font-medium text-ink hover:bg-paper"
                                  >
                                    Tornar principal
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCard(card.id)}
                                  className={`rounded-[3px] border border-danger/30 text-[12px] font-medium text-danger hover:bg-danger-soft ${inline ? "h-10 px-4" : "h-8 px-2.5"}`}
                                >
                                  Remover
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[12px] text-ink-soft">
                          Nenhum cartão cadastrado no momento.
                        </p>
                      )}
                    </div>

                    {/* Informações de PIX ou Boleto */}
                    {paymentState.preferredType === "pix" ? (
                      <div className="space-y-1.5 pt-5 text-[12px]">
                        <p className="font-semibold text-pine">
                          Pagamento via PIX habilitado como preferencial
                        </p>
                        <p className="text-ink-soft">
                          A cada ciclo, o código PIX Copia e Cola e o QR Code serão disponibilizados na aba <strong>Faturas</strong> e enviados para{" "}
                          <strong>{billingForm.billingEmail || profileForm.email}</strong>.
                        </p>
                      </div>
                    ) : null}

                    {paymentState.preferredType === "boleto" ? (
                      <div className="space-y-1.5 pt-5 text-[12px]">
                        <p className="font-semibold text-pine">
                          Pagamento via Boleto Bancário habilitado
                        </p>
                        <p className="text-ink-soft">
                          O boleto registrado será emitido automaticamente 7 dias antes do vencimento em nome de{" "}
                          <strong>{billingForm.holderName || fullName}</strong> ({billingForm.documentType}:{" "}
                          {billingForm.documentNumber}).
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
    </>
  );

  if (inline) {
    return (
      <div className="mx-auto w-full max-w-5xl divide-y divide-line/80">
        <section className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex min-w-0 items-center gap-3.5">
            {profileForm.avatarUrl ? (
              <img
                src={profileForm.avatarUrl}
                alt={fullName}
                className="h-11 w-11 shrink-0 rounded-full border border-line object-cover"
              />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine text-sm font-bold text-white">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-[15px] font-semibold text-ink">
                  {fullName || "Minha Conta"}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-[2px] bg-pine/10 px-2 py-0.5 text-[11px] font-semibold text-pine">
                  <span className="h-1.5 w-1.5 rounded-full bg-pine" />
                  {subscriptionState.planName}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[12px] text-ink-soft">
                {profileForm.email}
                {profileForm.phone ? ` · ${profileForm.phone}` : ""}
              </p>
            </div>
          </div>

          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex h-8 shrink-0 items-center gap-2 rounded-[3px] border border-danger/30 bg-card px-3 text-[12px] font-medium text-danger transition-colors hover:bg-danger-soft"
            >
              <span>Encerrar sessão</span>
            </button>
          ) : null}
        </section>

        <section className="pt-6">
          {tabContent}
        </section>
      </div>
    );
  }

  return (
    <div ref={menuContainerRef} className="relative flex shrink-0 items-center gap-2 sm:gap-2.5">
      {/* Botão do Perfil que abre a Caixa de Opções */}
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Abrir menu Minha Conta"
        className={`group inline-flex h-10 items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine sm:px-3 ${
          menuOpen
            ? "border-pine bg-pine/5 ring-2 ring-pine/20"
            : "border-line bg-card hover:bg-paper"
        }`}
      >
        {profileForm.avatarUrl ? (
          <img
            src={profileForm.avatarUrl}
            alt={fullName}
            className="h-7 w-7 shrink-0 rounded-full border border-line object-cover"
          />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine text-xs font-bold text-white">
            {initials}
          </span>
        )}
        <div className="min-w-0 max-w-28 text-left sm:max-w-44">
          <p className="truncate text-xs font-semibold leading-tight text-ink">
            {fullName || "Minha Conta"}
          </p>
          <p className="hidden truncate text-[11px] leading-tight text-ink-soft sm:block">
            Minha Conta · Opções
          </p>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-ink-soft transition-transform duration-150 ${
            menuOpen ? "rotate-180 text-pine" : "group-hover:text-ink"
          }`}
        />
      </button>

      {/* Botão Sair ao lado do menu de perfil */}
      {onLogout ? (
        <button
          type="button"
          onClick={onLogout}
          className="h-10 shrink-0 rounded-xl border border-line bg-card px-3 text-xs font-medium text-ink transition-colors hover:bg-paper sm:px-3.5 sm:text-sm"
        >
          Sair
        </button>
      ) : null}

      {/* Caixa de Opções do Perfil (Dropdown) */}
      {menuOpen ? (
        <div
          role="menu"
          aria-label="Opções da minha conta"
          className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] origin-top-right overflow-hidden rounded-2xl border border-line bg-card shadow-2xl ring-1 ring-black/5"
        >
          {/* Cabeçalho da Caixa de Opções */}
          <div className="border-b border-line bg-paper/60 p-4">
            <div className="flex items-center gap-3">
              {profileForm.avatarUrl ? (
                <img
                  src={profileForm.avatarUrl}
                  alt={fullName}
                  className="h-11 w-11 shrink-0 rounded-full border border-line object-cover"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine text-sm font-bold text-white">
                  {initials}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{fullName}</p>
                <p className="truncate text-xs text-ink-soft">{profileForm.email}</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-pine/10 px-2 py-0.5 text-[10px] font-semibold text-pine">
                  <span className="h-1.5 w-1.5 rounded-full bg-pine" />
                  {subscriptionState.planName}
                </span>
              </div>
            </div>
          </div>

          {/* Lista de Opções de Configuração do Usuário */}
          <div className="p-1.5">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Configurações da Minha Conta
            </p>
            {USER_ACCOUNT_SECTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  onClick={() => openSectionFromMenu(option.id)}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pine/10 text-pine">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-ink">{option.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {onLogout ? (
            <div className="border-t border-line bg-paper/40 p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
              >
                <span>Encerrar sessão ({appName})</span>
                <span aria-hidden>→</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Modal Completo de Configuração da Conta, Plano, Faturas e Pagamento */}
      {activeModalTab ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Configurações da Minha Conta"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModalTab(null);
          }}
        >
          <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-line bg-card text-ink shadow-2xl">
            {/* Topo do Modal */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-paper/60 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3 min-w-0">
                {profileForm.avatarUrl ? (
                  <img
                    src={profileForm.avatarUrl}
                    alt={fullName}
                    className="h-10 w-10 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine text-sm font-bold text-white">
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-pine">
                    Minha Conta · {appName}
                  </p>
                  <h2 className="truncate text-base font-semibold text-ink sm:text-lg">
                    {fullName || "Configurações do Usuário"}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalTab(null)}
                className="inline-flex h-9 items-center rounded-xl border border-line bg-card px-3.5 text-xs font-semibold text-ink hover:bg-paper"
              >
                Fechar ✕
              </button>
            </div>

            {/* Corpo do Modal com Navegação Lateral / Abas */}
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[230px_minmax(0,1fr)]">
              {/* Menu de Abas */}
              <nav
                aria-label="Seções da conta"
                className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-line bg-paper/40 p-3 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r"
              >
                {USER_ACCOUNT_SECTIONS.map((item) => {
                  const Icon = item.icon;
                  const active = activeModalTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectTab(item.id)}
                      className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                        active
                          ? "bg-pine text-white shadow-xs"
                          : "text-ink-soft hover:bg-paper hover:text-ink"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Área de Conteúdo da Aba Selecionada */}
              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
                {tabContent}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChevronDownIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function UserIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

function PlanCrownIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z" />
    </svg>
  );
}

function InvoiceIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function BillingDocIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M15 9h3M15 13h3M6 16c1-1.5 2.5-2 3-2s2 .5 3 2" />
    </svg>
  );
}

function CreditCardIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6.5 15h4" />
    </svg>
  );
}
