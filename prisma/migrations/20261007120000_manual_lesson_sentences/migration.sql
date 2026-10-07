-- Frases de consolidação passam a ser conteúdo editorial cadastrado pelo admin.
-- Remove a dependência da API de IA (DeepSeek) do banco de dados.

BEGIN TRY

BEGIN TRAN;

-- 1. Nova tabela com as frases escritas manualmente.
--    O seed só insere aqui se a lição ainda não tiver frase, preservando
--    edições feitas pelo admin no painel.
CREATE TABLE [dbo].[manual_lesson_sentences] (
    [lessonId] NVARCHAR(1000) NOT NULL,
    [sentenceEn] NVARCHAR(1000) NOT NULL,
    [sentencePt] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [manual_lesson_sentences_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [manual_lesson_sentences_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [manual_lesson_sentences_pkey] PRIMARY KEY CLUSTERED ([lessonId]),
    CONSTRAINT [manual_lesson_sentences_lessonId_fkey] FOREIGN KEY ([lessonId]) REFERENCES [dbo].[lessons]([id]) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. Remove do cache as colunas exclusivas da geração por IA.
ALTER TABLE [dbo].[sentence_cache] DROP CONSTRAINT [sentence_cache_generatedById_fkey];
ALTER TABLE [dbo].[sentence_cache] DROP COLUMN [generatedById];
ALTER TABLE [dbo].[sentence_cache] DROP COLUMN [model];
ALTER TABLE [dbo].[sentence_cache] DROP COLUMN [tokensUsed];
ALTER TABLE [dbo].[sentence_cache] DROP COLUMN [generatedAt];
ALTER TABLE [dbo].[sentence_cache] DROP COLUMN [error];

-- 3. Frases que estavam em processamento não existem mais: voltam para a fila.
UPDATE [dbo].[sentence_cache] SET [status] = 'PENDING' WHERE [status] IN ('GENERATING', 'FAILED');

-- 4. Coluna de auditoria do painel.
ALTER TABLE [dbo].[sentence_cache] ADD [updatedAt] DATETIME2 NOT NULL CONSTRAINT [sentence_cache_updatedAt_df] DEFAULT CURRENT_TIMESTAMP;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
