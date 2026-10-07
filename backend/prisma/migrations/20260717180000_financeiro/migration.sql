-- AlterTable
ALTER TABLE `despesas` MODIFY `compra_id` INTEGER NULL,
    ADD COLUMN `categoria_despesa_id` INTEGER NULL,
    ADD COLUMN `projeto_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `categoria_despesa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(120) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categoria_despesa_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receitas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `descricao` VARCHAR(200) NOT NULL,
    `valor` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('A_RECEBER', 'RECEBIDO') NOT NULL DEFAULT 'A_RECEBER',
    `data_vencimento` DATETIME(3) NULL,
    `data_recebimento` DATETIME(3) NULL,
    `cliente_id` INTEGER NULL,
    `projeto_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `receitas_status_idx`(`status`),
    INDEX `receitas_cliente_id_idx`(`cliente_id`),
    INDEX `receitas_projeto_id_idx`(`projeto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `config_sistema` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `financeiro_senha_hash` VARCHAR(255) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `despesas_categoria_despesa_id_idx` ON `despesas`(`categoria_despesa_id`);
CREATE INDEX `despesas_projeto_id_idx` ON `despesas`(`projeto_id`);

-- AddForeignKey
ALTER TABLE `despesas` ADD CONSTRAINT `despesas_categoria_despesa_id_fkey` FOREIGN KEY (`categoria_despesa_id`) REFERENCES `categoria_despesa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `despesas` ADD CONSTRAINT `despesas_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receitas` ADD CONSTRAINT `receitas_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receitas` ADD CONSTRAINT `receitas_projeto_id_fkey` FOREIGN KEY (`projeto_id`) REFERENCES `projetos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
