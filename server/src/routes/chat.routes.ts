import { Router } from "express";
import {
    createConversation,
    deleteConversation,
    getConversationMessages,
    listConversations,
    streamChat,
} from "../controllers/chat.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const conversationRoutes = Router({ mergeParams: true });

conversationRoutes.get("/", asyncHandler(listConversations));
conversationRoutes.post("/", asyncHandler(createConversation));
conversationRoutes.get(
    "/:conversationId/messages",
    asyncHandler(getConversationMessages),
);
conversationRoutes.delete("/:conversationId", asyncHandler(deleteConversation));

export const chatRoutes = Router({ mergeParams: true });

chatRoutes.post("/", asyncHandler(streamChat));
