BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [emailVerified] DATETIME2,
    [image] NVARCHAR(1000),
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [users_role_df] DEFAULT 'USER',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[accounts] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [providerAccountId] NVARCHAR(1000) NOT NULL,
    [refresh_token] NVARCHAR(1000),
    [access_token] NVARCHAR(1000),
    [expires_at] INT,
    [token_type] NVARCHAR(1000),
    [scope] NVARCHAR(1000),
    [id_token] NVARCHAR(1000),
    [session_state] NVARCHAR(1000),
    CONSTRAINT [accounts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [accounts_provider_providerAccountId_key] UNIQUE NONCLUSTERED ([provider],[providerAccountId])
);

-- CreateTable
CREATE TABLE [dbo].[sessions] (
    [id] NVARCHAR(1000) NOT NULL,
    [sessionToken] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL,
    CONSTRAINT [sessions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [sessions_sessionToken_key] UNIQUE NONCLUSTERED ([sessionToken])
);

-- CreateTable
CREATE TABLE [dbo].[verification_tokens] (
    [identifier] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [expires] DATETIME2 NOT NULL,
    CONSTRAINT [verification_tokens_token_key] UNIQUE NONCLUSTERED ([token]),
    CONSTRAINT [verification_tokens_identifier_token_key] UNIQUE NONCLUSTERED ([identifier],[token])
);

-- CreateTable
CREATE TABLE [dbo].[levels] (
    [id] INT NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [order] INT NOT NULL,
    CONSTRAINT [levels_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [levels_code_key] UNIQUE NONCLUSTERED ([code]),
    CONSTRAINT [levels_order_key] UNIQUE NONCLUSTERED ([order])
);

-- CreateTable
CREATE TABLE [dbo].[words] (
    [id] NVARCHAR(1000) NOT NULL,
    [english] NVARCHAR(1000) NOT NULL,
    [portuguese] NVARCHAR(1000) NOT NULL,
    [partOfSpeech] NVARCHAR(1000),
    [exampleEn] NVARCHAR(1000),
    [examplePt] NVARCHAR(1000),
    [levelId] INT NOT NULL,
    CONSTRAINT [words_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [words_english_key] UNIQUE NONCLUSTERED ([english])
);

-- CreateTable
CREATE TABLE [dbo].[lessons] (
    [id] NVARCHAR(1000) NOT NULL,
    [levelId] INT NOT NULL,
    [orderInLevel] INT NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [lessons_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [lessons_levelId_orderInLevel_key] UNIQUE NONCLUSTERED ([levelId],[orderInLevel])
);

-- CreateTable
CREATE TABLE [dbo].[lesson_words] (
    [lessonId] NVARCHAR(1000) NOT NULL,
    [wordId] NVARCHAR(1000) NOT NULL,
    [position] INT NOT NULL,
    CONSTRAINT [lesson_words_pkey] PRIMARY KEY CLUSTERED ([lessonId],[wordId])
);

-- CreateTable
CREATE TABLE [dbo].[user_progress] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [wordId] NVARCHAR(1000) NOT NULL,
    [masteryLevel] INT NOT NULL CONSTRAINT [user_progress_masteryLevel_df] DEFAULT 0,
    [correctCount] INT NOT NULL CONSTRAINT [user_progress_correctCount_df] DEFAULT 0,
    [wrongCount] INT NOT NULL CONSTRAINT [user_progress_wrongCount_df] DEFAULT 0,
    [lastSeenAt] DATETIME2 NOT NULL CONSTRAINT [user_progress_lastSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
    [nextReviewAt] DATETIME2 NOT NULL CONSTRAINT [user_progress_nextReviewAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [user_progress_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [user_progress_userId_wordId_key] UNIQUE NONCLUSTERED ([userId],[wordId])
);

-- CreateTable
CREATE TABLE [dbo].[quiz_attempts] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [wordId] NVARCHAR(1000) NOT NULL,
    [mode] NVARCHAR(1000) NOT NULL,
    [answer] NVARCHAR(1000) NOT NULL,
    [isCorrect] BIT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [quiz_attempts_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [quiz_attempts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[sentence_cache] (
    [id] NVARCHAR(1000) NOT NULL,
    [lessonId] NVARCHAR(1000) NOT NULL,
    [sentenceEn] NVARCHAR(1000),
    [sentencePt] NVARCHAR(1000),
    [expectedPt] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [sentence_cache_status_df] DEFAULT 'PENDING',
    [error] NVARCHAR(1000),
    [model] NVARCHAR(1000),
    [tokensUsed] INT,
    [generatedById] NVARCHAR(1000),
    [generatedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [sentence_cache_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [sentence_cache_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [sentence_cache_lessonId_key] UNIQUE NONCLUSTERED ([lessonId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [words_levelId_idx] ON [dbo].[words]([levelId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [user_progress_userId_nextReviewAt_idx] ON [dbo].[user_progress]([userId], [nextReviewAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quiz_attempts_userId_createdAt_idx] ON [dbo].[quiz_attempts]([userId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [sentence_cache_status_idx] ON [dbo].[sentence_cache]([status]);

-- AddForeignKey
ALTER TABLE [dbo].[accounts] ADD CONSTRAINT [accounts_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[sessions] ADD CONSTRAINT [sessions_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[words] ADD CONSTRAINT [words_levelId_fkey] FOREIGN KEY ([levelId]) REFERENCES [dbo].[levels]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[lessons] ADD CONSTRAINT [lessons_levelId_fkey] FOREIGN KEY ([levelId]) REFERENCES [dbo].[levels]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[lesson_words] ADD CONSTRAINT [lesson_words_lessonId_fkey] FOREIGN KEY ([lessonId]) REFERENCES [dbo].[lessons]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[lesson_words] ADD CONSTRAINT [lesson_words_wordId_fkey] FOREIGN KEY ([wordId]) REFERENCES [dbo].[words]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_progress] ADD CONSTRAINT [user_progress_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[user_progress] ADD CONSTRAINT [user_progress_wordId_fkey] FOREIGN KEY ([wordId]) REFERENCES [dbo].[words]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[quiz_attempts] ADD CONSTRAINT [quiz_attempts_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[quiz_attempts] ADD CONSTRAINT [quiz_attempts_wordId_fkey] FOREIGN KEY ([wordId]) REFERENCES [dbo].[words]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[sentence_cache] ADD CONSTRAINT [sentence_cache_lessonId_fkey] FOREIGN KEY ([lessonId]) REFERENCES [dbo].[lessons]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[sentence_cache] ADD CONSTRAINT [sentence_cache_generatedById_fkey] FOREIGN KEY ([generatedById]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
