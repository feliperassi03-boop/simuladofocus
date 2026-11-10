# Roadmap

- Em andamento: adicionar questões em lote a provas existentes, com busca, seleção de resultados e preservação do conteúdo atual em todas as modalidades.

- Concluído: processadores normalizam quebras Unicode; importação de múltipla escolha separa alternativas, gabarito e comentário sem assumir resposta A. Texto enviado validado com gabarito C, 10 testes passaram, build OK; nenhuma questão salva alterada. Conferência no painel bloqueada pela sessão presa em “Carregando”; falta publicar.

- Concluído: configuração PWA de tela inicial com nome AUMAKUA, ícones da logo em 192/512px, apple-touch-icon e abertura standalone; manifest e arquivos conferidos no navegador, build OK. Sem modo offline; falta publicar e conferir a instalação física no celular.

- Concluído: escolha de mentoria e pagamento removida do formulário público; dados e aceites são registrados sem presumir plano/preço, e seleção acontece só na InfinitePay. Fluxo real e registros conferidos, 8 testes passaram; publicar a página.

- Concluído: três documentos novos disponíveis para leitura com links aos PDFs originais, versões dos aceites atualizadas para 2026-11-02-v3; funções implantadas, aceite antigo rejeitado (HTTP 400), 10 testes passaram e páginas/PDFs verificados. Registros antigos e regras de compra preservados; publicar a página para visitantes. Os arquivos fornecidos ainda contêm campos de privacidade não preenchidos e divergências de prazo/cancelamento, preservados sem revisão jurídica.

- Concluído: formulário público e aceites restaurados, registros de pedido pendente e documentos conferidos no banco, redirecionamento real à loja InfinitePay verificado sem pagamento; 16 testes passaram e build OK. Publicação da página pelo responsável ainda necessária; Asaas continua bloqueado.
- Pendente: definir confirmação dos pagamentos InfinitePay para liberação do acesso; depende da orientação do responsável ou integração verificada do provedor.

- Concluído: novas compras por Pix e cartão bloqueadas nos dois checkouts publicados (HTTP 403 SALES_DISABLED); páginas sem botões de compra no preview; 13 testes passaram. Acessos e webhooks preservados; sessões de pagamento previamente emitidas pelo Asaas não foram canceladas.

- Concluído: teste de R$ 10,00 retirado da página e bloqueado no checkout publicado (HTTP 400); proteção dos pagamentos antigos preservada. Onze testes passaram e revisão dos planos oficiais verificada sem cobrança real.

- Concluído: revisão do pedido e dois aceites obrigatórios nas páginas de compra; páginas legais provisórias; registro servidor de identidade/data/versões/IP antes do Asaas. Nove testes passaram; revisão/edição/bloqueio e páginas legais verificados no navegador. Nenhuma cobrança real criada; gravação com IP real do comprador ainda não verificada de ponta a ponta.

- Link de compra da assinatura confirmado no ar: `https://aumakua-app.lovable.app/#/tsa-mentoria` (testado no site público).
- Link direto da área de assinaturas do admin (`/#/assinaturas` e `/#/admin?tab=assinaturas`) — pronto no preview, precisa publicar para funcionar no site público.
- Pendente do lado do Asaas: cadastrar o webhook no painel de produção para liberar os 12 meses automaticamente.
- Migração Asaas para produção concluída: chave atualizada no campo seguro; URLs de API e pagamento atualizadas nas duas funções e implantadas. Nenhuma cobrança real criada no teste.

- Concluído: TSA 2 FASE no painel e na lista de provas, com banco separado e mesmo modelo TEA; 16 testes passaram. Cadastro de questão, criação e abertura de prova conferidos como administrador; registros temporários removidos, conteúdos existentes preservados. Falta publicar.
