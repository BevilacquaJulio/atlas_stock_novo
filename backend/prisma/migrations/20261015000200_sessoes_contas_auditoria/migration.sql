-- DropForeignKey
ALTER TABLE `consumos_projetos` DROP FOREIGN KEY `projeto_consumos_produto_id_fkey`;

-- DropForeignKey
ALTER TABLE `consumos_projetos` DROP FOREIGN KEY `projeto_consumos_projeto_id_fkey`;

-- DropForeignKey
ALTER TABLE `consumos_projetos` DROP FOREIGN KEY `projeto_consumos_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `historicos_projetos` DROP FOREIGN KEY `projeto_historico_projeto_id_fkey`;

-- DropForeignKey
ALTER TABLE `historicos_projetos` DROP FOREIGN KEY `projeto_historico_usuario_id_fkey`;

-- DropForeignKey
ALTER TABLE `itens_compras` DROP FOREIGN KEY `compra_itens_compra_id_fkey`;

-- DropForeignKey
ALTER TABLE `itens_compras` DROP FOREIGN KEY `compra_itens_produto_id_fkey`;

-- DropForeignKey
ALTER TABLE `itens_verificacao_projetos` DROP FOREIGN KEY `projeto_checklist_itens_projeto_id_fkey`;

-- DropForeignKey
ALTER TABLE `tokens_renovacao` DROP FOREIGN KEY `refresh_tokens_usuario_id_fkey`;

-- AlterTable
ALTER TABLE `tokens_renovacao` ADD COLUMN `sessao_id` VARCHAR(36) NULL;

-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `mfa_ativo` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `mfa_recuperacao` JSON NULL,
    ADD COLUMN `mfa_segredo` TEXT NULL,
    ADD COLUMN `mfa_ultimo_passo` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `sessoes` (
    `id` VARCHAR(36) NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expira_em` DATETIME(3) NOT NULL,
    `revogado_em` DATETIME(3) NULL,

    INDEX `sessoes_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recuperacoes_senha` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `resumo_token` VARCHAR(64) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expira_em` DATETIME(3) NOT NULL,
    `usado_em` DATETIME(3) NULL,

    UNIQUE INDEX `recuperacoes_senha_resumo_token_key`(`resumo_token`),
    INDEX `recuperacoes_senha_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `eventos_auditoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NULL,
    `acao` VARCHAR(16) NOT NULL,
    `recurso` VARCHAR(200) NOT NULL,
    `resultado` INTEGER NOT NULL,
    `request_id` VARCHAR(36) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `eventos_auditoria_criado_em_idx`(`criado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requisicoes_idempotentes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `chave` VARCHAR(36) NOT NULL,
    `resumo_entrada` VARCHAR(64) NOT NULL,
    `resposta` JSON NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `requisicoes_idempotentes_usuario_id_chave_key`(`usuario_id`, `chave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `tokens_renovacao_resumo_token_idx` ON `tokens_renovacao`(`resumo_token`);

-- CreateIndex
CREATE INDEX `tokens_renovacao_sessao_id_idx` ON `tokens_renovacao`(`sessao_id`);

-- AddForeignKey
ALTER TABLE `tokens_renovacao` ADD CONSTRAINT `tokens_renovacao_sessao_id_fkey` FOREIGN KEY (`sessao_id`) REFERENCES `sessoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tokens_renovacao` ADD CONSTRAINT `tokens_renovacao_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_compras` ADD CONSTRAINT `itens_compras_compra_id_fkey` FOREIGN KEY (`compra_id`) REFERENCES `compras`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_compras` ADD CONSTRAINT `itens_compras_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_verificacao_projetos` ADD CONSTRAINT `itens_verificacao_projetos_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historicos_projetos` ADD CONSTRAINT `historicos_projetos_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historicos_projetos` ADD CONSTRAINT `historicos_projetos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consumos_projetos` ADD CONSTRAINT `consumos_projetos_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consumos_projetos` ADD CONSTRAINT `consumos_projetos_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consumos_projetos` ADD CONSTRAINT `consumos_projetos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessoes` ADD CONSTRAINT `sessoes_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recuperacoes_senha` ADD CONSTRAINT `recuperacoes_senha_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `categorias_despesas` RENAME INDEX `categoria_despesa_nome_key` TO `categorias_despesas_nome_key`;

-- RenameIndex
ALTER TABLE `compras` RENAME INDEX `compras_status_idx` TO `compras_situacao_idx`;

-- RenameIndex
ALTER TABLE `consumos_projetos` RENAME INDEX `projeto_consumos_produto_id_idx` TO `consumos_projetos_produto_id_idx`;

-- RenameIndex
ALTER TABLE `consumos_projetos` RENAME INDEX `projeto_consumos_projeto_id_idx` TO `consumos_projetos_projeto_id_idx`;

-- RenameIndex
ALTER TABLE `despesas` RENAME INDEX `despesas_status_idx` TO `despesas_situacao_idx`;

-- RenameIndex
ALTER TABLE `historicos_projetos` RENAME INDEX `projeto_historico_projeto_id_idx` TO `historicos_projetos_projeto_id_idx`;

-- RenameIndex
ALTER TABLE `itens_compras` RENAME INDEX `compra_itens_compra_id_idx` TO `itens_compras_compra_id_idx`;

-- RenameIndex
ALTER TABLE `itens_compras` RENAME INDEX `compra_itens_produto_id_idx` TO `itens_compras_produto_id_idx`;

-- RenameIndex
ALTER TABLE `itens_verificacao_projetos` RENAME INDEX `projeto_checklist_itens_projeto_id_idx` TO `itens_verificacao_projetos_projeto_id_idx`;

-- RenameIndex
ALTER TABLE `projetos` RENAME INDEX `projetos_status_idx` TO `projetos_situacao_idx`;

-- RenameIndex
ALTER TABLE `receitas` RENAME INDEX `receitas_status_idx` TO `receitas_situacao_idx`;

-- RenameIndex
ALTER TABLE `tokens_renovacao` RENAME INDEX `refresh_tokens_usuario_id_idx` TO `tokens_renovacao_usuario_id_idx`;
