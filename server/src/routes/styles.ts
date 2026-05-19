import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { upload } from '../config/upload';
import {
  createStyle,
  getMyStyles,
  getStyles,
  searchStyles,
  deleteStyle,
  updateStyle,
  createStyleValidation,
  updateStyleValidation,
} from '../controllers/nailStyleController';
import {
  getDetail,
  like,
  favorite,
  listComments,
  postComment,
  commentValidation,
} from '../controllers/interactionController';

const router = Router();

router.get('/my',               authenticate, getMyStyles);
router.get('/search',           authenticate, searchStyles);
router.get('/',                 authenticate, getStyles);
router.post('/',                authenticate, upload.single('image'), createStyleValidation, createStyle);
router.get('/:id',              authenticate, getDetail);
router.patch('/:id',            authenticate, updateStyleValidation, updateStyle);
router.delete('/:id',           authenticate, deleteStyle);
router.post('/:id/like',        authenticate, like);
router.post('/:id/favorite',    authenticate, favorite);
router.get('/:id/comments',     authenticate, listComments);
router.post('/:id/comments',    authenticate, commentValidation, postComment);

export default router;
