-- Execute como DBA no ambiente autorizado. Ajuste o usuário e o database reais.
-- A mesma conta atende à aplicação e às migrations manuais.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON atlas_estoque.* TO 'atlas_app'@'%';
