import express from 'express';
import "dotenv/config";
import { stat } from 'fs';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import cors from 'cors'
import { register } from 'module';
import { registerRoutes } from './routes';
import { error } from 'console';
import { errorHandler } from './middleware/error-handler-middleware';
import { inngest} from './inngest/client';
import {serve} from 'inngest/express'
import { functions } from './inngest/index.js';




const app = express();
const PORT = process.env.PORT;
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3001";


app.use(
    cors({
        origin: clientUrl,
        credentials :true,

    })
);

app.all('/api/auth/{*any}', toNodeHandler(auth));
// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());

app.use("/api/inngest", serve({ client: inngest, functions}));




app.get("/", (_req, res) => {
    res.json({
        name: "notebook-api",
        status: "ok",
        health: "/health",
        auth: "/api/auth/*",
        inngest: "/api/inngest",
        routes: {
            workspaces: {
                list: "GET /api/workspaces",
                create: "POST /api/workspaces",
                get: "GET /api/workspaces/:workspaceId",
                update: "PATCH /api/workspaces/:workspaceId",
                delete: "DELETE /api/workspaces/:workspaceId",
            },
            sources: {
                list: "GET /api/workspaces/:workspaceId/sources",
                create: "POST /api/workspaces/:workspaceId/sources",
                uploadPdf: "POST /api/workspaces/:workspaceId/sources/upload",
                importWebsite: "POST /api/workspaces/:workspaceId/sources/import/website",
                importYoutube: "POST /api/workspaces/:workspaceId/sources/import/youtube",
                bulkDelete: "POST /api/workspaces/:workspaceId/sources/bulk-delete",
                get: "GET /api/workspaces/:workspaceId/sources/:sourceId",
                delete: "DELETE /api/workspaces/:workspaceId/sources/:sourceId",
            },
            conversations: {
                list: "GET /api/workspaces/:workspaceId/conversations",
                create: "POST /api/workspaces/:workspaceId/conversations",
                messages: "GET /api/workspaces/:workspaceId/conversations/:conversationId/messages",
                delete: "DELETE /api/workspaces/:workspaceId/conversations/:conversationId",
                chat: "POST /api/workspaces/:workspaceId/chat",
            },
            artifacts: {
                list: "GET /api/workspaces/:workspaceId/artifacts",
                create: "POST /api/workspaces/:workspaceId/artifacts",
                get: "GET /api/workspaces/:workspaceId/artifacts/:artifactId",
                delete: "DELETE /api/workspaces/:workspaceId/artifacts/:artifactId",
            },
            memory: {
                list: "GET /api/memory",
                create: "POST /api/memory",
                update: "PATCH /api/memory/:memoryId",
                delete: "DELETE /api/memory/:memoryId",
            },
        },
    });
});

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

registerRoutes(app);

app.use(errorHandler);










app.listen(PORT, () => {
    console.log("Server is running on port 8081");
});