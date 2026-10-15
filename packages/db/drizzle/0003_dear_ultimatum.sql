DROP INDEX "chat_thread_user_last_idx";--> statement-breakpoint
CREATE INDEX "chat_thread_user_updated_idx" ON "chat_thread" USING btree ("user_id","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);