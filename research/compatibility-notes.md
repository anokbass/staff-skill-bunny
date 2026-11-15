# Staff Skill — notas de compatibilidade

O padrão Bunny/Vendetta para injetar linha em menu de pressão longa foi visto no plugin público `dislate`: https://github.com/Rico040/bunny-plugins/blob/master/plugins/dislate/src/patches/ActionSheet.tsx. Ele intercepta `openLazy`, filtra `MessageLongPressActionSheet`, espera o componente e injeta um `ActionSheetRow` com `findInReactTree`. Essa API é interna e não é contrato estável.

A versão Bunny do Picture Links mostra que `HeaderAvatar` pode ser empacotado em `Pressable` e o módulo `openMediaModal` abre mídia: https://github.com/Rico040/bunny-plugins/blob/master/plugins/picture-links/src/index.tsx. A versão mais recente inspecionada habilita explicitamente controles nativos de salvar e compartilhar com `shareable: true` e `disableDownload: false`: https://github.com/bleelblep/bleel-bazinga-repo/blob/main/plugins/picture-links/js/lib/media.ts. Essa implementação atual usa APIs novas de outro runtime; ela não prova compatibilidade com Bunny antigo.

Não foi encontrada fonte pública confiável que prove a existência estável de `banUser` ou `deleteMessage` em todos os builds Bunny/Vendetta, nem uma injeção confirmada por toque no nome de usuário. O código do plugin tenta localizar módulos internos `findByProps("banUser", "kickUser")` e `findByProps("deleteMessage", "sendMessage")`; se o fork não expuser esses nomes, as ações retornam erro/toast sem fallback para token ou chamada REST manual.

A documentação oficial determina que banimento exige `BAN_MEMBERS`: https://docs.discord.com/developers/resources/guild. A exclusão de mensagens de terceiros em servidor exige `MANAGE_MESSAGES`: https://docs.discord.com/developers/resources/message. O cliente/servidor continua sendo a autoridade final para validar estas permissões.

O repositório Bunny foi arquivado: https://github.com/bunny-mod/Bunny. Não foi localizada API pública estável para tornar toda a área do cartão de cargo arrastável. Esse recurso foi deixado de fora para evitar uma alteração especulativa da tela de cargos.

A documentação de automação de contas do Discord alerta contra automatizar contas comuns via API fora do fluxo de bot: https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots. Por esse motivo, o Staff Skill não tem time ban, tarefas em segundo plano, automação em massa nem extração manual de token. Cada ação prevista é acionada manualmente pelo moderador e requer confirmação.
