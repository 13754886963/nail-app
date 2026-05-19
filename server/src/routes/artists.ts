import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  listArtistsHandler,
  getMyProfile,
  getMyReceivedComments,
  getProfile,
  getStyles,
  followArtist,
  updateArtistProfile,
  updateArtistValidation,
} from '../controllers/artistController';
import { listArtistReviews } from '../controllers/reviewController';

const router = Router();

router.get('/',                        authenticate, listArtistsHandler);
router.get('/me',                      authenticate, getMyProfile);
router.get('/me/received-comments',    authenticate, getMyReceivedComments);
router.patch('/me',                    authenticate, updateArtistValidation, updateArtistProfile);
router.get('/:id',                     authenticate, getProfile);
router.get('/:id/styles',              authenticate, getStyles);
router.post('/:id/follow',             authenticate, followArtist);
router.get('/:id/reviews',             authenticate, listArtistReviews);

export default router;
