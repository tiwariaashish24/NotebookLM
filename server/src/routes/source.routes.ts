import {Router} from 'express';
import { asyncHandler } from '../utils/async-handler';
import { create } from 'domain';
import { bulkDeleteSources, createSource, deleteSource, getSource, listSources } from '../controllers/source.controller';

export  const sourceRoutes = Router({mergeParams: true});

sourceRoutes.get("/", asyncHandler(listSources));
sourceRoutes.post("/", asyncHandler(createSource));
sourceRoutes.post("/bulk-delete", asyncHandler(bulkDeleteSources));
sourceRoutes.get("/:sourceId", asyncHandler(getSource));
sourceRoutes.delete("/:sourceId", asyncHandler(deleteSource));

