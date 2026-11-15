# Staff Skill

Plugin local de atalhos de moderação para clientes móveis no formato legado Bunny/Vendetta. O escopo inicial é deliberadamente pequeno: ações contextuais em mensagens/perfis e visualização de avatar. **Não inclui time ban**.

## Recursos

Ao pressionar uma mensagem, o Staff Skill tenta acrescentar opções para banir o autor, apagar aquela mensagem e copiar o ID do usuário. O menu de perfil/usuário também recebe ações quando o cliente expõe um *action sheet* compatível. Banir pede o motivo e confirmação; apagar pede confirmação explícita. O servidor ainda valida permissões e hierarquia de cargos.

Ao pressionar a foto no cabeçalho do perfil, o plugin tenta abrir a imagem no visualizador de mídia nativo, com `shareable: true` e `disableDownload: false` para habilitar as opções disponíveis de compartilhar e salvar. Essa opção depende do visualizador incluído na versão do Discord instalada.

## Instalação

Após o workflow do GitHub Actions concluir e o GitHub Pages ficar ativo, adicione este URL em **Configurações → Plugins → +**:

`https://anokbass.github.io/staff-skill-bunny/staff-skill/`

Ative o plugin e abra **Configurações → Plugins → Staff Skill** para escolher quais atalhos ficam visíveis. O bundle compilado é servido no diretório `staff-skill/`.

## Limites e compatibilidade

A injeção de opções nos menus, o método `banUser` e o método `deleteMessage` dependem de módulos internos e nomes privados do cliente. Plugins Bunny/Vendetta existentes demonstram o padrão de injetar linhas em `MessageLongPressActionSheet`, mas não existe contrato estável que garanta banir/apagar em toda versão. O Bunny original está arquivado e forks podem divergir. O plugin ainda precisa ser testado no cliente exato do usuário.

O reordenamento de cargos arrastando qualquer área do cartão não entrou nesta versão: não foi encontrada uma API pública estável para mudar a interação da tela de cargos, e modificar isso pode quebrar a ordem/gestos da tela.

Este plugin só executa ações destrutivas depois de uma interação e confirmação do moderador. Não tem automações em segundo plano, não lê nem salva tokens, não cria chamadas HTTP próprias e não envia dados para fora do aparelho. A solicitação de moderação passa pelo módulo interno do cliente; o backend do Discord decide se a conta tem permissão.

Clientes modificados e plugins usam interfaces não oficiais. A compatibilidade e o risco de uso devem ser avaliados pelo usuário; consulte os [Termos do Discord](https://discord.com/terms) e a orientação sobre [contas de usuário automatizadas](https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots).

## Referências de implementação

- [Exemplo Bunny de injeção de uma ação em `MessageLongPressActionSheet`](https://github.com/Rico040/bunny-plugins/blob/master/plugins/dislate/src/patches/ActionSheet.tsx).
- [Plugin Bunny Picture Links](https://github.com/Rico040/bunny-plugins/blob/master/plugins/picture-links/src/index.tsx).
- [Exemplo atualizado de visualizador nativo com compartilhar/baixar habilitados](https://github.com/bleelblep/bleel-bazinga-repo/blob/main/plugins/picture-links/js/lib/media.ts).
- [Documentação de banimento e permissão `BAN_MEMBERS`](https://docs.discord.com/developers/resources/guild).
- [Documentação de exclusão de mensagem e permissão `MANAGE_MESSAGES`](https://docs.discord.com/developers/resources/message).

## Desenvolvimento

```sh
pnpm install
pnpm typecheck
pnpm build
```

O artefato compilado fica em `dist/staff-skill/`.
