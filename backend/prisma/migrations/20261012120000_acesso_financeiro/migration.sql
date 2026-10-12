-- Permissão financeira nominal: substitui a senha financeira compartilhada.
-- Aditiva e sem perda de dados: todos começam sem acesso (o administrador
-- tem acesso pelo cargo e concede a gerentes específicos).
ALTER TABLE `usuarios` ADD COLUMN `acesso_financeiro` BOOLEAN NOT NULL DEFAULT false;
