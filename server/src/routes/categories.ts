import { Router } from 'express';
import { getCategories } from '../controllers/nailStyleController';
import { AuthRequest } from '../middlewares/auth';
import { Response } from 'express';

const router = Router();

router.get('/', (req, res) => getCategories(req as AuthRequest, res as Response));

export default router;
