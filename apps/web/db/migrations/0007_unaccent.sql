-- A busca e o índice do acervo (/api/directory) comparam ignorando acentos.
-- Extensão nativa do Postgres, disponível no Neon; estava instalada só no
-- branch dev (na mão), o que derrubava a rota com 500 em produção.
CREATE EXTENSION IF NOT EXISTS unaccent;
